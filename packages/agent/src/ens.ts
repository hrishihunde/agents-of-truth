/**
 * @fileoverview ENS Resolution & Policy Parsing
 * 
 * This module handles:
 * 1. Resolving ENS names to addresses
 * 2. Reading ENS text records for policy data
 * 3. Parsing and validating policy values
 * 4. Computing policy hashes for zk proofs
 * 
 * All policy values are fetched dynamically at runtime from ENS.
 * No hardcoded policy values are used.
 */

import { createPublicClient, http } from 'viem';
import { normalize } from 'viem/ens';
import { mainnet } from 'viem/chains';
import type { ENSPolicy, ENSTextRecords } from './types.js';

// ================================
// Configuration
// ================================

const RPC_URL = process.env.ETH_RPC_URL || 'https://eth.llamarpc.com';

/**
 * Public client for ENS resolution
 * Uses mainnet as ENS is deployed there
 */
const publicClient = createPublicClient({
    chain: mainnet,
    transport: http(RPC_URL),
});

/**
 * Cache for resolved policies to avoid excessive RPC calls
 * Key: normalized ENS name
 * Value: { policy, expiresAt }
 */
const policyCache = new Map<string, { policy: ENSPolicy; expiresAt: number }>();

/** Cache duration in milliseconds (5 minutes) */
const CACHE_DURATION_MS = 5 * 60 * 1000;

// ================================
// ENS Text Record Keys
// ================================

/**
 * ENS text record keys that define agent policy
 * These are the official keys that MUST be used
 */
export const ENS_POLICY_KEYS = [
    'agent.maxSpendUSDC',
    'agent.allowedActions',
    'agent.policyVersion',
] as const;

// ================================
// Core Functions
// ================================

/**
 * Resolve an ENS name and fetch its policy text records
 * 
 * @param ensName - ENS name to resolve (e.g., "payments-agent.eth")
 * @returns Parsed policy from ENS text records
 * @throws Error if ENS name cannot be resolved or policy is invalid
 * 
 * @example
 * ```typescript
 * const policy = await resolveENSPolicy("payments-agent.eth");
 * console.log(`Max spend: ${policy.maxSpendUSDC} USDC`);
 * console.log(`Allowed actions: ${policy.allowedActions.join(', ')}`);
 * ```
 */
export async function resolveENSPolicy(ensName: string): Promise<ENSPolicy> {
    // Normalize ENS name (handles unicode, etc.)
    const normalizedName = normalize(ensName);

    // Check cache first
    const cached = policyCache.get(normalizedName);
    if (cached && cached.expiresAt > Date.now()) {
        console.log(`[ENS] Using cached policy for ${normalizedName}`);
        return cached.policy;
    }

    console.log(`[ENS] Resolving policy for ${normalizedName}...`);

    // Fetch all policy text records in parallel
    const textRecords = await fetchENSTextRecords(normalizedName, ENS_POLICY_KEYS);

    // Parse and validate the policy
    const policy = parsePolicy(normalizedName, textRecords);

    // Cache the policy
    policyCache.set(normalizedName, {
        policy,
        expiresAt: Date.now() + CACHE_DURATION_MS,
    });

    console.log(`[ENS] Policy resolved for ${normalizedName}:`, {
        maxSpendUSDC: policy.maxSpendUSDC,
        allowedActions: policy.allowedActions,
        policyVersion: policy.policyVersion,
    });

    return policy;
}

/**
 * Fetch ENS text records for specified keys
 * 
 * @param ensName - Normalized ENS name
 * @param keys - Array of text record keys to fetch
 * @returns Object mapping keys to values
 */
async function fetchENSTextRecords(
    ensName: string,
    keys: readonly string[]
): Promise<ENSTextRecords> {
    const records: ENSTextRecords = {};

    // Fetch all records in parallel for efficiency
    const results = await Promise.allSettled(
        keys.map(async (key) => {
            const value = await publicClient.getEnsText({
                name: ensName,
                key,
            });
            return { key, value };
        })
    );

    // Process results
    for (const result of results) {
        if (result.status === 'fulfilled' && result.value.value) {
            records[result.value.key] = result.value.value;
        }
    }

    return records;
}

/**
 * Parse raw ENS text records into a validated Policy object
 * 
 * @param ensName - ENS name for reference
 * @param records - Raw text records from ENS
 * @returns Parsed and validated policy
 * @throws Error if required fields are missing or invalid
 */
function parsePolicy(ensName: string, records: ENSTextRecords): ENSPolicy {
    // Parse maxSpendUSDC (required)
    const maxSpendRaw = records['agent.maxSpendUSDC'];
    if (!maxSpendRaw) {
        throw new PolicyError(
            `Missing required text record: agent.maxSpendUSDC`,
            'MISSING_MAX_SPEND'
        );
    }

    const maxSpendUSDC = parseFloat(maxSpendRaw);
    if (isNaN(maxSpendUSDC) || maxSpendUSDC < 0) {
        throw new PolicyError(
            `Invalid maxSpendUSDC value: ${maxSpendRaw}`,
            'INVALID_MAX_SPEND'
        );
    }

    // Parse allowedActions (required, comma-separated)
    const allowedActionsRaw = records['agent.allowedActions'];
    if (!allowedActionsRaw) {
        throw new PolicyError(
            `Missing required text record: agent.allowedActions`,
            'MISSING_ALLOWED_ACTIONS'
        );
    }

    const allowedActions = allowedActionsRaw
        .split(',')
        .map((action) => action.trim().toLowerCase())
        .filter((action) => action.length > 0);

    if (allowedActions.length === 0) {
        throw new PolicyError(
            `No valid actions in allowedActions: ${allowedActionsRaw}`,
            'EMPTY_ALLOWED_ACTIONS'
        );
    }

    // Parse policyVersion (optional, defaults to "1.0")
    const policyVersion = records['agent.policyVersion'] || '1.0';

    // Compute policy hash for zk proofs
    const policyHash = computePolicyHash({
        maxSpendUSDC,
        allowedActions,
        policyVersion,
    });

    return {
        ensName,
        maxSpendUSDC,
        allowedActions,
        policyVersion,
        fetchedAt: Date.now(),
        policyHash,
    };
}

/**
 * Compute a deterministic hash of the policy for zk proofs
 * This uses a simple hash that can be reconstructed in Circom
 * 
 * For production, this should use Poseidon hash
 */
function computePolicyHash(policy: {
    maxSpendUSDC: number;
    allowedActions: string[];
    policyVersion: string;
}): string {
    // Create a deterministic string representation
    const policyString = JSON.stringify({
        maxSpendUSDC: policy.maxSpendUSDC,
        allowedActions: policy.allowedActions.sort(),
        policyVersion: policy.policyVersion,
    });

    // Simple hash for now - in production use Poseidon
    // This creates a numeric hash that can be used in circuits
    let hash = 0;
    for (let i = 0; i < policyString.length; i++) {
        const char = policyString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    // Convert to positive BigInt string for Circom compatibility
    const hashBigInt = BigInt(Math.abs(hash));
    return hashBigInt.toString();
}

/**
 * Clear the policy cache (useful for testing or forcing refresh)
 */
export function clearPolicyCache(): void {
    policyCache.clear();
    console.log('[ENS] Policy cache cleared');
}

/**
 * Validate that an action is allowed by the policy
 * 
 * @param policy - ENS policy to check against
 * @param actionType - Action type to validate
 * @returns true if action is allowed
 */
export function isActionAllowed(policy: ENSPolicy, actionType: string): boolean {
    return policy.allowedActions.includes(actionType.toLowerCase());
}

/**
 * Validate that an amount is within policy limits
 * 
 * @param policy - ENS policy to check against
 * @param amount - Amount in USDC to validate
 * @returns true if amount is within limits
 */
export function isAmountWithinLimit(policy: ENSPolicy, amount: number): boolean {
    return amount >= 0 && amount <= policy.maxSpendUSDC;
}

// ================================
// Error Handling
// ================================

/**
 * Custom error for policy-related issues
 */
export class PolicyError extends Error {
    constructor(
        message: string,
        public readonly code: string
    ) {
        super(message);
        this.name = 'PolicyError';
    }
}

// ================================
// Testing Utilities
// ================================

/**
 * Create a mock policy for testing (when ENS is not available)
 * This should ONLY be used in development/testing
 */
export function createMockPolicy(ensName: string): ENSPolicy {
    console.warn(`[ENS] Using MOCK policy for ${ensName} - NOT FOR PRODUCTION`);

    return {
        ensName,
        maxSpendUSDC: 100,
        allowedActions: ['payment', 'transfer'],
        policyVersion: '1.0-mock',
        fetchedAt: Date.now(),
        policyHash: '12345678',
    };
}
