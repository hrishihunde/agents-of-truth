# Agents of Truth

A payments-first autonomous agent with ENS-derived policies and zero-knowledge proof verification.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (Next.js)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                  │
│  │ Dashboard │  │ Execute  │  │  Proofs  │                  │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘                  │
│       │             │             │                          │
│       └─────────────┼─────────────┘                          │
│                     │                                        │
└─────────────────────┼────────────────────────────────────────┘
                      │ REST API
┌─────────────────────┼────────────────────────────────────────┐
│              Agent Backend (Express + TypeScript)            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │   ENS    │  │ Execute  │  │    ZK    │  │   Arc    │     │
│  │ Resolver │  │  Logic   │  │  Prover  │  │  (stub)  │     │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────┘     │
│       │             │             │                          │
│       └─────────────┼─────────────┘                          │
│                     │                                        │
└─────────────────────┼────────────────────────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        │                           │
   ┌────┴────┐              ┌───────┴──────┐
   │   ENS   │              │   Circom     │
   │ Mainnet │              │   Circuit    │
   └─────────┘              └──────────────┘
```

## Features

- **ENS Policy Resolution**: Reads `agent.maxSpendUSDC`, `agent.allowedActions`, `agent.policyVersion` from ENS text records at runtime
- **ZK Proofs**: Generates Groth16 proofs that payment amount <= policy max using Poseidon commitments
- **React Flow Visualization**: Interactive node graph showing agent action flow
- **Real-time Logs**: SSE-based event streaming for live action monitoring
- **Arc/USDC Ready**: Stub module prepared for actual payment integration

## Quick Start

### Prerequisites

- Node.js 20+
- pnpm 8+
- (Optional) Circom 2.x for circuit compilation

### Installation

```bash
# Clone and install
cd agents-of-truth
pnpm install

# Copy environment files
cp packages/agent/.env.example packages/agent/.env
```

### Development

```bash
# Terminal 1: Start agent backend
cd packages/agent
pnpm dev

# Terminal 2: Start frontend
cd packages/web
pnpm dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:3001

### Testing with Mock Data

The frontend and backend support mock mode for testing without real ENS:

1. Check "Use mock mode" in the UI
2. Add `?mock=true` to API requests

## Project Structure

```
agents-of-truth/
├── packages/
│   ├── agent/                 # Backend
│   │   ├── src/
│   │   │   ├── index.ts       # Express server
│   │   │   ├── ens.ts         # ENS resolution
│   │   │   ├── execute.ts     # Action execution
│   │   │   ├── arc.ts         # USDC payments (stub)
│   │   │   ├── types.ts       # TypeScript types
│   │   │   └── zk/
│   │   │       ├── circuit.circom  # Policy compliance circuit
│   │   │       ├── prove.ts   # Proof generation
│   │   │       ├── verify.ts  # Proof verification
│   │   │       └── setup.sh   # Circuit compilation
│   │   ├── Dockerfile
│   │   └── openclaw.config.json
│   │
│   └── web/                   # Frontend
│       ├── app/
│       │   ├── page.tsx       # Dashboard
│       │   ├── execute/       # Execute action page
│       │   └── proof/         # Proof verification page
│       └── src/
│           ├── components/    # React components
│           └── lib/           # API client, ENS hooks
│
├── infra/
│   ├── nginx.conf             # NGINX reverse proxy
│   └── agent.service          # Systemd service
│
├── docker-compose.yml
└── pnpm-workspace.yaml
```

## ENS Text Records

Set these text records on your ENS name:

| Key                    | Example            | Description             |
| ---------------------- | ------------------ | ----------------------- |
| `agent.maxSpendUSDC`   | `100`              | Maximum USDC per action |
| `agent.allowedActions` | `payment,transfer` | Comma-separated actions |
| `agent.policyVersion`  | `1.0`              | Policy schema version   |

## ZK Circuit Setup

```bash
cd packages/agent/src/zk

# Install circom if needed
# See: https://docs.circom.io/getting-started/installation/

# Compile circuit and run trusted setup
bash setup.sh
```

This generates:
- `circuit_js/circuit.wasm` - WASM for proof generation
- `circuit_final.zkey` - Proving key
- `verification_key.json` - Verification key
- `verifier.sol` - Solidity verifier (for on-chain)

## API Endpoints

| Method | Path               | Description       |
| ------ | ------------------ | ----------------- |
| GET    | `/health`          | Health check      |
| GET    | `/policy/:ensName` | Get ENS policy    |
| POST   | `/execute`         | Execute action    |
| POST   | `/proof`           | Generate ZK proof |
| POST   | `/verify`          | Verify ZK proof   |
| GET    | `/history`         | Execution history |
| GET    | `/events`          | SSE event stream  |

## Cloud Deployment (AWS EC2)

### 1. Launch EC2 Instance

```bash
# Ubuntu 22.04, t3.medium or larger
# Open ports: 22 (SSH), 80, 443
```

### 2. Install Dependencies

```bash
sudo apt update
sudo apt install -y nodejs npm nginx certbot python3-certbot-nginx

# Install pnpm
corepack enable
corepack prepare pnpm@latest --activate

# Install circom (optional, for circuit compilation)
curl --proto '=https' --tlsv1.2 https://sh.rustup.rs -sSf | sh
git clone https://github.com/iden3/circom.git
cd circom && cargo build --release
cargo install --path circom
```

### 3. Deploy Application

```bash
# Clone repository
git clone <repo-url> /opt/payments-agent
cd /opt/payments-agent

# Install and build
pnpm install
cd packages/agent && pnpm build
cd ../web && pnpm build
```

### 4. Configure Systemd

```bash
# Create user
sudo useradd -r -s /bin/false payments-agent

# Copy and enable service
sudo cp infra/agent.service /etc/systemd/system/payments-agent.service
sudo systemctl daemon-reload
sudo systemctl enable payments-agent
sudo systemctl start payments-agent
```

### 5. Configure NGINX

```bash
# Update domain in nginx.conf
sudo cp infra/nginx.conf /etc/nginx/sites-available/payments-agent
sudo ln -s /etc/nginx/sites-available/payments-agent /etc/nginx/sites-enabled/

# Get SSL certificate
sudo certbot --nginx -d your-domain.com

# Test and reload
sudo nginx -t
sudo systemctl reload nginx
```

### 6. Docker Deployment (Alternative)

```bash
docker-compose up -d --build
```

## Adding Arc/USDC Payments

To implement actual payments, edit `packages/agent/src/arc.ts`:

```typescript
import { Arc } from '@arc/sdk';  // hypothetical

export async function sendPayment(request: PaymentRequest): Promise<PaymentResult> {
  const arc = new Arc({ apiKey: process.env.ARC_API_KEY });
  
  const tx = await arc.transfer({
    token: 'USDC',
    amount: request.amount,
    to: request.recipient,
  });
  
  return {
    success: true,
    transactionHash: tx.hash,
    status: 'confirmed',
    // ...
  };
}
```

## Demo Scenario

1. **Enter ENS name** on dashboard (e.g., `payments-agent.eth`)
2. **View policy** resolved from ENS text records
3. **Click Execute** → Navigate to execute page
4. **Configure action**: Select type, enter amount, recipient
5. **Execute** → Agent validates against ENS policy
6. **View result** with:
   - Policy enforcement details
   - ZK proof of compliance
   - Execution logs
7. **Verify proof** on the Proofs page

## License

MIT