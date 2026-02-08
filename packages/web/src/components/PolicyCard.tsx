/**
 * @fileoverview Policy Card Component
 * 
 * Displays ENS-derived policy information in a card format.
 */

'use client';

interface PolicyCardProps {
    ensName: string;
    maxSpendUSDC: number;
    allowedActions: string[];
    policyVersion: string;
    policyHash?: string;
    isLoading?: boolean;
}

export function PolicyCard({
    ensName,
    maxSpendUSDC,
    allowedActions,
    policyVersion,
    policyHash,
    isLoading = false,
}: PolicyCardProps) {
    if (isLoading) {
        return (
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700 animate-pulse">
                <div className="h-6 bg-gray-700 rounded w-48 mb-4" />
                <div className="space-y-3">
                    <div className="h-4 bg-gray-700 rounded w-32" />
                    <div className="h-4 bg-gray-700 rounded w-40" />
                    <div className="h-4 bg-gray-700 rounded w-24" />
                </div>
            </div>
        );
    }

    return (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 shadow-xl">
            {/* Header */}
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-xl">
                    📋
                </div>
                <div>
                    <h3 className="text-lg font-bold text-white">ENS Policy</h3>
                    <p className="text-sm text-gray-400 font-mono">{ensName}</p>
                </div>
            </div>

            {/* Policy Details */}
            <div className="space-y-4">
                {/* Max Spend */}
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                    <span className="text-gray-400">Max Spend</span>
                    <span className="text-white font-bold text-lg">
                        ${maxSpendUSDC.toLocaleString()} <span className="text-sm text-gray-400">USDC</span>
                    </span>
                </div>

                {/* Allowed Actions */}
                <div className="py-2 border-b border-gray-700">
                    <span className="text-gray-400 block mb-2">Allowed Actions</span>
                    <div className="flex flex-wrap gap-2">
                        {allowedActions.map((action) => (
                            <span
                                key={action}
                                className="px-3 py-1 bg-blue-900/50 text-blue-300 rounded-full text-sm border border-blue-700"
                            >
                                {action}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Policy Version */}
                <div className="flex justify-between items-center py-2 border-b border-gray-700">
                    <span className="text-gray-400">Policy Version</span>
                    <span className="text-white font-mono">{policyVersion}</span>
                </div>

                {/* Policy Hash */}
                {policyHash && (
                    <div className="py-2">
                        <span className="text-gray-400 block mb-1">Policy Hash</span>
                        <span className="text-gray-300 font-mono text-xs break-all">
                            {policyHash}
                        </span>
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="mt-6 pt-4 border-t border-gray-700">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span>Live from ENS</span>
                </div>
            </div>
        </div>
    );
}
