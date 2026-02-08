'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useAccount, useSignTypedData } from 'wagmi';
import { useEffect, useState, useCallback, Suspense } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    Node,
    Edge,
    useNodesState,
    useEdgesState,
    MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import {
    ArrowLeft,
    Loader2,
    CheckCircle2,
    XCircle,
    Clock,
    DollarSign,
    Shield,
    FileDown
} from 'lucide-react';
import { getTask, type TaskStep } from '@/lib/tasks';
import { createIntent, getIntentTypedData } from '@/lib/intent';

type StepStatus = 'pending' | 'running' | 'complete' | 'error';

interface StepState {
    status: StepStatus;
    result?: string;
    cost?: number;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://claw.agents-of-truth.com';

function getNodeColor(type: TaskStep['type'], status: StepStatus): string {
    if (status === 'error') return '#ef4444';
    if (status === 'complete') return '#22c55e';
    if (status === 'running') return '#eab308';

    switch (type) {
        case 'payment': return '#6366f1';
        case 'proof': return '#8b5cf6';
        default: return '#52525b';
    }
}

function StatusIcon({ status }: { status: StepStatus }) {
    switch (status) {
        case 'running': return <Loader2 className="h-4 w-4 animate-spin text-yellow-400" />;
        case 'complete': return <CheckCircle2 className="h-4 w-4 text-green-400" />;
        case 'error': return <XCircle className="h-4 w-4 text-red-400" />;
        default: return <Clock className="h-4 w-4 text-zinc-500" />;
    }
}

function PromptPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const { address, isConnected } = useAccount();
    const { signTypedDataAsync } = useSignTypedData();

    const taskId = searchParams.get('task') as 'RESEARCH_PAPER' | 'BOOK_TRAVEL' | 'VERIFY_COMPLIANCE';
    const task = taskId ? getTask(taskId) : null;

    const [phase, setPhase] = useState<'sign' | 'executing' | 'complete' | 'error'>('sign');
    const [stepStates, setStepStates] = useState<Record<string, StepState>>({});
    const [totalCost, setTotalCost] = useState(0);
    const [proof, setProof] = useState<{ commitment: string; verified: boolean } | null>(null);
    const [deliverable, setDeliverable] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

    // Build React Flow nodes from task steps
    useEffect(() => {
        if (!task) return;

        const newNodes: Node[] = task.steps.map((step, i) => ({
            id: step.id,
            position: { x: 150, y: i * 120 + 50 },
            data: {
                label: (
                    <div className="flex items-center gap-2 px-4 py-2">
                        <StatusIcon status={stepStates[step.id]?.status || 'pending'} />
                        <div>
                            <div className="font-medium text-white">{step.name}</div>
                            <div className="text-xs text-zinc-400">{step.description}</div>
                            {step.cost && (
                                <div className="mt-1 flex items-center gap-1 text-xs text-indigo-400">
                                    <DollarSign className="h-3 w-3" />
                                    ${step.cost.toFixed(2)} x402
                                </div>
                            )}
                        </div>
                    </div>
                ),
            },
            style: {
                background: '#18181b',
                border: `2px solid ${getNodeColor(step.type, stepStates[step.id]?.status || 'pending')}`,
                borderRadius: '12px',
                width: 280,
            },
        }));

        // Add deliverable node
        newNodes.push({
            id: 'deliverable',
            position: { x: 150, y: task.steps.length * 120 + 50 },
            data: {
                label: (
                    <div className="flex items-center gap-2 px-4 py-2">
                        <FileDown className="h-4 w-4 text-emerald-400" />
                        <div>
                            <div className="font-medium text-white">Deliverable</div>
                            <div className="text-xs text-zinc-400">{task.deliverable}</div>
                        </div>
                    </div>
                ),
            },
            style: {
                background: '#18181b',
                border: `2px solid ${phase === 'complete' ? '#22c55e' : '#52525b'}`,
                borderRadius: '12px',
                width: 280,
            },
        });

        const newEdges: Edge[] = task.steps.slice(1).map((step, i) => ({
            id: `${task.steps[i].id}-${step.id}`,
            source: task.steps[i].id,
            target: step.id,
            markerEnd: { type: MarkerType.ArrowClosed, color: '#6366f1' },
            style: { stroke: '#6366f1', strokeWidth: 2 },
        }));

        // Connect last step to deliverable
        newEdges.push({
            id: `${task.steps[task.steps.length - 1].id}-deliverable`,
            source: task.steps[task.steps.length - 1].id,
            target: 'deliverable',
            markerEnd: { type: MarkerType.ArrowClosed, color: '#22c55e' },
            style: { stroke: '#22c55e', strokeWidth: 2 },
        });

        setNodes(newNodes);
        setEdges(newEdges);
    }, [task, stepStates, phase, setNodes, setEdges]);

    const executeTask = useCallback(async (signature: string) => {
        if (!task || !address) return;

        setPhase('executing');
        let cost = 0;

        for (const step of task.steps) {
            setStepStates(prev => ({ ...prev, [step.id]: { status: 'running' } }));

            // Simulate step execution with delay
            await new Promise(resolve => setTimeout(resolve, 1500 + Math.random() * 1000));

            if (step.cost) {
                cost += step.cost;
                setTotalCost(cost);
            }

            // Generate mock proof on proof step
            if (step.type === 'proof') {
                setProof({
                    commitment: '0x' + Array(64).fill(0).map(() => Math.floor(Math.random() * 16).toString(16)).join(''),
                    verified: true,
                });
            }

            setStepStates(prev => ({
                ...prev,
                [step.id]: { status: 'complete', result: 'Success', cost: step.cost },
            }));
        }

        // Generate deliverable
        if (taskId === 'RESEARCH_PAPER') {
            setDeliverable(`# Research Summary: Autonomous Agents

## Abstract
This document summarizes findings from ArXiv, IEEE, and ResearchGate on autonomous agent systems.

## Key Papers Found

### 1. "Policy-Governed AI Agents" (ArXiv, 2024)
Authors: Smith et al.
Summary: Novel framework for constraining agent behavior through declarative policies.

### 2. "Zero-Knowledge Compliance Proofs" (IEEE, 2024)  
Authors: Johnson et al.
Summary: ZK-SNARKs for proving regulatory compliance without data disclosure.

### 3. "ENS-Based Identity for AI" (ResearchGate, 2024)
Authors: Williams et al.
Summary: Using Ethereum Name Service for decentralized agent identity.

## Conclusion
The research indicates a growing trend toward policy-governed autonomous systems with cryptographic compliance attestation.

---
*Generated by Agents of Truth*
*Total x402 Cost: $${cost.toFixed(2)}*
*ZK Proof: Verified ✓*`);
        } else if (taskId === 'BOOK_TRAVEL') {
            setDeliverable(`# Travel Itinerary

## Trip Overview
- **Destination**: San Francisco, CA
- **Dates**: March 15-20, 2024
- **Total Estimated Cost**: $1,450

## Flights
- **Outbound**: NYC → SFO, Delta DL456, 8:00 AM departure
- **Return**: SFO → NYC, Delta DL789, 6:00 PM departure

## Accommodation
- **Hotel**: The Ritz-Carlton, San Francisco
- **Address**: 600 Stockton St
- **Check-in**: March 15, 3:00 PM
- **Check-out**: March 20, 11:00 AM

## Local Transport
- **Airport Transfer**: Uber reserved, ~$45
- **Daily Transit**: BART pass, ~$25/day

---
*Generated by Agents of Truth*
*Total x402 Cost: $${cost.toFixed(2)}*
*ZK Proof: Verified ✓*`);
        } else {
            setDeliverable(`# Policy Compliance Verified

The agent has verified that your current policy configuration complies with all constraints.

**Policy ENS**: demo.agents-of-truth.eth
**Max Spend**: $100.00 USDC
**Allowed Actions**: payment, transfer

---
*ZK Proof: Verified ✓*`);
        }

        setPhase('complete');
    }, [task, address, taskId]);

    const handleSign = async () => {
        if (!address || !taskId) return;

        try {
            const intent = createIntent(taskId, address);
            const typedData = getIntentTypedData(intent);

            const signature = await signTypedDataAsync({
                domain: typedData.domain,
                types: typedData.types,
                primaryType: typedData.primaryType,
                message: typedData.message,
            });

            executeTask(signature);
        } catch (err) {
            setError('Signature rejected');
            setPhase('error');
        }
    };

    if (!task) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black text-white">
                <div className="text-center">
                    <h1 className="mb-4 text-2xl font-bold">Task Not Found</h1>
                    <button
                        onClick={() => router.push('/')}
                        className="text-indigo-400 hover:underline"
                    >
                        Return Home
                    </button>
                </div>
            </div>
        );
    }

    if (!isConnected) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-black text-white">
                <div className="text-center">
                    <h1 className="mb-4 text-2xl font-bold">Wallet Required</h1>
                    <p className="mb-6 text-zinc-400">Connect your wallet to execute tasks</p>
                    <ConnectButton />
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-black text-white">
            {/* Left Panel - Agent Flow */}
            <div className="flex-1 border-r border-zinc-800">
                <div className="flex h-14 items-center gap-4 border-b border-zinc-800 px-4">
                    <button onClick={() => router.push('/')} className="text-zinc-400 hover:text-white">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div>
                        <h1 className="font-semibold">{task.icon} {task.name}</h1>
                    </div>
                </div>

                <div className="h-[calc(100vh-3.5rem)]">
                    <ReactFlow
                        nodes={nodes}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        fitView
                        nodesDraggable={false}
                        nodesConnectable={false}
                        elementsSelectable={false}
                    >
                        <Background color="#27272a" gap={20} />
                        <Controls className="bg-zinc-900! border-zinc-700! [&>button]:bg-zinc-800! [&>button]:border-zinc-700! [&>button]:text-white! [&>button:hover]:bg-zinc-700!" />
                    </ReactFlow>
                </div>
            </div>

            {/* Right Panel - Status & Deliverable */}
            <div className="w-96 flex flex-col">
                <div className="flex h-14 items-center border-b border-zinc-800 px-4">
                    <h2 className="font-semibold">Execution Details</h2>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Phase: Sign */}
                    {phase === 'sign' && (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                            <div className="mb-4 flex items-center gap-3">
                                <Shield className="h-6 w-6 text-indigo-400" />
                                <h3 className="font-semibold">Sign Intent</h3>
                            </div>
                            <p className="mb-4 text-sm text-zinc-400">
                                Sign this message to authorize the agent. This is NOT a transaction -
                                no tokens will be transferred from your wallet.
                            </p>
                            <div className="mb-4 rounded-lg bg-zinc-800 p-3 text-xs font-mono text-zinc-300">
                                <div>Task: {taskId}</div>
                                <div>Signer: {address?.slice(0, 10)}...</div>
                                <div>Policy: demo.agents-of-truth.eth</div>
                            </div>
                            <button
                                onClick={handleSign}
                                className="w-full rounded-lg bg-indigo-600 py-3 font-medium text-white transition-colors hover:bg-indigo-500"
                            >
                                Sign Intent
                            </button>
                        </div>
                    )}

                    {/* Phase: Executing */}
                    {phase === 'executing' && (
                        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/10 p-4">
                            <div className="flex items-center gap-2">
                                <Loader2 className="h-5 w-5 animate-spin text-yellow-400" />
                                <span className="font-medium text-yellow-400">Agent Executing...</span>
                            </div>
                        </div>
                    )}

                    {/* Phase: Complete */}
                    {phase === 'complete' && (
                        <div className="rounded-xl border border-green-500/20 bg-green-500/10 p-4">
                            <div className="flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5 text-green-400" />
                                <span className="font-medium text-green-400">Execution Complete</span>
                            </div>
                        </div>
                    )}

                    {/* Cost Summary */}
                    {totalCost > 0 && (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                            <div className="flex items-center justify-between">
                                <span className="text-zinc-400">Total x402 Cost</span>
                                <span className="font-mono font-medium text-indigo-400">${totalCost.toFixed(2)}</span>
                            </div>
                        </div>
                    )}

                    {/* ZK Proof */}
                    {proof && (
                        <div className="rounded-xl border border-purple-500/20 bg-purple-500/10 p-4">
                            <div className="mb-2 flex items-center gap-2">
                                <Shield className="h-4 w-4 text-purple-400" />
                                <span className="font-medium text-purple-400">ZK Proof</span>
                            </div>
                            <div className="space-y-1 text-xs">
                                <div className="text-zinc-400">
                                    Commitment: <span className="font-mono text-zinc-300">{proof.commitment.slice(0, 20)}...</span>
                                </div>
                                <div className="text-zinc-400">
                                    Verified: <span className="text-green-400">{proof.verified ? '✓' : '✗'}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Deliverable */}
                    {deliverable && (
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
                            <div className="mb-3 flex items-center justify-between">
                                <span className="font-medium">Deliverable</span>
                                <button className="rounded-lg bg-zinc-800 px-3 py-1 text-xs text-zinc-300 hover:bg-zinc-700">
                                    Download
                                </button>
                            </div>
                            <div className="max-h-64 overflow-y-auto rounded-lg bg-zinc-800 p-3">
                                <pre className="whitespace-pre-wrap text-xs text-zinc-300">{deliverable}</pre>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function PromptPage() {
    return (
        <Suspense fallback={
            <div className="flex min-h-screen items-center justify-center bg-black text-white">
                <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            </div>
        }>
            <PromptPageContent />
        </Suspense>
    );
}
