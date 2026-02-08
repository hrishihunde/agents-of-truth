/**
 * @fileoverview Shared TypeScript types for the Payments Agent
 * 
 * These types define the core data structures used across ENS policies,
 * agent actions, and zk proofs.
 */

// ================================
// ENS Policy Types
// ================================

/**
 * Policy derived from ENS text records
 * These values are read dynamically from the ENS name at runtime
 */
export interface ENSPolicy {
    /** ENS name this policy was resolved from */
    ensName: string;

    /** Maximum spend limit in USDC (from agent.maxSpendUSDC) */
    maxSpendUSDC: number;

    /** Comma-separated list of allowed actions (from agent.allowedActions) */
    allowedActions: string[];

    /** Version of the policy schema (from agent.policyVersion) */
    policyVersion: string;

    /** Timestamp when this policy was fetched */
    fetchedAt: number;

    /** Hash of the policy for zk proofs */
    policyHash: string;
}

/**
 * Raw text records from ENS
 */
export interface ENSTextRecords {
    'agent.maxSpendUSDC'?: string;
    'agent.allowedActions'?: string;
    'agent.policyVersion'?: string;
    [key: string]: string | undefined;
}

// ================================
// Action Types
// ================================

/**
 * Supported action types that the agent can execute
 */
export type ActionType =
    | 'payment'      // Send USDC payment
    | 'swap'         // Swap tokens
    | 'stake'        // Stake tokens
    | 'bridge'       // Bridge tokens cross-chain
    | 'transfer';    // Generic transfer

/**
 * Request to execute an agent action
 */
export interface ExecuteRequest {
    /** ENS name to resolve policy from */
    ensName: string;

    /** Type of action to execute */
    actionType: ActionType;

    /** Amount in USDC for the action */
    amount: number;

    /** Recipient address (for payments/transfers) */
    recipient?: string;

    /** Additional action-specific parameters */
    params?: Record<string, unknown>;
}

/**
 * Result of an agent action execution
 */
export interface ExecuteResult {
    /** Whether the action was successful */
    success: boolean;

    /** Unique identifier for this execution */
    executionId: string;

    /** Timestamp of execution */
    timestamp: number;

    /** The action that was executed */
    action: {
        type: ActionType;
        amount: number;
        recipient?: string;
    };

    /** Policy that was enforced */
    policy: ENSPolicy;

    /** zk proof of policy compliance (if generated) */
    proof?: ZKProof;

    /** Error message if execution failed */
    error?: string;

    /** Log messages from execution */
    logs: LogEntry[];
}

// ================================
// ZK Proof Types
// ================================

/**
 * zk-SNARK proof of policy compliance
 */
export interface ZKProof {
    /** Proof data (Groth16 format) */
    proof: {
        pi_a: string[];
        pi_b: string[][];
        pi_c: string[];
        protocol: string;
        curve: string;
    };

    /** Public signals from the proof */
    publicSignals: string[];

    /** Commitment hash: Poseidon(amount, policyHash) */
    commitment: string;

    /** Whether the proof has been verified */
    verified: boolean;

    /** Timestamp of proof generation */
    generatedAt: number;
}

/**
 * Inputs for generating a zk proof
 */
export interface ProofInputs {
    /** Amount being spent */
    amount: number;

    /** Maximum allowed by policy */
    maxSpend: number;

    /** Hash of the ENS policy */
    policyHash: string;
}

/**
 * Request to generate a proof
 */
export interface ProofRequest {
    /** Amount to prove */
    amount: number;

    /** ENS name to get policy from */
    ensName: string;
}

/**
 * Verification result
 */
export interface VerifyResult {
    /** Whether the proof is valid */
    valid: boolean;

    /** Error message if verification failed */
    error?: string;
}

// ================================
// Logging Types
// ================================

/**
 * Log level for agent operations
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * A single log entry from agent execution
 */
export interface LogEntry {
    /** Timestamp of the log */
    timestamp: number;

    /** Log level */
    level: LogLevel;

    /** Log message */
    message: string;

    /** Additional data */
    data?: Record<string, unknown>;
}

// ================================
// API Response Types
// ================================

/**
 * Health check response
 */
export interface HealthResponse {
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    uptime: number;
    timestamp: number;
}

/**
 * Generic API error response
 */
export interface APIError {
    error: string;
    code: string;
    details?: Record<string, unknown>;
}

// ================================
// React Flow Visualization Types
// ================================

/**
 * Node types for React Flow visualization
 */
export type FlowNodeType =
    | 'ens-resolve'
    | 'policy-check'
    | 'execute-action'
    | 'proof-generate'
    | 'result';

/**
 * A node in the action flow visualization
 */
export interface ActionFlowNode {
    id: string;
    type: FlowNodeType;
    label: string;
    status: 'pending' | 'running' | 'success' | 'error';
    data?: Record<string, unknown>;
    timestamp?: number;
}

/**
 * Edge connecting flow nodes
 */
export interface ActionFlowEdge {
    id: string;
    source: string;
    target: string;
    animated?: boolean;
}

/**
 * Complete action flow for visualization
 */
export interface ActionFlow {
    executionId: string;
    nodes: ActionFlowNode[];
    edges: ActionFlowEdge[];
    startTime: number;
    endTime?: number;
}
