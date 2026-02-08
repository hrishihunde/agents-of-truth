/**
 * @fileoverview React Flow Agent Visualization
 * 
 * This component displays the agent's action flow as an interactive
 * node graph using React Flow (@xyflow/react).
 */

'use client';

import { useCallback, useEffect } from 'react';
import {
    ReactFlow,
    Background,
    Controls,
    MiniMap,
    useNodesState,
    useEdgesState,
    Node,
    Edge,
    Position,
    Handle,
    NodeProps,
    BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

// ================================
// Types
// ================================

export type FlowNodeStatus = 'pending' | 'running' | 'success' | 'error';
export type FlowNodeType = 'ens-resolve' | 'policy-check' | 'execute-action' | 'proof-generate' | 'result';

export interface FlowNodeData extends Record<string, unknown> {
    label: string;
    status: FlowNodeStatus;
    extra?: Record<string, unknown>;
    timestamp?: number;
}

// ================================
// Custom Node Component
// ================================

const nodeColors: Record<FlowNodeStatus, { bg: string; border: string; text: string }> = {
    pending: { bg: 'bg-gray-800', border: 'border-gray-600', text: 'text-gray-400' },
    running: { bg: 'bg-blue-900', border: 'border-blue-500', text: 'text-blue-300' },
    success: { bg: 'bg-green-900', border: 'border-green-500', text: 'text-green-300' },
    error: { bg: 'bg-red-900', border: 'border-red-500', text: 'text-red-300' },
};

const nodeIcons: Record<FlowNodeType, string> = {
    'ens-resolve': '🔍',
    'policy-check': '📋',
    'execute-action': '⚡',
    'proof-generate': '🔐',
    'result': '✅',
};

function CustomNode({ data, type }: NodeProps) {
    const nodeData = data as unknown as FlowNodeData;
    const status = nodeData.status || 'pending';
    const colors = nodeColors[status];
    const icon = nodeIcons[type as FlowNodeType] || '📦';

    return (
        <div
            className={`px-4 py-3 rounded-lg border-2 shadow-lg min-w-45 ${colors.bg} ${colors.border} transition-all duration-300`}
        >
            <Handle
                type="target"
                position={Position.Top}
                className="w-3 h-3 bg-gray-500!"
            />

            <div className="flex items-center gap-2">
                <span className="text-xl">{icon}</span>
                <div>
                    <div className={`font-semibold ${colors.text}`}>{nodeData.label}</div>
                    <div className="text-xs text-gray-500 capitalize">{status}</div>
                </div>
                {status === 'running' && (
                    <div className="ml-auto">
                        <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
            </div>

            {nodeData.extra && Object.keys(nodeData.extra).length > 0 && (
                <div className="mt-2 pt-2 border-t border-gray-700 text-xs text-gray-400">
                    {Object.entries(nodeData.extra).slice(0, 3).map(([key, value]) => (
                        <div key={key} className="truncate">
                            <span className="text-gray-500">{key}:</span>{' '}
                            {typeof value === 'string' ? value.slice(0, 20) : JSON.stringify(value).slice(0, 20)}
                        </div>
                    ))}
                </div>
            )}

            <Handle
                type="source"
                position={Position.Bottom}
                className="w-3 h-3 bg-gray-500!"
            />
        </div>
    );
}

// ================================
// Node Types
// ================================

const nodeTypes = {
    'ens-resolve': CustomNode,
    'policy-check': CustomNode,
    'execute-action': CustomNode,
    'proof-generate': CustomNode,
    'result': CustomNode,
};

// ================================
// Initial Flow State
// ================================

const initialNodes: Node<FlowNodeData>[] = [
    {
        id: 'ens-resolve',
        type: 'ens-resolve',
        position: { x: 250, y: 0 },
        data: { label: 'Resolve ENS Policy', status: 'pending' },
    },
    {
        id: 'policy-check',
        type: 'policy-check',
        position: { x: 250, y: 120 },
        data: { label: 'Check Policy', status: 'pending' },
    },
    {
        id: 'execute-action',
        type: 'execute-action',
        position: { x: 250, y: 240 },
        data: { label: 'Execute Action', status: 'pending' },
    },
    {
        id: 'proof-generate',
        type: 'proof-generate',
        position: { x: 250, y: 360 },
        data: { label: 'Generate ZK Proof', status: 'pending' },
    },
    {
        id: 'result',
        type: 'result',
        position: { x: 250, y: 480 },
        data: { label: 'Result', status: 'pending' },
    },
];

const initialEdges: Edge[] = [
    { id: 'e1', source: 'ens-resolve', target: 'policy-check', animated: false },
    { id: 'e2', source: 'policy-check', target: 'execute-action', animated: false },
    { id: 'e3', source: 'execute-action', target: 'proof-generate', animated: false },
    { id: 'e4', source: 'proof-generate', target: 'result', animated: false },
];

// ================================
// Main Component
// ================================

interface AgentFlowProps {
    nodeUpdates?: Array<{ nodeId: string; status: FlowNodeStatus; data?: Record<string, unknown> }>;
    onReset?: () => void;
}

export function AgentFlow({ nodeUpdates, onReset }: AgentFlowProps) {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Update nodes based on external updates
    useEffect(() => {
        if (!nodeUpdates || nodeUpdates.length === 0) return;

        setNodes((nds) =>
            nds.map((node) => {
                const update = nodeUpdates.find((u) => u.nodeId === node.id);
                if (update) {
                    return {
                        ...node,
                        data: {
                            ...node.data,
                            status: update.status,
                            data: update.data,
                            timestamp: Date.now(),
                        },
                    };
                }
                return node;
            })
        );

        // Animate edges based on running nodes
        setEdges((eds) =>
            eds.map((edge) => {
                const sourceUpdate = nodeUpdates.find((u) => u.nodeId === edge.source);
                return {
                    ...edge,
                    animated: sourceUpdate?.status === 'running' || sourceUpdate?.status === 'success',
                    style: {
                        stroke: sourceUpdate?.status === 'success' ? '#22c55e' :
                            sourceUpdate?.status === 'error' ? '#ef4444' : '#6b7280',
                    },
                };
            })
        );
    }, [nodeUpdates, setNodes, setEdges]);

    // Reset flow to initial state
    const handleReset = useCallback(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
        if (onReset) onReset();
    }, [setNodes, setEdges, onReset]);

    return (
        <div className="w-full h-150 bg-gray-900 rounded-xl overflow-hidden border border-gray-700">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                nodeTypes={nodeTypes}
                fitView
                attributionPosition="bottom-left"
                className="bg-gray-900"
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="#374151"
                />
                <Controls className="bg-gray-800! border-gray-700!" />
                <MiniMap
                    className="bg-gray-800! border-gray-700!"
                    nodeColor={(n) => {
                        const status = (n.data as FlowNodeData)?.status;
                        return status === 'success' ? '#22c55e' :
                            status === 'error' ? '#ef4444' :
                                status === 'running' ? '#3b82f6' : '#4b5563';
                    }}
                />
            </ReactFlow>

            {/* Reset Button */}
            <div className="absolute top-4 right-4">
                <button
                    onClick={handleReset}
                    className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded-lg transition-colors"
                >
                    Reset Flow
                </button>
            </div>
        </div>
    );
}
