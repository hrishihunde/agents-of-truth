/**
 * @fileoverview Execute Action Page
 * 
 * UI to trigger agent execution with policy enforcement.
 */

'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { executeAction, type ExecuteResult, type ENSPolicy } from '../../src/lib/api';
import { PolicyCard } from '../../src/components/PolicyCard';
import { ProofViewer } from '../../src/components/ProofViewer';
import { LogStream } from '../../src/components/LogStream';

const ACTION_TYPES = [
    { value: 'payment', label: 'Payment', icon: '💳', description: 'Send USDC to a recipient' },
    { value: 'transfer', label: 'Transfer', icon: '📤', description: 'Transfer tokens' },
    { value: 'swap', label: 'Swap', icon: '🔄', description: 'Swap tokens' },
    { value: 'stake', label: 'Stake', icon: '📈', description: 'Stake tokens' },
    { value: 'bridge', label: 'Bridge', icon: '🌉', description: 'Bridge cross-chain' },
];

export default function ExecutePage() {
    // Form state
    const [ensName, setEnsName] = useState('');
    const [actionType, setActionType] = useState('payment');
    const [amount, setAmount] = useState('');
    const [recipient, setRecipient] = useState('');
    const [useMock, setUseMock] = useState(true);

    // Execution state
    const [isExecuting, setIsExecuting] = useState(false);
    const [result, setResult] = useState<ExecuteResult | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleExecute = useCallback(async () => {
        if (!ensName || !amount) return;

        setIsExecuting(true);
        setError(null);
        setResult(null);

        try {
            const response = await executeAction(
                {
                    ensName,
                    actionType,
                    amount: parseFloat(amount),
                    recipient: recipient || undefined,
                },
                useMock
            );
            setResult(response);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Execution failed');
        } finally {
            setIsExecuting(false);
        }
    }, [ensName, actionType, amount, recipient, useMock]);

    const handleReset = () => {
        setResult(null);
        setError(null);
    };

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
                        <span className="text-lg text-gray-300">Execute Action</span>
                    </div>

                    <nav className="flex gap-2">
                        <Link href="/" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors">
                            Dashboard
                        </Link>
                        <Link href="/proof" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors">
                            Proofs
                        </Link>
                    </nav>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Left: Form */}
                    <div>
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <span>⚡</span> Execute Paid Action
                        </h2>

                        <div className="bg-gray-900 rounded-xl p-6 border border-gray-800 space-y-6">
                            {/* ENS Name */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    ENS Name *
                                </label>
                                <input
                                    type="text"
                                    value={ensName}
                                    onChange={(e) => setEnsName(e.target.value)}
                                    placeholder="payments-agent.eth"
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-500"
                                    disabled={isExecuting}
                                />
                            </div>

                            {/* Action Type */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Action Type *
                                </label>
                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                                    {ACTION_TYPES.map((action) => (
                                        <button
                                            key={action.value}
                                            onClick={() => setActionType(action.value)}
                                            disabled={isExecuting}
                                            className={`p-3 rounded-lg border transition-all text-left ${actionType === action.value
                                                    ? 'bg-blue-900/50 border-blue-500 text-blue-300'
                                                    : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-600'
                                                }`}
                                        >
                                            <span className="text-xl">{action.icon}</span>
                                            <div className="text-sm font-medium mt-1">{action.label}</div>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Amount */}
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Amount (USDC) *
                                </label>
                                <input
                                    type="number"
                                    value={amount}
                                    onChange={(e) => setAmount(e.target.value)}
                                    placeholder="0.00"
                                    min="0"
                                    step="0.01"
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-500"
                                    disabled={isExecuting}
                                />
                            </div>

                            {/* Recipient */}
                            {(actionType === 'payment' || actionType === 'transfer') && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-300 mb-2">
                                        Recipient Address
                                    </label>
                                    <input
                                        type="text"
                                        value={recipient}
                                        onChange={(e) => setRecipient(e.target.value)}
                                        placeholder="0x..."
                                        className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-500 font-mono"
                                        disabled={isExecuting}
                                    />
                                </div>
                            )}

                            {/* Mock Toggle */}
                            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useMock}
                                    onChange={(e) => setUseMock(e.target.checked)}
                                    className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                                    disabled={isExecuting}
                                />
                                Use mock mode (no real transactions)
                            </label>

                            {/* Execute Button */}
                            <button
                                onClick={handleExecute}
                                disabled={isExecuting || !ensName || !amount}
                                className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${isExecuting
                                        ? 'bg-gray-700 text-gray-400 cursor-wait'
                                        : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                            >
                                {isExecuting ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                        Executing...
                                    </span>
                                ) : (
                                    'Execute Action'
                                )}
                            </button>

                            {/* Error */}
                            {error && (
                                <div className="p-4 bg-red-900/30 border border-red-700 rounded-lg text-red-300">
                                    ❌ {error}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right: Results */}
                    <div>
                        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
                            <span>📊</span> Execution Result
                        </h2>

                        {!result && !isExecuting && (
                            <div className="bg-gray-900 rounded-xl p-12 border border-gray-800 text-center">
                                <div className="text-6xl mb-4">🎯</div>
                                <p className="text-gray-400">
                                    Execute an action to see the result, policy enforcement, and zk proof
                                </p>
                            </div>
                        )}

                        {isExecuting && (
                            <div className="bg-gray-900 rounded-xl p-12 border border-gray-800 text-center">
                                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                                <p className="text-gray-300">Processing action...</p>
                                <p className="text-sm text-gray-500 mt-2">
                                    Resolving ENS policy and enforcing limits
                                </p>
                            </div>
                        )}

                        {result && (
                            <div className="space-y-6">
                                {/* Success/Failure Banner */}
                                <div className={`p-4 rounded-xl border ${result.success
                                        ? 'bg-green-900/30 border-green-700 text-green-300'
                                        : 'bg-red-900/30 border-red-700 text-red-300'
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{result.success ? '✅' : '❌'}</span>
                                        <div>
                                            <div className="font-semibold">
                                                {result.success ? 'Action Executed Successfully' : 'Execution Failed'}
                                            </div>
                                            <div className="text-sm opacity-80">
                                                ID: {result.executionId}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Policy Card */}
                                {result.policy && (
                                    <PolicyCard
                                        ensName={result.policy.ensName || ensName}
                                        maxSpendUSDC={result.policy.maxSpendUSDC}
                                        allowedActions={result.policy.allowedActions}
                                        policyVersion={result.policy.policyVersion}
                                        policyHash={result.policy.policyHash}
                                    />
                                )}

                                {/* ZK Proof */}
                                {result.proof && <ProofViewer proof={result.proof} />}

                                {/* Logs */}
                                {result.logs && result.logs.length > 0 && (
                                    <LogStream logs={result.logs} maxHeight="200px" />
                                )}

                                {/* Reset Button */}
                                <button
                                    onClick={handleReset}
                                    className="w-full py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-gray-300 transition-colors"
                                >
                                    Execute Another Action
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
