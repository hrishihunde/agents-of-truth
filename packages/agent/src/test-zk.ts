/**
 * ZK Proof Test Script
 */

import { generateProof, computeCommitment } from './zk/prove.js';
import { verifyProof, verifyProofWithValues } from './zk/verify.js';

async function testZKProofs(): Promise<void> {
    console.log('═'.repeat(50));
    console.log('  ZK Proof Test Suite');
    console.log('═'.repeat(50));
    console.log('');

    // Test 1: Generate proof for valid amount
    console.log('Test 1: Generate proof (amount: $50, maxSpend: $100)');
    console.log('-'.repeat(50));

    try {
        const proof = await generateProof({
            amount: 50,
            maxSpend: 100,
            policyHash: '12345678901234567890',
        });

        console.log('✅ Proof generated successfully');
        console.log(`   Commitment: ${proof.commitment.slice(0, 20)}...`);
        console.log(`   Verified: ${proof.verified}`);
        console.log(`   Generated at: ${new Date(proof.generatedAt).toISOString()}`);
        console.log('');

        // Test 2: Verify the generated proof
        console.log('Test 2: Verify the generated proof');
        console.log('-'.repeat(50));

        const verifyResult = await verifyProof(proof);
        console.log(`✅ Verification result: ${verifyResult.valid ? 'VALID' : 'INVALID'}`);
        if (verifyResult.error) {
            console.log(`   Error: ${verifyResult.error}`);
        }
        console.log('');

        // Test 3: Verify with values extraction
        console.log('Test 3: Verify with value extraction');
        console.log('-'.repeat(50));

        const verifyWithValues = await verifyProofWithValues(proof);
        console.log(`✅ Valid: ${verifyWithValues.valid}`);
        console.log(`   Commitment: ${verifyWithValues.commitment?.slice(0, 20)}...`);
        console.log(`   isValid: ${verifyWithValues.isValid}`);
        console.log('');

    } catch (error) {
        console.error('❌ Test failed:', error);
    }

    // Test 4: Compute commitment directly
    console.log('Test 4: Compute commitment directly');
    console.log('-'.repeat(50));

    try {
        const commitment = await computeCommitment(50, '12345678901234567890');
        console.log(`✅ Commitment computed: ${commitment.slice(0, 20)}...`);
    } catch (error) {
        console.error('❌ Commitment computation failed:', error);
    }
    console.log('');

    // Test 5: Invalid proof (amount exceeds maxSpend)
    console.log('Test 5: Attempt invalid proof (amount: $150, maxSpend: $100)');
    console.log('-'.repeat(50));

    try {
        await generateProof({
            amount: 150,
            maxSpend: 100,
            policyHash: '12345678901234567890',
        });
        console.log('❌ Should have thrown an error');
    } catch (error) {
        console.log(`✅ Correctly rejected: ${(error as Error).message}`);
    }
    console.log('');

    console.log('═'.repeat(50));
    console.log('  Tests Complete');
    console.log('═'.repeat(50));
}

testZKProofs()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
