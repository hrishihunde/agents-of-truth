/**
 * @fileoverview Dashboard Page
 * 
 * Main page showing:
 * - ENS name input and policy display
 * - Agent status and health
 * - React Flow visualization of agent actions
 */

'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { AgentFlow, type FlowNodeStatus } from '../src/components/AgentFlow';
import { PolicyCard } from '../src/components/PolicyCard';
import { LogStream } from '../src/components/LogStream';
import { getHealth, getPolicy, subscribeToEvents, type ENSPolicy, type LogEntry, type ExecutionEvent } from '../src/lib/api';
import { isValidENSName } from '../src/lib/ens';

export default function DashboardPage() {
  // State
  const [ensName, setEnsName] = useState('');
  const [policy, setPolicy] = useState<ENSPolicy | null>(null);
  const [isLoadingPolicy, setIsLoadingPolicy] = useState(false);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [health, setHealth] = useState<{ status: string; version: string } | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [nodeUpdates, setNodeUpdates] = useState<Array<{ nodeId: string; status: FlowNodeStatus; data?: Record<string, unknown> }>>([]);
  const [useMock, setUseMock] = useState(true);

  // Fetch health on mount
  useEffect(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth({ status: 'offline', version: 'unknown' }));
  }, []);

  // Subscribe to SSE events
  useEffect(() => {
    const unsubscribe = subscribeToEvents(
      (event: ExecutionEvent) => {
        if (event.type === 'log') {
          setLogs((prev) => [...prev, event.data as LogEntry].slice(-100));
        } else if (event.type === 'node-update') {
          const update = event.data as { nodeId: string; status: FlowNodeStatus; data?: Record<string, unknown> };
          setNodeUpdates((prev) => {
            const filtered = prev.filter((u) => u.nodeId !== update.nodeId);
            return [...filtered, update];
          });
        }
      },
      (error) => {
        console.error('SSE error:', error);
      }
    );

    return unsubscribe;
  }, []);

  // Lookup ENS policy
  const handleLookup = useCallback(async () => {
    if (!ensName.trim()) return;

    setIsLoadingPolicy(true);
    setPolicyError(null);
    setPolicy(null);

    try {
      const result = await getPolicy(ensName, useMock);
      setPolicy(result);
    } catch (error) {
      setPolicyError(error instanceof Error ? error.message : 'Failed to fetch policy');
    } finally {
      setIsLoadingPolicy(false);
    }
  }, [ensName, useMock]);

  // Reset flow visualization
  const handleReset = useCallback(() => {
    setNodeUpdates([]);
    setLogs([]);
  }, []);

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 text-transparent bg-clip-text">
              🤖 Payments Agent
            </h1>
            <span className="text-sm text-gray-500">zkENS • Arc Integration</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Health Status */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 rounded-lg">
              <span className={`w-2 h-2 rounded-full ${health?.status === 'healthy' ? 'bg-green-500' :
                health?.status === 'offline' ? 'bg-red-500' : 'bg-yellow-500'
                }`} />
              <span className="text-sm text-gray-400">
                {health?.status || 'Connecting...'}
              </span>
              {health?.version && (
                <span className="text-xs text-gray-600">v{health.version}</span>
              )}
            </div>

            {/* Navigation */}
            <nav className="flex gap-2">
              <Link href="/execute" className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition-colors">
                Execute Action
              </Link>
              <Link href="/proof" className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium transition-colors">
                Proofs
              </Link>
            </nav>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* ENS Lookup Section */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>🔍</span> ENS Policy Lookup
          </h2>

          <div className="flex gap-4 items-start">
            <div className="flex-1 max-w-xl">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={ensName}
                  onChange={(e) => setEnsName(e.target.value)}
                  placeholder="Enter ENS name (e.g., payments-agent.eth)"
                  className="flex-1 px-4 py-3 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:border-blue-500 text-white placeholder-gray-500"
                  onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
                />
                <button
                  onClick={handleLookup}
                  disabled={isLoadingPolicy || !ensName.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-gray-700 disabled:to-gray-700 rounded-lg font-medium transition-all disabled:cursor-not-allowed"
                >
                  {isLoadingPolicy ? 'Loading...' : 'Lookup'}
                </button>
              </div>

              {/* Mock Mode Toggle */}
              <label className="flex items-center gap-2 mt-2 text-sm text-gray-400 cursor-pointer">
                <input
                  type="checkbox"
                  checked={useMock}
                  onChange={(e) => setUseMock(e.target.checked)}
                  className="w-4 h-4 rounded bg-gray-700 border-gray-600"
                />
                Use mock data (for testing without real ENS)
              </label>

              {/* Validation hint */}
              {ensName && !isValidENSName(ensName) && (
                <p className="mt-2 text-sm text-yellow-500">
                  ⚠️ This doesn&apos;t look like a valid ENS name
                </p>
              )}

              {/* Error */}
              {policyError && (
                <p className="mt-2 text-sm text-red-400">
                  ❌ {policyError}
                </p>
              )}
            </div>

            {/* Policy Card */}
            {(policy || isLoadingPolicy) && (
              <div className="w-80">
                <PolicyCard
                  ensName={policy?.ensName || ensName}
                  maxSpendUSDC={policy?.maxSpendUSDC || 0}
                  allowedActions={policy?.allowedActions || []}
                  policyVersion={policy?.policyVersion || ''}
                  policyHash={policy?.policyHash}
                  isLoading={isLoadingPolicy}
                />
              </div>
            )}
          </div>
        </section>

        {/* Agent Flow Visualization */}
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>⚡</span> Agent Action Flow
          </h2>
          <AgentFlow nodeUpdates={nodeUpdates} onReset={handleReset} />
        </section>

        {/* Logs Section */}
        <section>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <span>📋</span> Activity Logs
          </h2>
          <LogStream logs={logs} maxHeight="300px" />
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 bg-gray-900 mt-8">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between text-sm text-gray-500">
          <span>Payments Agent with zkENS Proof System</span>
          <span>Built for autonomous agent operations</span>
        </div>
      </footer>
    </div>
  );
}
