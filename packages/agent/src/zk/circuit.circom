/*
 * PolicyCompliance.circom
 * 
 * This circuit proves that a payment action complies with an ENS-derived policy:
 * 
 * 1. The payment amount is <= the policy's maximum spend limit
 * 2. A commitment is correctly computed as Poseidon(amount, policyHash)
 * 
 * Public Inputs:
 *   - maxSpend: The maximum allowed spend from ENS policy
 *   - policyHash: Hash of the complete ENS policy
 *   - commitment: The commitment being verified
 * 
 * Private Inputs:
 *   - amount: The actual payment amount (kept private)
 * 
 * The proof attests that the prover knows an `amount` such that:
 *   1. amount <= maxSpend
 *   2. commitment == Poseidon(amount, policyHash)
 */

pragma circom 2.1.0;

include "node_modules/circomlib/circuits/poseidon.circom";
include "node_modules/circomlib/circuits/comparators.circom";
include "node_modules/circomlib/circuits/bitify.circom";

/**
 * Main circuit template for policy compliance
 * 
 * @param n - Number of bits for amount values (default 64 for USDC with 6 decimals)
 */
template PolicyCompliance(n) {
    // ================================
    // Signals
    // ================================
    
    // Private inputs
    signal input amount;           // The actual payment amount (private)
    
    // Public inputs
    signal input maxSpend;         // Maximum allowed by policy
    signal input policyHash;       // Hash of the ENS policy
    
    // Public output
    signal output commitment;      // Poseidon(amount, policyHash)
    signal output isValid;         // 1 if amount <= maxSpend, 0 otherwise

    // ================================
    // Constraint 1: Amount <= MaxSpend
    // ================================
    
    // Use LessEqThan comparator from circomlib
    // This proves amount <= maxSpend without revealing amount
    component leq = LessEqThan(n);
    leq.in[0] <== amount;
    leq.in[1] <== maxSpend;
    
    // isValid must be 1 (proving amount <= maxSpend)
    isValid <== leq.out;
    
    // Enforce that the proof is only valid if amount <= maxSpend
    isValid === 1;
    
    // ================================
    // Constraint 2: Commitment Computation
    // ================================
    
    // Compute commitment = Poseidon(amount, policyHash)
    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== amount;
    poseidon.inputs[1] <== policyHash;
    
    // Output the commitment
    commitment <== poseidon.out;
    
    // ================================
    // Range Checks (prevent overflow)
    // ================================
    
    // Ensure amount fits in n bits
    component amountBits = Num2Bits(n);
    amountBits.in <== amount;
    
    // Ensure maxSpend fits in n bits
    component maxSpendBits = Num2Bits(n);
    maxSpendBits.in <== maxSpend;
}

// Instantiate with 64-bit precision
// This supports up to 18,446,744,073,709,551,615 units
// For USDC with 6 decimals, this is ~18 trillion USDC
component main { public [ maxSpend, policyHash ] } = PolicyCompliance(64);

/*
 * CIRCUIT EXPLANATION FOR REVIEWERS:
 * 
 * This circuit enables zero-knowledge proof of payment policy compliance.
 * 
 * WHY ZK PROOFS?
 * - The agent can prove it respects ENS policy limits without revealing
 *   the exact amount of each transaction
 * - Third parties can verify compliance without seeing sensitive data
 * - Creates a cryptographic audit trail
 * 
 * HOW IT WORKS:
 * 1. Agent reads maxSpend from ENS (public)
 * 2. Agent computes policyHash from ENS data (public)
 * 3. Agent wants to spend `amount` USDC (private)
 * 4. Agent generates proof that:
 *    - amount <= maxSpend (verified without revealing amount)
 *    - commitment = Poseidon(amount, policyHash)
 * 5. Anyone can verify the proof with public inputs only
 * 
 * SECURITY CONSIDERATIONS:
 * - Uses Poseidon hash (ZK-friendly, secure)
 * - LessEqThan comparator prevents amount > maxSpend
 * - Range checks prevent integer overflow attacks
 * - 64-bit precision is sufficient for all real USDC amounts
 * 
 * COMPILATION:
 * circom circuit.circom --r1cs --wasm --sym -o build/
 * 
 * TRUSTED SETUP:
 * snarkjs groth16 setup circuit.r1cs pot12_final.ptau circuit_0000.zkey
 * snarkjs zkey contribute circuit_0000.zkey circuit_final.zkey
 * snarkjs zkey export verificationkey circuit_final.zkey verification_key.json
 */
