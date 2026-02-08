/**
 * @fileoverview ENS Helper Hooks using wagmi
 * 
 * These hooks provide ENS functionality for the frontend:
 * - Resolve ENS names to addresses
 * - Read ENS text records (policy data)
 * - ENS avatar resolution
 */

'use client';

import { useEffect, useState } from 'react';
import { createPublicClient, http } from 'viem';
import { normalize } from 'viem/ens';
import { mainnet } from 'viem/chains';

// ================================
// Viem Client
// ================================

const publicClient = createPublicClient({
    chain: mainnet,
    transport: http('https://eth.llamarpc.com'),
});

// ================================
// Types
// ================================

export interface ENSData {
    name: string;
    address: string | null;
    avatar: string | null;
    textRecords: {
        maxSpendUSDC: string | null;
        allowedActions: string | null;
        policyVersion: string | null;
    };
    isLoading: boolean;
    error: string | null;
}

// ================================
// Hooks
// ================================

/**
 * Hook to resolve ENS name and fetch agent policy text records
 * 
 * @param ensName - ENS name to resolve (e.g., "payments-agent.eth")
 * @returns ENS data including address, avatar, and policy text records
 */
export function useENSPolicy(ensName: string | null): ENSData {
    const [data, setData] = useState<ENSData>({
        name: ensName || '',
        address: null,
        avatar: null,
        textRecords: {
            maxSpendUSDC: null,
            allowedActions: null,
            policyVersion: null,
        },
        isLoading: false,
        error: null,
    });

    useEffect(() => {
        if (!ensName) {
            setData(prev => ({ ...prev, isLoading: false, error: null }));
            return;
        }

        let cancelled = false;

        async function fetchENSData() {
            if (!ensName) return;
            setData(prev => ({ ...prev, isLoading: true, error: null }));

            try {
                const normalizedName = normalize(ensName);

                // Fetch all data in parallel
                const [address, avatar, maxSpend, allowedActions, policyVersion] = await Promise.all([
                    publicClient.getEnsAddress({ name: normalizedName }).catch(() => null),
                    publicClient.getEnsAvatar({ name: normalizedName }).catch(() => null),
                    publicClient.getEnsText({ name: normalizedName, key: 'agent.maxSpendUSDC' }).catch(() => null),
                    publicClient.getEnsText({ name: normalizedName, key: 'agent.allowedActions' }).catch(() => null),
                    publicClient.getEnsText({ name: normalizedName, key: 'agent.policyVersion' }).catch(() => null),
                ]);

                if (!cancelled) {
                    setData({
                        name: ensName,
                        address: address ?? null,
                        avatar: avatar ?? null,
                        textRecords: {
                            maxSpendUSDC: maxSpend ?? null,
                            allowedActions: allowedActions ?? null,
                            policyVersion: policyVersion ?? null,
                        },
                        isLoading: false,
                        error: null,
                    });
                }
            } catch (error) {
                if (!cancelled) {
                    setData(prev => ({
                        ...prev,
                        isLoading: false,
                        error: error instanceof Error ? error.message : 'Failed to resolve ENS',
                    }));
                }
            }
        }

        fetchENSData();

        return () => {
            cancelled = true;
        };
    }, [ensName]);

    return data;
}

/**
 * Hook to resolve an ENS name to an address
 */
export function useENSAddress(ensName: string | null) {
    const [address, setAddress] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!ensName) {
            setAddress(null);
            return;
        }

        let cancelled = false;
        setIsLoading(true);

        publicClient
            .getEnsAddress({ name: normalize(ensName) })
            .then((addr) => {
                if (!cancelled) {
                    setAddress(addr || null);
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err.message);
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [ensName]);

    return { address, isLoading, error };
}

/**
 * Hook to read a specific ENS text record
 */
export function useENSText(ensName: string | null, key: string) {
    const [value, setValue] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!ensName || !key) {
            setValue(null);
            return;
        }

        let cancelled = false;
        setIsLoading(true);

        publicClient
            .getEnsText({ name: normalize(ensName), key })
            .then((text) => {
                if (!cancelled) {
                    setValue(text || null);
                    setIsLoading(false);
                }
            })
            .catch((err) => {
                if (!cancelled) {
                    setError(err.message);
                    setIsLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, [ensName, key]);

    return { value, isLoading, error };
}

/**
 * Debounced ENS name lookup for search inputs
 */
export function useDebouncedENS(ensName: string, delay = 500) {
    const [debouncedName, setDebouncedName] = useState(ensName);
    const ensData = useENSPolicy(debouncedName);

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedName(ensName);
        }, delay);

        return () => clearTimeout(timer);
    }, [ensName, delay]);

    return ensData;
}

/**
 * Validate if a string is a valid ENS name format
 */
export function isValidENSName(name: string): boolean {
    if (!name) return false;

    // Must end in .eth or other valid TLDs
    const validTLDs = ['.eth', '.xyz', '.luxe', '.kred', '.art'];
    const hasValidTLD = validTLDs.some(tld => name.toLowerCase().endsWith(tld));

    if (!hasValidTLD) return false;

    // Basic validation - no spaces, reasonable length
    if (name.includes(' ')) return false;
    if (name.length < 4 || name.length > 100) return false;

    return true;
}

/**
 * Format an address for display
 */
export function formatAddress(address: string): string {
    if (!address || address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
}
