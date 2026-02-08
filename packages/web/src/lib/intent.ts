import { type Address } from 'viem';

export interface Intent {
    task: string;
    signer: Address;
    timestamp: number;
    policyENS: string;
}

export const INTENT_DOMAIN = {
    name: 'Agents of Truth',
    version: '1',
    chainId: 1,
} as const;

export const INTENT_TYPES = {
    Intent: [
        { name: 'task', type: 'string' },
        { name: 'signer', type: 'address' },
        { name: 'timestamp', type: 'uint256' },
        { name: 'policyENS', type: 'string' },
    ],
} as const;

export function createIntent(task: string, signer: Address, policyENS: string = 'demo.agents-of-truth.eth'): Intent {
    return {
        task,
        signer,
        timestamp: Math.floor(Date.now() / 1000),
        policyENS,
    };
}

export function getIntentTypedData(intent: Intent) {
    return {
        domain: INTENT_DOMAIN,
        types: INTENT_TYPES,
        primaryType: 'Intent' as const,
        message: intent,
    };
}
