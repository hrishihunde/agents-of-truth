/**
 * @fileoverview Proof Viewer Component
 * 
 * Displays zk proof details and allows verification.
 */

'use client';

import { useState } from 'react';
import type { ZKProof } from '../lib/api';
import { verifyProof } from '../lib/api';

interface ProofViewerProps {
    proof: ZKProof;
    onVerify?: (result: { valid: boolean; error?: string }) => void;
}

export function ProofViewer({ proof, onVerify }: ProofViewerProps) {
    const [isVerifying, setIsVerifying] = useState(false);
    const [verifyResult, setVerifyResult] = useState<{ valid: boolean; error?: string } | null>(
        proof.verified ? { valid: true } : null
    );
    const [showFullProof, setShowFullProof] = useState(false);

    const handleVerify = async () => {
        setIsVerifying(true);
        try {
            const result = await verifyProof(proof);
            setVerifyResult(result);
            if (onVerify) onVerify(result);
        } catch (error) {
            const errorResult = { valid: false, error: error instanceof Error ? error.message : 'Verification failed' };
            setVerifyResult(errorResult);
            if (onVerify) onVerify(errorResult);
        } finally {
            setIsVerifying(false);
        }
    };

    return (
        <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-6 border border-gray-700 shadow-xl">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center text-xl">
                        🔐
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">ZK Proof</h3>
                        <p className="text-sm text-gray-400">{proof.proof.protocol} / {proof.proof.curve}</p>
                    </div>
                </div>

                {/* Verification Status */}
                {verifyResult && (
                    <div className={`px-4 py-2 rounded-lg ${verifyResult.valid
                            ? 'bg-green-900/50 text-green-300 border border-green-700'
                            : 'bg-red-900/50 text-red-300 border border-red-700'
                        }`}>
                        {verifyResult.valid ? '✅ Verified' : '❌ Invalid'}
                    </div>
                )}
            </div>

            {/* Commitment */}
            <div className="mb-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <span className="text-gray-400 text-sm block mb-1">Commitment</span>
                <span className="text-purple-300 font-mono text-sm break-all">
                    {proof.commitment}
                </span>
            </div>

            {/* Public Signals */}
            <div className="mb-4 p-4 bg-gray-900/50 rounded-lg border border-gray-700">
                <span className="text-gray-400 text-sm block mb-2">Public Signals</span>
                <div className="space-y-1">
                    {proof.publicSignals.map((signal, index) => (
                        <div key={index} className="flex gap-2 text-sm">
                            <span className="text-gray-500">[{index}]</span>
                            <span className="text-gray-300 font-mono break-all">
                                {signal.length > 40 ? `${signal.slice(0, 20)}...${signal.slice(-20)}` : signal}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Proof Details (Collapsible) */}
            <div className="mb-4">
                <button
                    onClick={() => setShowFullProof(!showFullProof)}
                    className="text-sm text-blue-400 hover:text-blue-300 flex items-center gap-1"
                >
                    {showFullProof ? '▼' : '▶'} {showFullProof ? 'Hide' : 'Show'} Full Proof
                </button>

                {showFullProof && (
                    <pre className="mt-2 p-4 bg-gray-900 rounded-lg border border-gray-700 text-xs text-gray-300 overflow-auto max-h-60">
                        {JSON.stringify(proof.proof, null, 2)}
                    </pre>
                )}
            </div>

            {/* Generated At */}
            <div className="text-xs text-gray-500 mb-4">
                Generated: {new Date(proof.generatedAt).toLocaleString()}
            </div>

            {/* Verify Button */}
            <button
                onClick={handleVerify}
                disabled={isVerifying || verifyResult?.valid}
                className={`w-full py-3 rounded-lg font-semibold transition-all ${isVerifying
                        ? 'bg-gray-700 text-gray-400 cursor-wait'
                        : verifyResult?.valid
                            ? 'bg-green-900/50 text-green-400 cursor-not-allowed'
                            : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white'
                    }`}
            >
                {isVerifying ? (
                    <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                        Verifying...
                    </span>
                ) : verifyResult?.valid ? (
                    'Proof Verified ✓'
                ) : (
                    'Verify Proof'
                )}
            </button>

            {/* Error Message */}
            {verifyResult && !verifyResult.valid && verifyResult.error && (
                <div className="mt-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                    {verifyResult.error}
                </div>
            )}
        </div>
    );
}
