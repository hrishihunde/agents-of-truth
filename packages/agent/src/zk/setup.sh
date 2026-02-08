#!/bin/bash

# ================================
# ZK Circuit Setup Script
# ================================
#
# This script compiles the Circom circuit and performs the trusted setup.
# It generates all files needed for proof generation and verification.
#
# Prerequisites:
#   - Circom 2.x installed: https://docs.circom.io/getting-started/installation/
#   - Node.js and npm installed
#   - circomlib installed (npm install circomlib)
#
# Output files:
#   - circuit_js/circuit.wasm  (WASM for proof generation)
#   - circuit.r1cs             (R1CS constraint system)
#   - circuit_final.zkey       (Proving key)
#   - verification_key.json    (Verification key)
#
# Usage:
#   cd packages/agent/src/zk
#   bash setup.sh
#

set -e  # Exit on error

echo "═══════════════════════════════════════════════════════"
echo "  ZK Circuit Setup for Policy Compliance Proof"
echo "═══════════════════════════════════════════════════════"
echo ""

# Navigate to the zk directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$SCRIPT_DIR"

# ================================
# Step 1: Check Prerequisites
# ================================
echo "📋 Checking prerequisites..."

if ! command -v circom &> /dev/null; then
    echo "❌ Circom not found. Please install it:"
    echo "   curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh"
    echo "   git clone https://github.com/iden3/circom.git"
    echo "   cd circom && cargo build --release"
    echo "   cargo install --path circom"
    exit 1
fi

echo "✅ Circom found: $(circom --version)"

if ! command -v snarkjs &> /dev/null; then
    echo "❌ snarkjs not found. Installing globally..."
    npm install -g snarkjs
fi

echo "✅ snarkjs found"

# ================================
# Step 2: Install circomlib if needed
# ================================
if [ ! -d "node_modules/circomlib" ]; then
    echo ""
    echo "📦 Installing circomlib..."
    npm install circomlib
fi
echo "✅ circomlib installed"

# ================================
# Step 3: Compile the Circuit
# ================================
echo ""
echo "🔧 Compiling circuit..."

circom circuit.circom \
    --r1cs \
    --wasm \
    --sym \
    -o . \
    -l node_modules

echo "✅ Circuit compiled"
echo "   - circuit.r1cs"
echo "   - circuit_js/circuit.wasm"
echo "   - circuit.sym"

# ================================
# Step 4: Download Powers of Tau
# ================================
PTAU_FILE="pot14_final.ptau"

if [ ! -f "$PTAU_FILE" ]; then
    echo ""
    echo "📥 Downloading Powers of Tau (this may take a moment)..."
    # Using pot14 for circuits up to 2^14 constraints
    curl -L -o "$PTAU_FILE" \
        https://hermez.s3-eu-west-1.amazonaws.com/powersOfTau28_hez_final_14.ptau
    echo "✅ Powers of Tau downloaded"
else
    echo "✅ Powers of Tau already exists"
fi

# ================================
# Step 5: Phase 2 Setup
# ================================
echo ""
echo "🔐 Running Groth16 setup (Phase 2)..."

# Initial contribution
snarkjs groth16 setup circuit.r1cs "$PTAU_FILE" circuit_0000.zkey

echo "✅ Initial zkey created"

# ================================
# Step 6: Contribute to Ceremony
# ================================
echo ""
echo "🎲 Contributing to ceremony (development mode)..."

# For production, this would be an actual ceremony with multiple participants
# For development, we use a random contribution
snarkjs zkey contribute circuit_0000.zkey circuit_final.zkey \
    --name="Development Contribution" \
    -e="random entropy $(date +%s)"

echo "✅ Final zkey created"

# ================================
# Step 7: Export Verification Key
# ================================
echo ""
echo "📤 Exporting verification key..."

snarkjs zkey export verificationkey circuit_final.zkey verification_key.json

echo "✅ Verification key exported"

# ================================
# Step 8: Generate Solidity Verifier (Optional)
# ================================
echo ""
echo "📜 Generating Solidity verifier..."

snarkjs zkey export solidityverifier circuit_final.zkey verifier.sol

echo "✅ Solidity verifier generated"

# ================================
# Step 9: Cleanup
# ================================
echo ""
echo "🧹 Cleaning up intermediate files..."

rm -f circuit_0000.zkey

echo "✅ Cleanup complete"

# ================================
# Step 10: Test Proof Generation
# ================================
echo ""
echo "🧪 Testing proof generation..."

# Create test input
cat > test_input.json << EOF
{
    "amount": "50000000",
    "maxSpend": "100000000",
    "policyHash": "12345678"
}
EOF

# Generate test proof
snarkjs groth16 fullprove \
    test_input.json \
    circuit_js/circuit.wasm \
    circuit_final.zkey \
    test_proof.json \
    test_public.json

echo "✅ Test proof generated"

# Verify test proof
snarkjs groth16 verify \
    verification_key.json \
    test_public.json \
    test_proof.json

echo "✅ Test proof verified"

# Cleanup test files
rm -f test_input.json test_proof.json test_public.json

# ================================
# Summary
# ================================
echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ Setup Complete!"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "Generated files:"
echo "  📄 circuit.r1cs            - Constraint system"
echo "  📁 circuit_js/             - WASM & JavaScript"
echo "  🔑 circuit_final.zkey      - Proving key (~40MB)"
echo "  🔑 verification_key.json   - Verification key"
echo "  📜 verifier.sol            - Solidity verifier"
echo ""
echo "To generate proofs from TypeScript:"
echo "  import { generateProof } from './prove.js'"
echo "  const proof = await generateProof({ amount, maxSpend, policyHash })"
echo ""
echo "⚠️  WARNING: This is a DEVELOPMENT setup."
echo "    For production, use a proper MPC ceremony!"
echo "═══════════════════════════════════════════════════════"
