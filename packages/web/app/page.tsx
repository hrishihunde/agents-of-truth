'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { useRouter } from 'next/navigation';
import { getAllTasks, type Task } from '@/lib/tasks';
import {
  Brain,
  Shield,
  Zap,
  ArrowRight,
  Lock,
  FileText,
  Plane,
  CheckCircle2
} from 'lucide-react';

function TaskCard({ task, disabled }: { task: Task; disabled: boolean }) {
  const router = useRouter();

  return (
    <button
      onClick={() => !disabled && router.push(`/prompt?task=${task.id}`)}
      disabled={disabled}
      className={`group relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6 text-left transition-all duration-300 ${disabled
          ? 'cursor-not-allowed opacity-50'
          : 'hover:border-indigo-500/50 hover:bg-zinc-900 hover:shadow-lg hover:shadow-indigo-500/10'
        }`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 transition-opacity group-hover:opacity-100" />

      <div className="relative z-10">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-3xl">{task.icon}</span>
          {task.estimatedCost > 0 && (
            <span className="rounded-full bg-indigo-500/10 px-3 py-1 text-xs font-medium text-indigo-400">
              ~${task.estimatedCost.toFixed(2)} x402
            </span>
          )}
        </div>

        <h3 className="mb-2 text-lg font-semibold text-white">{task.name}</h3>
        <p className="mb-4 text-sm text-zinc-400 line-clamp-2">{task.description}</p>

        <div className="flex items-center justify-between">
          <span className="text-xs text-zinc-500">{task.estimatedTime}</span>
          <ArrowRight className={`h-4 w-4 transition-transform ${disabled ? 'text-zinc-600' : 'text-indigo-400 group-hover:translate-x-1'}`} />
        </div>
      </div>
    </button>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: typeof Brain; title: string; description: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 p-6">
      <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10">
        <Icon className="h-5 w-5 text-indigo-400" />
      </div>
      <h3 className="mb-2 font-semibold text-white">{title}</h3>
      <p className="text-sm text-zinc-400">{description}</p>
    </div>
  );
}

export default function LandingPage() {
  const { isConnected } = useAccount();
  const tasks = getAllTasks();

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-zinc-800/50 bg-black/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500">
              <Brain className="h-5 w-5 text-white" />
            </div>
            <span className="font-semibold">Agents of Truth</span>
          </div>
          <ConnectButton
            showBalance={false}
            chainStatus="none"
            accountStatus={{
              smallScreen: 'avatar',
              largeScreen: 'full',
            }}
          />
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/20 via-transparent to-transparent" />

        <div className="relative mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-sm text-indigo-300">
              <Lock className="h-4 w-4" />
              Policy-Governed Autonomous Agents
            </div>

            <h1 className="mb-6 text-5xl font-bold leading-tight tracking-tight md:text-6xl">
              Autonomous Agents,
              <br />
              <span className="bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
                Governed by Policy
              </span>
            </h1>

            <p className="mb-8 text-lg text-zinc-400 md:text-xl">
              Execute complex tasks through autonomous agents bound by ENS policies.
              <br className="hidden md:block" />
              Zero-knowledge proofs attest compliance. You sign intent, not transactions.
            </p>

            {!isConnected && (
              <div className="flex justify-center">
                <ConnectButton />
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Tasks Section */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">Select a Task</h2>
            <p className="text-zinc-400">
              {isConnected
                ? 'Choose a demo task to see the agent in action'
                : 'Connect your wallet to launch an agent'
              }
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {tasks.map((task) => (
              <TaskCard key={task.id} task={task} disabled={!isConnected} />
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="border-t border-zinc-800 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-12 text-center">
            <h2 className="mb-4 text-3xl font-bold">How It Works</h2>
            <p className="text-zinc-400">A new paradigm for agent authorization</p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            <FeatureCard
              icon={Shield}
              title="ENS Policy Governance"
              description="Agent behavior is defined by ENS text records. Policies specify spending limits, allowed actions, and compliance rules."
            />
            <FeatureCard
              icon={FileText}
              title="Intent Signing"
              description="You sign an intent message, not a transaction. The agent decides execution details within policy bounds."
            />
            <FeatureCard
              icon={Zap}
              title="Zero-Knowledge Proofs"
              description="Every action generates a ZK proof attesting policy compliance. Amount privacy with verifiable bounds."
            />
          </div>
        </div>
      </section>

      {/* Trust Model */}
      <section className="border-t border-zinc-800 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-3xl">
            <h2 className="mb-8 text-center text-3xl font-bold">The Trust Model</h2>

            <div className="space-y-6">
              <div className="flex items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-green-400" />
                <div>
                  <h3 className="mb-1 font-semibold text-white">Wallets Authorize Intent</h3>
                  <p className="text-sm text-zinc-400">Your wallet signs permission for a specific task. It never signs actual transactions or approves token transfers.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-green-400" />
                <div>
                  <h3 className="mb-1 font-semibold text-white">ENS Defines Limits</h3>
                  <p className="text-sm text-zinc-400">Policy constraints are stored on-chain in ENS text records. Whoever controls the ENS name controls the policy.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-green-400" />
                <div>
                  <h3 className="mb-1 font-semibold text-white">Agent Enforces Policy</h3>
                  <p className="text-sm text-zinc-400">The agent (OpenClaw) validates all actions against policy before execution. Violations are rejected.</p>
                </div>
              </div>

              <div className="flex items-start gap-4 rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
                <CheckCircle2 className="mt-1 h-5 w-5 shrink-0 text-green-400" />
                <div>
                  <h3 className="mb-1 font-semibold text-white">ZK Proves Compliance</h3>
                  <p className="text-sm text-zinc-400">Groth16 proofs attest that payments stayed within maxSpend without revealing exact amounts.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-800 py-8">
        <div className="mx-auto max-w-6xl px-6 text-center text-sm text-zinc-500">
          <p>Agents of Truth • Policy-Governed Autonomous Agents</p>
        </div>
      </footer>
    </div>
  );
}
