/**
 * @fileoverview Agent Backend Server (Express)
 * 
 * REST API endpoints:
 * - GET  /health         - Health check
 * - GET  /policy/:ensName - Get ENS-derived policy
 * - POST /execute        - Execute a paid action
 * - POST /proof          - Generate a zk proof
 * - GET  /history        - Get execution history
 * - GET  /execution/:id  - Get specific execution
 * - WS   /events         - Real-time event stream (SSE)
 * 
 * All policy values are derived from ENS at runtime.
 */

import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { resolveENSPolicy, createMockPolicy } from './ens.js';
import { executeAction, getExecutionHistory, getExecution, subscribeToEvents } from './execute.js';
import { generateProof } from './zk/prove.js';
import { verifyProof } from './zk/verify.js';
import type { ExecuteRequest, ProofRequest, HealthResponse, ZKProof } from './types.js';

// ================================
// Configuration
// ================================

const PORT = parseInt(process.env.PORT || '3001', 10);
const VERSION = '1.0.0';
const startTime = Date.now();

// ================================
// Express Setup
// ================================

const app = express();

// Middleware
app.use(cors({
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Request logging middleware
app.use((req: Request, _res: Response, next: NextFunction) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ================================
// Health Endpoint
// ================================

/**
 * GET /health
 * Returns the health status of the agent
 */
app.get('/health', (_req: Request, res: Response) => {
    const response: HealthResponse = {
        status: 'healthy',
        version: VERSION,
        uptime: Date.now() - startTime,
        timestamp: Date.now(),
    };

    res.json(response);
});

// ================================
// Policy Endpoint
// ================================

/**
 * GET /policy/:ensName
 * Resolve ENS name and return policy
 */
app.get('/policy/:ensName', async (req: Request, res: Response) => {
    try {
        const { ensName } = req.params;
        const useMock = req.query.mock === 'true';

        console.log(`[Policy] Resolving policy for: ${ensName} (mock: ${useMock})`);

        let policy;
        if (useMock) {
            // Use mock policy for testing without ENS
            policy = createMockPolicy(ensName);
        } else {
            policy = await resolveENSPolicy(ensName);
        }

        res.json({
            success: true,
            data: policy,
        });
    } catch (error) {
        console.error('[Policy] Error:', error);
        res.status(400).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            code: 'POLICY_ERROR',
        });
    }
});

// ================================
// Execute Endpoint
// ================================

/**
 * POST /execute
 * Execute a paid action with ENS policy enforcement
 * 
 * Request body:
 * {
 *   "ensName": "payments-agent.eth",
 *   "actionType": "payment",
 *   "amount": 50,
 *   "recipient": "0x..."
 * }
 */
app.post('/execute', async (req: Request, res: Response) => {
    try {
        const request = req.body as ExecuteRequest;

        // Basic validation
        if (!request.ensName) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: ensName',
                code: 'VALIDATION_ERROR',
            });
        }

        if (!request.actionType) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: actionType',
                code: 'VALIDATION_ERROR',
            });
        }

        if (typeof request.amount !== 'number' || request.amount < 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid amount: must be a non-negative number',
                code: 'VALIDATION_ERROR',
            });
        }

        console.log(`[Execute] Request:`, request);

        // Check if using mock mode
        const useMock = req.query.mock === 'true';

        // Execute the action
        const result = await executeAction({
            ...request,
            // If mock mode, we'll handle it in executeAction
        });

        res.json({
            success: result.success,
            data: result,
        });
    } catch (error) {
        console.error('[Execute] Error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            code: 'EXECUTION_ERROR',
        });
    }
});

// ================================
// Proof Endpoints
// ================================

/**
 * POST /proof
 * Generate a zk proof of policy compliance
 * 
 * Request body:
 * {
 *   "amount": 50,
 *   "ensName": "payments-agent.eth"
 * }
 */
app.post('/proof', async (req: Request, res: Response) => {
    try {
        const request = req.body as ProofRequest;

        // Validation
        if (typeof request.amount !== 'number' || request.amount < 0) {
            return res.status(400).json({
                success: false,
                error: 'Invalid amount: must be a non-negative number',
                code: 'VALIDATION_ERROR',
            });
        }

        if (!request.ensName) {
            return res.status(400).json({
                success: false,
                error: 'Missing required field: ensName',
                code: 'VALIDATION_ERROR',
            });
        }

        console.log(`[Proof] Generating proof:`, request);

        // Get policy
        const useMock = req.query.mock === 'true';
        const policy = useMock
            ? createMockPolicy(request.ensName)
            : await resolveENSPolicy(request.ensName);

        // Check amount against policy
        if (request.amount > policy.maxSpendUSDC) {
            return res.status(400).json({
                success: false,
                error: `Amount ${request.amount} exceeds policy limit ${policy.maxSpendUSDC}`,
                code: 'POLICY_VIOLATION',
            });
        }

        // Generate proof
        const proof = await generateProof({
            amount: request.amount,
            maxSpend: policy.maxSpendUSDC,
            policyHash: policy.policyHash,
        });

        res.json({
            success: true,
            data: {
                proof,
                policy: {
                    ensName: policy.ensName,
                    maxSpendUSDC: policy.maxSpendUSDC,
                    policyHash: policy.policyHash,
                },
            },
        });
    } catch (error) {
        console.error('[Proof] Error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            code: 'PROOF_ERROR',
        });
    }
});

/**
 * POST /verify
 * Verify a zk proof
 */
app.post('/verify', async (req: Request, res: Response) => {
    try {
        const proof = req.body as ZKProof;

        if (!proof || !proof.proof || !proof.publicSignals) {
            return res.status(400).json({
                success: false,
                error: 'Invalid proof format',
                code: 'VALIDATION_ERROR',
            });
        }

        console.log(`[Verify] Verifying proof...`);

        const result = await verifyProof(proof);

        res.json({
            success: true,
            data: result,
        });
    } catch (error) {
        console.error('[Verify] Error:', error);
        res.status(500).json({
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            code: 'VERIFY_ERROR',
        });
    }
});

// ================================
// History Endpoints
// ================================

/**
 * GET /history
 * Get recent execution history
 */
app.get('/history', (req: Request, res: Response) => {
    const limit = parseInt(req.query.limit as string, 10) || 10;
    const history = getExecutionHistory(limit);

    res.json({
        success: true,
        data: history,
        count: history.length,
    });
});

/**
 * GET /execution/:id
 * Get a specific execution by ID
 */
app.get('/execution/:id', (req: Request, res: Response) => {
    const { id } = req.params;
    const execution = getExecution(id);

    if (!execution) {
        return res.status(404).json({
            success: false,
            error: 'Execution not found',
            code: 'NOT_FOUND',
        });
    }

    res.json({
        success: true,
        data: execution,
    });
});

// ================================
// Server-Sent Events (Real-time logs)
// ================================

/**
 * GET /events
 * SSE endpoint for real-time execution events
 */
app.get('/events', (req: Request, res: Response) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    console.log('[SSE] Client connected');

    // Send initial connection event
    res.write(`data: ${JSON.stringify({ type: 'connected', timestamp: Date.now() })}\n\n`);

    // Subscribe to execution events
    const unsubscribe = subscribeToEvents((event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
    });

    // Clean up on disconnect
    req.on('close', () => {
        console.log('[SSE] Client disconnected');
        unsubscribe();
    });
});

// ================================
// Error Handler
// ================================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[Error]', err);
    res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'INTERNAL_ERROR',
    });
});

// ================================
// Start Server
// ================================

app.listen(PORT, () => {
    console.log('═'.repeat(50));
    console.log(`🤖 Payments Agent v${VERSION}`);
    console.log('═'.repeat(50));
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log('');
    console.log('Endpoints:');
    console.log(`  GET  /health          - Health check`);
    console.log(`  GET  /policy/:ensName - Get ENS policy`);
    console.log(`  POST /execute         - Execute action`);
    console.log(`  POST /proof           - Generate zk proof`);
    console.log(`  POST /verify          - Verify zk proof`);
    console.log(`  GET  /history         - Execution history`);
    console.log(`  GET  /execution/:id   - Get execution`);
    console.log(`  GET  /events          - SSE event stream`);
    console.log('');
    console.log('Configuration:');
    console.log(`  RPC: ${process.env.ETH_RPC_URL || 'https://eth.llamarpc.com'}`);
    console.log('═'.repeat(50));
});

export { app };
