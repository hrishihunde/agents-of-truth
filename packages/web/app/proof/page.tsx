/**
 * @fileoverview Proof Page
 * 
 * Display and verify zk proofs.
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { getHistory, generateProof, type ExecuteResult, type ZKProof } from '../../src/lib/api';
import { ProofViewer } from '../../src/components/ProofViewer';

export default function ProofPage() {
    // State
    const [history, setHistory] = useState<ExecuteResult[]>([]);
    const [selectedProof, setSelectedProof] = useState<ZKProof | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Generate new proof state
    const [ensName, setEnsName] = useState('');
    const [amount, setAmount] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [generatedProof, setGeneratedProof] = useState<ZKProof | null>(null);
    const [generateError, setGenerateError] = useState<string | null>(null);
    const [useMock, setUseMock] = useState(true);

    // Fetch history on mount
    useEffect(() => {
        getHistory(20)
            .then((data) => {
                setHistory(data.filter(ex => ex.proof));
                setIsLoading(false);
            })
            .catch(() => setIsLoading(false));
    }, []);

    const handleGenerate = useCallback(async () => {
        if (!ensName || !amount) return;

        setIsGenerating(true);
        setGenerateError(null);
        setGeneratedProof(null);

        try {
            const result = await generateProof(parseFloat(amount), ensName, useMock);
            setGeneratedProof(result.proof);
        } catch (err) {
            setGenerateError(err instanceof Error ? err.message : 'Failed to generate proof');
        } finally {
            setIsGenerating(false);
        }
    }, [ensName, amount, useMock]);

    return (
        <div className="min-h-screen bg-gray-950 text-white">
            {/* Header */}
            <header className="border-b border-gray-800 bg-gray-900">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link href="/" className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text hover:opacity-80 transition-opacity">
                            🤖 Payments Agent
                        </Link>
                        <span className="text-gray-600">›</span>
                        <span className="text-lg text-gray-300">ZK Proofs</span>
                    </div>

                    <nav className="flex gap-2">
                        <Link href="/" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors">
                            Dashboard
                        </Link>
                        <Link href="/execute" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
                            Execute Action
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Generate New Proof */}
                    <div className="lg:col-span-1">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <span>🔐</span> Generate Proof
                        </h2>

                        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    ENS Name
                                </label>
                                <input
                                    type="text"
                                    value={ensName}
                                    onChange={(e) => setEnsName(e.target.value)}
                                    placeholder="payments-agent.eth"
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-500"
                                    disabled={isGenerating}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Amount (USDC)
                                </label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-500"
                                    disabled={isGenerating}
                                />
                            </div>

                            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useMock}
                                    onChange={(e) => setUseMock(e.target.checked)}
                                    className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                                    disabled={isGenerating}
                                />
                                Use mock mode
                            </label>

                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating || !ensName || !amount}
                                className={`w-full py-3 rounded-lg font-semibold transition-all ${isGenerating
                                        ? 'bg-gray-700 text-gray-400'
                                        : 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 text-white'
                                    } disabled:opacity-50`}
                            >
                                {isGenerating ? 'Generating...' : 'Generate ZK Proof'}
                            </button>

                            {generateError && (
                                <div className="p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
                                    {generateError}
                                </div>
                            )}
                        </div>

                        {/* Generated Proof */}
                        {generatedProof && (
                            <div className="mt-6">
                                <h3 className="text-lg font-medium mb-3 text-green-400">✅ Proof Generated</h3>
                                <ProofViewer proof={generatedProof} />
                            </div>
                        )}
                    </div>

                    {/* Right: Proof History */}
                    <div className="lg:col-span-2">
                        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                            <span>📜</span> Proof History
                        </h2>

                        {isLoading ? (
                            <div className="bg-gray-900 rounded-xl p-12 border border-gray-800 text-center">
                                <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto" />
                                <p className="text-gray-400 mt-4">Loading proofs...</p>
                            </div>
                        ) : history.length === 0 ? (
                            <div className="bg-gray-900 rounded-xl p-12 border border-gray-800 text-center">
                                <div className="text-6xl mb-4">🔍</div>
                                <p className="text-gray-400">
                                    No proofs generated yet. Execute an action to create a proof.
                                </p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Proof List */}
                                <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
                                    <div className="divide-y divide-gray-800">
                                        {history.map((execution) => (
                                            <button
                                                key={execution.executionId}
                                                onClick={() => setSelectedProof(execution.proof!)}
                                                className={`w-full p-4 text-left hover:bg-gray-800/50 transition-colors ${selectedProof === execution.proof ? 'bg-gray-800' : ''
                                                    }`}
                                            >
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <span className="text-2xl">
                                                            {execution.success ? '✅' : '❌'}
                                                        </span>
                                                        <div>
                                                            <div className="font-medium text-white">
                                                                {execution.action.type} - ${execution.action.amount}
                                                            </div>
                                                            <div className="text-sm text-gray-400">
                                                                {execution.policy?.ensName || 'Unknown ENS'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sm text-gray-400">
                                                            {new Date(execution.timestamp).toLocaleString()}
                                                        </div>
                                                        <div className={`text-xs ${execution.proof?.verified ? 'text-green-400' : 'text-gray-500'
                                                            }`}>
                                                            {execution.proof?.verified ? '🔐 Verified' : 'Unverified'}
                                                        </div>
                                                    </div>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Selected Proof Detail */}
                                {selectedProof && (
                                    <div>
                                        <h3 className="text-lg font-medium mb-3">Proof Details</h3>
                                        <ProofViewer proof={selectedProof} />
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
