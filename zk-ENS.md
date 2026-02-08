# zkENS: Zero-Knowledge ENS Policy System

This document explains how **Agents of Truth** combines **Circom zk-SNARKs** with **ENS** to create a privacy-preserving, policy-compliant payment agent system.

## Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                       zkENS Architecture                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐       │
│  │   ENS Name   │    │   Policy     │    │   ZK Proof   │       │
│  │  Resolution  │───▶│  Extraction  │───▶│  Generation  │       │
│  └──────────────┘    └──────────────┘    └──────────────┘       │
│         │                   │                   │                │
│         ▼                   ▼                   ▼                │
│  agent.maxSpendUSDC   Policy Hash      Poseidon(amt, hash)      │
│  agent.allowedActions                  amount ≤ maxSpend        │
│  agent.policyVersion                                            │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## How ENS is Used

### Text Records as Policy Store

ENS names are used as decentralized, censorship-resistant policy stores. Each agent has an ENS name (e.g., `payments-agent.eth`) with text records defining its operational constraints:

| Text Record Key        | Purpose                            | Example                 |
| ---------------------- | ---------------------------------- | ----------------------- |
| `agent.maxSpendUSDC`   | Maximum per-action spend limit     | `100`                   |
| `agent.allowedActions` | Comma-separated allowed operations | `payment,transfer,swap` |
| `agent.policyVersion`  | Policy schema version for upgrades | `1.0`                   |

### Resolution Flow

```typescript
// Using viem to resolve ENS text records
const client = createPublicClient({
    chain: mainnet,
    transport: http()
});

// Resolve policy at runtime (never hardcoded)
const maxSpend = await client.getEnsText({
    name: normalize('payments-agent.eth'),
    key: 'agent.maxSpendUSDC'
});
```

### Why ENS?

1. **Decentralized**: No central server controls policy
2. **Verifiable**: Anyone can verify current policy on-chain
3. **Updateable**: Policy owner can update via ENS Manager
4. **Human-readable**: Easy to audit and understand
5. **Censorship-resistant**: No single point of failure

## How Circom is Used

### Circuit Architecture

Our Circom circuit (`circuit.circom`) proves two things without revealing sensitive data:

1. **Compliance**: `amount ≤ maxSpend` (payment is within policy limits)
2. **Commitment**: `commitment = Poseidon(amount, policyHash)` (cryptographic binding)

```circom
pragma circom 2.0.0;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";

template PolicyCompliance(n) {
    // Private inputs (kept secret)
    signal input amount;          // Actual payment amount
    
    // Public inputs (revealed in proof)
    signal input maxSpend;        // From ENS: agent.maxSpendUSDC
    signal input policyHash;      // Hash of full policy
    
    // Public outputs
    signal output commitment;     // Poseidon(amount, policyHash)
    signal output isValid;        // 1 if amount ≤ maxSpend
    
    // Prove: amount ≤ maxSpend
    component leq = LessEqThan(n);
    leq.in[0] <== amount;
    leq.in[1] <== maxSpend;
    isValid <== leq.out;
    
    // Create commitment
    component poseidon = Poseidon(2);
    poseidon.inputs[0] <== amount;
    poseidon.inputs[1] <== policyHash;
    commitment <== poseidon.out;
}

component main {public [maxSpend, policyHash]} = PolicyCompliance(64);
```

### Proof Generation

We use **snarkjs** to generate Groth16 proofs:

```typescript
import * as snarkjs from 'snarkjs';

const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    {
        amount: BigInt(amount * 1e6),      // Private
        maxSpend: BigInt(maxSpend * 1e6),  // Public
        policyHash: BigInt(policyHash)     // Public
    },
    'circuit.wasm',
    'circuit_final.zkey'
);
```

### Verification

Proofs can be verified:
- **Off-chain**: Using snarkjs in Node.js/browser
- **On-chain**: Using generated Solidity verifier contract

```typescript
// Off-chain verification
const isValid = await snarkjs.groth16.verify(
    verificationKey,
    publicSignals,
    proof
);
```

## Combined Flow: zkENS

### 1. Agent Receives Payment Request

```json
{
    "ensName": "payments-agent.eth",
    "actionType": "payment",
    "amount": 50,
    "recipient": "0x..."
}
```

### 2. ENS Policy Resolution

```typescript
const policy = await resolveENSPolicy('payments-agent.eth');
// Returns:
// {
//     maxSpendUSDC: 100,
//     allowedActions: ['payment', 'transfer'],
//     policyHash: '0x1234...'
// }
```

### 3. Policy Validation

```typescript
// Check action is allowed
if (!policy.allowedActions.includes('payment')) {
    throw new Error('Action not allowed');
}

// Check amount is within limit
if (amount > policy.maxSpendUSDC) {
    throw new Error('Amount exceeds policy limit');
}
```

### 4. ZK Proof Generation

```typescript
const proof = await generateProof({
    amount: 50,              // Private: exact amount hidden
    maxSpend: 100,           // Public: policy limit
    policyHash: '0x1234...'  // Public: policy identifier
});
```

### 5. Result with Proof

```json
{
    "success": true,
    "executionId": "uuid",
    "proof": {
        "commitment": "12345...",
        "publicSignals": ["commitment", "1", "100000000", "0x1234..."],
        "verified": true
    }
}
```

## Privacy Properties

| Data                 | Visibility | Why                      |
| -------------------- | ---------- | ------------------------ |
| Exact payment amount | 🔒 Private  | Hidden in ZK proof       |
| Policy max spend     | 🌍 Public   | Already on ENS           |
| Payment is compliant | 🌍 Public   | Proof output             |
| Policy hash          | 🌍 Public   | Identifies which policy  |
| Commitment           | 🌍 Public   | Binding, auditable later |

## Setup Instructions

### 1. Compile the Circuit

```bash
cd packages/agent/src/zk
bash setup.sh
```

This generates:
- `circuit_js/circuit.wasm` - WASM for proof generation
- `circuit_final.zkey` - Proving key (from trusted setup)
- `verification_key.json` - For verifying proofs
- `verifier.sol` - Solidity verifier for on-chain verification

### 2. Configure ENS

Set these text records on your ENS name using the [ENS Manager](https://app.ens.domains):

1. Go to your ENS name
2. Click "Records" → "Text"
3. Add:
   - Key: `agent.maxSpendUSDC`, Value: `100`
   - Key: `agent.allowedActions`, Value: `payment,transfer`
   - Key: `agent.policyVersion`, Value: `1.0`

### 3. Run the Agent

```bash
cd packages/agent
pnpm dev
```

## Security Considerations

### Trusted Setup

The ZK circuit requires a trusted setup ceremony. Our `setup.sh` uses a development ceremony which is **NOT production-safe**. For production:

1. Use a multi-party computation (MPC) ceremony
2. Or use existing Powers of Tau files from community ceremonies
3. Consider using PLONK (universal setup) instead of Groth16

### ENS Security

- Ensure the ENS name is properly secured
- Use ENS's Name Wrapper for extra protection
- Consider using a multisig for policy updates

### Privacy Limitations

- The commitment links proofs to specific transactions
- Timing analysis could correlate actions
- Consider additional privacy layers for high-stakes use cases

## References

- [Circom Documentation](https://docs.circom.io/)
- [ENS Documentation](https://docs.ens.domains/)
- [snarkjs GitHub](https://github.com/iden3/snarkjs)
- [circomlib (circuit templates)](https://github.com/iden3/circomlib)
- [viem ENS Actions](https://viem.sh/docs/ens/actions/getEnsText)

## Project: Agents of Truth

GitHub: [hrishihunde/agents-of-truth](https://github.com/hrishihunde/agents-of-truth)

This is part of the Agents of Truth project - building autonomous payment agents with provable policy compliance.
