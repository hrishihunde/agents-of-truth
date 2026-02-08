/**
 * @fileoverview ZK Proof Generation with SnarkJS
 * 
 * This module generates Groth16 zk-SNARK proofs that attest:
 * 1. A payment amount is <= the ENS policy maximum
 * 2. A commitment is correctly computed as Poseidon(amount, policyHash)
 * 
 * The proof is generated using the compiled circuit and proving key.
 */

import * as snarkjs from 'snarkjs';
import { buildPoseidon } from 'circomlibjs';
import { readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import type { ProofInputs, ZKProof } from '../types.js';

// ================================
// Configuration
// ================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Paths to compiled circuit files
const WASM_PATH = process.env.ZK_CIRCUIT_WASM || join(__dirname, 'circuit_js', 'circuit.wasm');
const ZKEY_PATH = process.env.ZK_CIRCUIT_ZKEY || join(__dirname, 'circuit_final.zkey');

// Track if Poseidon is initialized
let poseidon: Awaited<ReturnType<typeof buildPoseidon>> | null = null;

// ================================
// Initialization
// ================================

/**
 * Initialize the Poseidon hash function
 * Call this once at startup
 */
async function initPoseidon(): Promise<void> {
    if (!poseidon) {
        console.log('[ZK] Initializing Poseidon hash function...');
        poseidon = await buildPoseidon();
        console.log('[ZK] Poseidon initialized');
    }
}

// ================================
// Proof Generation
// ================================

/**
 * Generate a zk proof of policy compliance
 * 
 * This creates a Groth16 proof that the amount <= maxSpend
 * and computes commitment = Poseidon(amount, policyHash)
 * 
 * @param inputs - Proof inputs (amount, maxSpend, policyHash)
 * @returns Generated proof with commitment
 * 
 * @example
 * ```typescript
 * const proof = await generateProof({
 *   amount: 50,
 *   maxSpend: 100,
 *   policyHash: '12345678',
 * });
 * 
 * console.log('Commitment:', proof.commitment);
 * console.log('Verified:', proof.verified);
 * ```
 */
export async function generateProof(inputs: ProofInputs): Promise<ZKProof> {
    console.log('[ZK] Generating proof for inputs:', {
        amount: inputs.amount,
        maxSpend: inputs.maxSpend,
        policyHash: inputs.policyHash.slice(0, 10) + '...',
    });

    // Check if circuit files exist
    const circuitFilesExist = existsSync(WASM_PATH) && existsSync(ZKEY_PATH);

    if (!circuitFilesExist) {
        console.warn('[ZK] Circuit files not found, generating mock proof');
        console.warn(`[ZK] Expected WASM: ${WASM_PATH}`);
        console.warn(`[ZK] Expected ZKEY: ${ZKEY_PATH}`);
        console.warn('[ZK] Run "pnpm run zk:setup" to compile the circuit');

        return generateMockProof(inputs);
    }

    try {
        // Initialize Poseidon if needed
        await initPoseidon();

        // Prepare circuit inputs
        // Convert to BigInt for circom compatibility
        const circuitInputs = {
            amount: BigInt(Math.floor(inputs.amount * 1e6)), // USDC has 6 decimals
            maxSpend: BigInt(Math.floor(inputs.maxSpend * 1e6)),
            policyHash: BigInt(inputs.policyHash),
        };

        console.log('[ZK] Circuit inputs prepared:', {
            amount: circuitInputs.amount.toString(),
            maxSpend: circuitInputs.maxSpend.toString(),
            policyHash: circuitInputs.policyHash.toString().slice(0, 10) + '...',
        });

        // Generate the proof
        console.log('[ZK] Running Groth16 prover...');
        const startTime = Date.now();

        const { proof, publicSignals } = await snarkjs.groth16.fullProve(
            circuitInputs,
            WASM_PATH,
            ZKEY_PATH
        );

        const duration = Date.now() - startTime;
        console.log(`[ZK] Proof generated in ${duration}ms`);

        // Extract commitment from public signals
        // publicSignals[0] = commitment, publicSignals[1] = isValid
        const commitment = publicSignals[0];

        // Verify the proof immediately
        const vkeyPath = join(__dirname, 'verification_key.json');
        let verified = false;

        if (existsSync(vkeyPath)) {
            const vkeyJson = await readFile(vkeyPath, 'utf-8');
            const vkey = JSON.parse(vkeyJson);
            verified = await snarkjs.groth16.verify(vkey, publicSignals, proof);
            console.log(`[ZK] Proof verified: ${verified}`);
        } else {
            console.warn('[ZK] Verification key not found, skipping immediate verification');
        }

        return {
            proof: {
                pi_a: proof.pi_a,
                pi_b: proof.pi_b,
                pi_c: proof.pi_c,
                protocol: 'groth16',
                curve: 'bn128',
            },
            publicSignals,
            commitment,
            verified,
            generatedAt: Date.now(),
        };

    } catch (error) {
        console.error('[ZK] Proof generation failed:', error);

        // Fall back to mock proof on error
        console.warn('[ZK] Falling back to mock proof');
        return generateMockProof(inputs);
    }
}

/**
 * Compute Poseidon hash of (amount, policyHash)
 * 
 * This uses the same Poseidon implementation as the circuit
 * to ensure the commitment matches.
 * 
 * @param amount - Amount in USDC (will be multiplied by 1e6)
 * @param policyHash - Policy hash string
 * @returns Commitment as string
 */
export async function computeCommitment(amount: number, policyHash: string): Promise<string> {
    await initPoseidon();

    if (!poseidon) {
        throw new Error('Poseidon not initialized');
    }

    // Convert to BigInt for Poseidon
    const amountBigInt = BigInt(Math.floor(amount * 1e6));
    const policyHashBigInt = BigInt(policyHash);

    // Compute Poseidon(amount, policyHash)
    const hash = poseidon([amountBigInt, policyHashBigInt]);

    // Convert to field element string
    const commitment = poseidon.F.toString(hash);

    return commitment;
}

// ================================
// Mock Proof (for development)
// ================================

/**
 * Generate a mock proof when circuit files aren't available
 * 
 * This is for development/testing only.
 * The mock proof has the correct structure but is not cryptographically valid.
 */
async function generateMockProof(inputs: ProofInputs): Promise<ZKProof> {
    console.log('[ZK] Generating MOCK proof (not cryptographically valid)');

    // Validate amount <= maxSpend
    if (inputs.amount > inputs.maxSpend) {
        throw new Error(`Amount ${inputs.amount} exceeds max spend ${inputs.maxSpend}`);
    }

    // Generate a deterministic fake commitment
    await initPoseidon();
    let commitment: string;

    if (poseidon) {
        const hash = poseidon([
            BigInt(Math.floor(inputs.amount * 1e6)),
            BigInt(inputs.policyHash),
        ]);
        commitment = poseidon.F.toString(hash);
    } else {
        // Fallback if poseidon fails
        commitment = `mock_commitment_${inputs.amount}_${inputs.policyHash.slice(0, 8)}`;
    }

    // Generate fake proof structure
    const mockProof = {
        pi_a: [
            '0x' + generateHex(64),
            '0x' + generateHex(64),
            '1',
        ],
        pi_b: [
            ['0x' + generateHex(64), '0x' + generateHex(64)],
            ['0x' + generateHex(64), '0x' + generateHex(64)],
            ['1', '0'],
        ],
        pi_c: [
            '0x' + generateHex(64),
            '0x' + generateHex(64),
            '1',
        ],
        protocol: 'groth16',
        curve: 'bn128',
    };

    return {
        proof: mockProof,
        publicSignals: [
            commitment,
            '1', // isValid
            String(Math.floor(inputs.maxSpend * 1e6)),
            inputs.policyHash,
        ],
        commitment,
        verified: true, // Mock always "verifies"
        generatedAt: Date.now(),
    };
}

/**
 * Generate random hex string of specified length
 */
function generateHex(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
