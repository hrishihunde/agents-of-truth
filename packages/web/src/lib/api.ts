/**
 * @fileoverview API Client for Agent Backend
 * 
 * This module provides typed functions for communicating with the
 * payments agent backend API.
 */

// ================================
// Configuration
// ================================

const AGENT_URL = process.env.NEXT_PUBLIC_AGENT_URL || 'http://localhost:3001';

// ================================
// Types
// ================================

export interface ENSPolicy {
    ensName: string;
    maxSpendUSDC: number;
    allowedActions: string[];
    policyVersion: string;
    fetchedAt: number;
    policyHash: string;
}

export interface ExecuteRequest {
    ensName: string;
    actionType: string;
    amount: number;
    recipient?: string;
}

export interface ExecuteResult {
    success: boolean;
    executionId: string;
    timestamp: number;
    action: {
        type: string;
        amount: number;
        recipient?: string;
    };
    policy: ENSPolicy;
    proof?: ZKProof;
    error?: string;
    logs: LogEntry[];
}

export interface LogEntry {
    timestamp: number;
    level: 'debug' | 'info' | 'warn' | 'error';
    message: string;
    data?: Record<string, unknown>;
}

export interface ZKProof {
    proof: {
        pi_a: string[];
        pi_b: string[][];
        pi_c: string[];
        protocol: string;
        curve: string;
    };
    publicSignals: string[];
    commitment: string;
    verified: boolean;
    generatedAt: number;
}

export interface VerifyResult {
    valid: boolean;
    error?: string;
}

export interface HealthResponse {
    status: 'healthy' | 'degraded' | 'unhealthy';
    version: string;
    uptime: number;
    timestamp: number;
}

export interface APIResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
    code?: string;
}

// ================================
// API Functions
// ================================

/**
 * Check agent health status
 */
export async function getHealth(): Promise<HealthResponse> {
    const res = await fetch(`${AGENT_URL}/health`);
    if (!res.ok) throw new Error('Failed to fetch health');
    return res.json();
}

/**
 * Get ENS policy for an ENS name
 */
export async function getPolicy(ensName: string, useMock = false): Promise<ENSPolicy> {
    const url = new URL(`${AGENT_URL}/policy/${encodeURIComponent(ensName)}`);
    if (useMock) url.searchParams.set('mock', 'true');

    const res = await fetch(url.toString());
    const data: APIResponse<ENSPolicy> = await res.json();

    if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to fetch policy');
    }

    return data.data;
}

/**
 * Execute a paid action
 */
export async function executeAction(request: ExecuteRequest, useMock = false): Promise<ExecuteResult> {
    const url = new URL(`${AGENT_URL}/execute`);
    if (useMock) url.searchParams.set('mock', 'true');

    const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
    });

    const data: APIResponse<ExecuteResult> = await res.json();

    if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to execute action');
    }

    return data.data;
}

/**
 * Generate a zk proof
 */
export async function generateProof(
    amount: number,
    ensName: string,
    useMock = false
): Promise<{ proof: ZKProof; policy: Partial<ENSPolicy> }> {
    const url = new URL(`${AGENT_URL}/proof`);
    if (useMock) url.searchParams.set('mock', 'true');

    const res = await fetch(url.toString(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount, ensName }),
    });

    const data: APIResponse<{ proof: ZKProof; policy: Partial<ENSPolicy> }> = await res.json();

    if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to generate proof');
    }

    return data.data;
}

/**
 * Verify a zk proof
 */
export async function verifyProof(proof: ZKProof): Promise<VerifyResult> {
    const res = await fetch(`${AGENT_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(proof),
    });

    const data: APIResponse<VerifyResult> = await res.json();

    if (!data.success || !data.data) {
        throw new Error(data.error || 'Failed to verify proof');
    }

    return data.data;
}

/**
 * Get execution history
 */
export async function getHistory(limit = 10): Promise<ExecuteResult[]> {
    const res = await fetch(`${AGENT_URL}/history?limit=${limit}`);
    const data: APIResponse<ExecuteResult[]> & { data: ExecuteResult[] } = await res.json();

    if (!data.success) {
        throw new Error(data.error || 'Failed to fetch history');
    }

    return data.data || [];
}

/**
 * Get a specific execution by ID
 */
export async function getExecution(executionId: string): Promise<ExecuteResult> {
    const res = await fetch(`${AGENT_URL}/execution/${executionId}`);
    const data: APIResponse<ExecuteResult> = await res.json();

    if (!data.success || !data.data) {
        throw new Error(data.error || 'Execution not found');
    }

    return data.data;
}

// ================================
// SSE Event Stream
// ================================

export interface ExecutionEvent {
    type: 'log' | 'node-update' | 'complete' | 'error' | 'connected';
    executionId?: string;
    data: unknown;
    timestamp: number;
}

/**
 * Subscribe to real-time execution events via SSE
 */
export function subscribeToEvents(
    onEvent: (event: ExecutionEvent) => void,
    onError?: (error: Error) => void
): () => void {
    const eventSource = new EventSource(`${AGENT_URL}/events`);

    eventSource.onmessage = (event) => {
        try {
            const data = JSON.parse(event.data) as ExecutionEvent;
            onEvent(data);
        } catch (error) {
            console.error('Failed to parse SSE event:', error);
        }
    };

    eventSource.onerror = (error) => {
        console.error('SSE error:', error);
        if (onError) onError(new Error('SSE connection error'));
    };

    // Return cleanup function
    return () => {
        eventSource.close();
    };
}
