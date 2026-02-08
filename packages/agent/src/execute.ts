/**
 * @fileoverview Core Agent Execution Logic
 * 
 * This module handles:
 * 1. Validating action requests against ENS policies
 * 2. Executing "paid actions" (currently stubs for Arc/USDC)
 * 3. Generating zk proofs of policy compliance
 * 4. Tracking execution history and emitting events
 * 
 * All policy enforcement happens dynamically at runtime using
 * values fetched from ENS text records.
 */

import { v4 as uuidv4 } from 'uuid';
import {
    resolveENSPolicy,
    isActionAllowed,
    isAmountWithinLimit,
    PolicyError
} from './ens.js';
import { sendPayment } from './arc.js';
import { generateProof } from './zk/prove.js';
import type {
    ExecuteRequest,
    ExecuteResult,
    LogEntry,
    ActionFlowNode,
    ActionFlowEdge,
    ActionFlow,
    ENSPolicy,
    ZKProof
} from './types.js';

// ================================
// Execution History
// ================================

/**
 * In-memory store of recent executions
 * In production, this would be persisted to a database
 */
const executionHistory: ExecuteResult[] = [];

/** Maximum history entries to keep in memory */
const MAX_HISTORY = 100;

/**
 * Event emitter for execution events
 * Subscribers can listen for real-time updates
 */
type ExecutionEventListener = (event: ExecutionEvent) => void;
const eventListeners: ExecutionEventListener[] = [];

export interface ExecutionEvent {
    type: 'log' | 'node-update' | 'complete' | 'error';
    executionId: string;
    data: unknown;
    timestamp: number;
}

// ================================
// Core Execution Function
// ================================

/**
 * Execute a paid action with ENS policy enforcement
 * 
 * This is the main entry point for agent actions. It:
 * 1. Resolves the ENS policy
 * 2. Validates the action type and amount
 * 3. Executes the action (stub for now)
 * 4. Generates a zk proof of compliance
 * 
 * @param request - The execute request
 * @returns Execution result with proof
 * 
 * @example
 * ```typescript
 * const result = await executeAction({
 *   ensName: 'payments-agent.eth',
 *   actionType: 'payment',
 *   amount: 50,
 *   recipient: '0x...'
 * });
 * 
 * if (result.success) {
 *   console.log('Payment executed:', result.executionId);
 *   console.log('Proof:', result.proof);
 * }
 * ```
 */
export async function executeAction(request: ExecuteRequest): Promise<ExecuteResult> {
    const executionId = uuidv4();
    const logs: LogEntry[] = [];
    const startTime = Date.now();

    // Helper to add logs and emit events
    const log = (level: LogEntry['level'], message: string, data?: Record<string, unknown>) => {
        const entry: LogEntry = { timestamp: Date.now(), level, message, data };
        logs.push(entry);
        emitEvent({ type: 'log', executionId, data: entry, timestamp: Date.now() });
    };

    // Initialize the action flow for visualization
    const flow = initializeActionFlow(executionId);

    try {
        log('info', `Starting execution ${executionId}`, { request });

        // ================================
        // Step 1: Resolve ENS Policy
        // ================================
        updateFlowNode(flow, 'ens-resolve', 'running');
        log('info', `Resolving ENS policy for ${request.ensName}...`);

        let policy: ENSPolicy;
        try {
            policy = await resolveENSPolicy(request.ensName);
        } catch (error) {
            if (error instanceof PolicyError) {
                throw error;
            }
            // If ENS resolution fails (e.g., no network), use detailed error
            throw new ExecutionError(
                `Failed to resolve ENS name: ${request.ensName}`,
                'ENS_RESOLUTION_FAILED',
                { originalError: error instanceof Error ? error.message : String(error) }
            );
        }

        updateFlowNode(flow, 'ens-resolve', 'success', {
            maxSpendUSDC: policy.maxSpendUSDC,
            allowedActions: policy.allowedActions
        });
        log('info', `Policy resolved`, {
            maxSpendUSDC: policy.maxSpendUSDC,
            allowedActions: policy.allowedActions,
            policyVersion: policy.policyVersion
        });

        // ================================
        // Step 2: Validate Action Against Policy
        // ================================
        updateFlowNode(flow, 'policy-check', 'running');
        log('info', `Checking policy compliance...`);

        // Check if action type is allowed
        if (!isActionAllowed(policy, request.actionType)) {
            throw new ExecutionError(
                `Action type "${request.actionType}" is not allowed by policy`,
                'ACTION_NOT_ALLOWED',
                {
                    requestedAction: request.actionType,
                    allowedActions: policy.allowedActions
                }
            );
        }
        log('debug', `Action type "${request.actionType}" is allowed`);

        // Check if amount is within limits
        if (!isAmountWithinLimit(policy, request.amount)) {
            throw new ExecutionError(
                `Amount ${request.amount} USDC exceeds policy limit of ${policy.maxSpendUSDC} USDC`,
                'AMOUNT_EXCEEDS_LIMIT',
                {
                    requestedAmount: request.amount,
                    maxSpendUSDC: policy.maxSpendUSDC
                }
            );
        }
        log('debug', `Amount ${request.amount} USDC is within limit`);

        updateFlowNode(flow, 'policy-check', 'success');
        log('info', `Policy check passed`);

        // ================================
        // Step 3: Execute Action
        // ================================
        updateFlowNode(flow, 'execute-action', 'running');
        log('info', `Executing ${request.actionType} action...`);

        // Execute the action (currently a stub)
        const actionResult = await executeActionInternal(request, policy, log);

        updateFlowNode(flow, 'execute-action', 'success', actionResult);
        log('info', `Action executed successfully`, actionResult);

        // ================================
        // Step 4: Generate ZK Proof
        // ================================
        updateFlowNode(flow, 'proof-generate', 'running');
        log('info', `Generating zk proof of policy compliance...`);

        let proof: ZKProof | undefined;
        try {
            proof = await generateProof({
                amount: request.amount,
                maxSpend: policy.maxSpendUSDC,
                policyHash: policy.policyHash,
            });

            updateFlowNode(flow, 'proof-generate', 'success', {
                commitment: proof.commitment,
                verified: proof.verified
            });
            log('info', `ZK proof generated`, {
                commitment: proof.commitment,
                verified: proof.verified
            });
        } catch (error) {
            // Proof generation is optional - don't fail the execution
            log('warn', `ZK proof generation failed`, {
                error: error instanceof Error ? error.message : String(error)
            });
            updateFlowNode(flow, 'proof-generate', 'error');
        }

        // ================================
        // Step 5: Complete Execution
        // ================================
        updateFlowNode(flow, 'result', 'success');

        const result: ExecuteResult = {
            success: true,
            executionId,
            timestamp: Date.now(),
            action: {
                type: request.actionType,
                amount: request.amount,
                recipient: request.recipient,
            },
            policy,
            proof,
            logs,
        };

        // Store in history
        addToHistory(result);

        emitEvent({ type: 'complete', executionId, data: result, timestamp: Date.now() });
        log('info', `Execution complete`, {
            duration: Date.now() - startTime,
            executionId
        });

        return result;

    } catch (error) {
        // Handle errors
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorCode = error instanceof ExecutionError ? error.code : 'UNKNOWN_ERROR';

        log('error', `Execution failed: ${errorMessage}`, {
            code: errorCode,
            ...(error instanceof ExecutionError ? error.details : {})
        });

        updateFlowNode(flow, 'result', 'error');

        const result: ExecuteResult = {
            success: false,
            executionId,
            timestamp: Date.now(),
            action: {
                type: request.actionType,
                amount: request.amount,
                recipient: request.recipient,
            },
            policy: {} as ENSPolicy, // Empty policy if resolution failed
            error: errorMessage,
            logs,
        };

        addToHistory(result);
        emitEvent({ type: 'error', executionId, data: result, timestamp: Date.now() });

        return result;
    }
}

// ================================
// Internal Execution Logic
// ================================

/**
 * Execute the actual action (internal implementation)
 * 
 * This is where the Arc/USDC integration would happen.
 * Currently returns a stub result.
 */
async function executeActionInternal(
    request: ExecuteRequest,
    policy: ENSPolicy,
    log: (level: LogEntry['level'], message: string, data?: Record<string, unknown>) => void
): Promise<Record<string, unknown>> {
    // For payment actions, use the Arc stub
    if (request.actionType === 'payment' && request.recipient) {
        log('debug', `Initiating payment via Arc module...`);

        const paymentResult = await sendPayment({
            amount: request.amount,
            recipient: request.recipient,
            memo: `Agent payment - ENS: ${policy.ensName}`,
        });

        return {
            transactionType: 'payment',
            ...paymentResult,
        };
    }

    // For other action types, return a stub result
    log('debug', `Executing stub action for type: ${request.actionType}`);

    return {
        transactionType: request.actionType,
        status: 'simulated',
        amount: request.amount,
        message: `Stub execution for ${request.actionType} - implement Arc/USDC integration here`,
    };
}

// ================================
// Action Flow Visualization
// ================================

/**
 * Initialize the action flow for React Flow visualization
 */
function initializeActionFlow(executionId: string): ActionFlow {
    const nodes: ActionFlowNode[] = [
        { id: 'ens-resolve', type: 'ens-resolve', label: 'Resolve ENS Policy', status: 'pending' },
        { id: 'policy-check', type: 'policy-check', label: 'Check Policy', status: 'pending' },
        { id: 'execute-action', type: 'execute-action', label: 'Execute Action', status: 'pending' },
        { id: 'proof-generate', type: 'proof-generate', label: 'Generate ZK Proof', status: 'pending' },
        { id: 'result', type: 'result', label: 'Result', status: 'pending' },
    ];

    const edges: ActionFlowEdge[] = [
        { id: 'e1', source: 'ens-resolve', target: 'policy-check' },
        { id: 'e2', source: 'policy-check', target: 'execute-action' },
        { id: 'e3', source: 'execute-action', target: 'proof-generate' },
        { id: 'e4', source: 'proof-generate', target: 'result' },
    ];

    return {
        executionId,
        nodes,
        edges,
        startTime: Date.now(),
    };
}

/**
 * Update a node in the action flow
 */
function updateFlowNode(
    flow: ActionFlow,
    nodeId: string,
    status: ActionFlowNode['status'],
    data?: Record<string, unknown>
): void {
    const node = flow.nodes.find(n => n.id === nodeId);
    if (node) {
        node.status = status;
        node.data = data;
        node.timestamp = Date.now();

        emitEvent({
            type: 'node-update',
            executionId: flow.executionId,
            data: { nodeId, status, data },
            timestamp: Date.now(),
        });
    }
}

// ================================
// History & Events
// ================================

/**
 * Add an execution result to history
 */
function addToHistory(result: ExecuteResult): void {
    executionHistory.unshift(result);

    // Trim history if needed
    if (executionHistory.length > MAX_HISTORY) {
        executionHistory.pop();
    }
}

/**
 * Get recent execution history
 */
export function getExecutionHistory(limit = 10): ExecuteResult[] {
    return executionHistory.slice(0, limit);
}

/**
 * Get a specific execution by ID
 */
export function getExecution(executionId: string): ExecuteResult | undefined {
    return executionHistory.find(e => e.executionId === executionId);
}

/**
 * Subscribe to execution events
 */
export function subscribeToEvents(listener: ExecutionEventListener): () => void {
    eventListeners.push(listener);

    // Return unsubscribe function
    return () => {
        const index = eventListeners.indexOf(listener);
        if (index > -1) {
            eventListeners.splice(index, 1);
        }
    };
}

/**
 * Emit an execution event to all subscribers
 */
function emitEvent(event: ExecutionEvent): void {
    for (const listener of eventListeners) {
        try {
            listener(event);
        } catch (error) {
            console.error('[Execute] Event listener error:', error);
        }
    }
}

// ================================
// Error Handling
// ================================

/**
 * Custom error for execution-related issues
 */
export class ExecutionError extends Error {
    constructor(
        message: string,
        public readonly code: string,
        public readonly details?: Record<string, unknown>
    ) {
        super(message);
        this.name = 'ExecutionError';
    }
}
