/**
 * ENS Resolution Test Script
 */

import {
    resolveENSPolicy,
    createMockPolicy,
    isActionAllowed,
    isAmountWithinLimit
} from './ens.js';

async function testENSResolution(): Promise<void> {
    console.log('═'.repeat(50));
    console.log('  ENS Resolution Test Suite');
    console.log('═'.repeat(50));
    console.log('');

    // Test 1: Create a mock policy
    console.log('Test 1: Create mock policy');
    console.log('-'.repeat(50));

    const mockPolicy = createMockPolicy('test-agent.eth');
    console.log('✅ Mock policy created:');
    console.log(`   ensName: ${mockPolicy.ensName}`);
    console.log(`   maxSpendUSDC: ${mockPolicy.maxSpendUSDC}`);
    console.log(`   allowedActions: ${mockPolicy.allowedActions.join(', ')}`);
    console.log(`   policyVersion: ${mockPolicy.policyVersion}`);
    console.log('');

    // Test 2: Action validation
    console.log('Test 2: Action validation');
    console.log('-'.repeat(50));

    console.log(`   "transfer" allowed: ${isActionAllowed(mockPolicy, 'transfer') ? '✅' : '❌'}`);
    console.log(`   "swap" allowed: ${isActionAllowed(mockPolicy, 'swap') ? '✅' : '❌'}`);
    console.log(`   "nuclear_launch" allowed: ${isActionAllowed(mockPolicy, 'nuclear_launch') ? '✅' : '❌'}`);
    console.log('');

    // Test 3: Amount validation
    console.log('Test 3: Amount validation');
    console.log('-'.repeat(50));

    console.log(`   $50 within limit: ${isAmountWithinLimit(mockPolicy, 50) ? '✅' : '❌'}`);
    console.log(`   $100 within limit: ${isAmountWithinLimit(mockPolicy, 100) ? '✅' : '❌'}`);
    console.log(`   $150 within limit: ${isAmountWithinLimit(mockPolicy, 150) ? '✅' : '❌'}`);
    console.log('');

    // Test 4: Try live ENS resolution (may fail without RPC)
    const testName = 'vitalik.eth';
    console.log(`Test 4: Attempt live ENS resolution (${testName})`);
    console.log('-'.repeat(50));

    try {
        const policy = await resolveENSPolicy(testName);
        console.log(`✅ Resolved: ${testName}`);
        console.log(`   maxSpendUSDC: ${policy.maxSpendUSDC}`);
    } catch (error) {
        console.log(`⚠️ Expected failure (no policy records): ${(error as Error).message.slice(0, 40)}...`);
    }
    console.log('');

    console.log('═'.repeat(50));
    console.log('  Tests Complete');
    console.log('═'.repeat(50));
}

testENSResolution()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
