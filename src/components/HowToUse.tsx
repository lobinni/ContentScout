import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CONTRACT_ADDRESS, EXPLORER_URL, CHAIN_ID } from '../lib/genlayer';

const STEPS = [
  {
    num: '01',
    title: 'Install MetaMask',
    icon: '🦊',
    content: 'Install the MetaMask browser extension from metamask.io. This is your gateway to interact with the GenLayer blockchain.',
    detail: 'MetaMask will manage your wallet, sign transactions, and pay gas fees in GEN tokens.',
  },
  {
    num: '02',
    title: 'Connect Wallet',
    icon: '🔗',
    content: 'Click "CONNECT WALLET" in the header. MetaMask will prompt you to approve the connection and switch to GenLayer Studio network.',
    detail: `The DApp auto-adds GenLayer Studio (Chain ID: ${CHAIN_ID}) to MetaMask. You'll need GEN tokens for gas — get free tokens from the GenLayer faucet.`,
  },
  {
    num: '03',
    title: 'Submit Content',
    icon: '📝',
    content: 'Select a content type (Article, Essay, Code, Creative, Research), paste your text (minimum 50 characters), and optionally add a source URL.',
    detail: 'The source URL lets AI validators compare your content against the published version to verify authorship.',
  },
  {
    num: '04',
    title: 'AI Consensus Judgment',
    icon: '🤖',
    content: 'After submitting, MetaMask asks you to confirm the transaction. Then AI validators independently analyze your content and reach consensus.',
    detail: 'This takes 30 seconds to several minutes. Multiple AI validators on the GenLayer network each run independent LLM analysis, then vote on the result. No browser-based score is ever shown — you see ONLY the contract\'s finalized judgment.',
  },
  {
    num: '05',
    title: 'View Contract Judgment',
    icon: '📜',
    content: 'The finalized score (0-100), verdict (ORIGINAL/FLAGGED), AI reasoning, and similar sources are read directly from the on-chain contract.',
    detail: 'Score ≥ 40 = ORIGINAL (pass). Score < 40 = FLAGGED (fail). This is enforced fail-closed: the verdict is ALWAYS derived from the score, never from a separate is_original field that could be inconsistent.',
  },
  {
    num: '06',
    title: 'Appeal (Optional)',
    icon: '↻',
    content: 'If your content is FLAGGED and you believe it\'s a mistake, click "APPEAL" to request a fresh re-judgment by AI validators.',
    detail: 'Only the original author can appeal, and only once per submission. The appeal triggers a new on-chain AI consensus round with a fresh analysis.',
  },
];

export default function HowToUse({ onClose }: { onClose: () => void }) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.92, y: 30 }}
        transition={{ duration: 0.35 }}
        className="w-full max-w-2xl max-h-[90vh] rounded-2xl border border-white/[0.08] bg-[#0a0a0f] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06] bg-white/[0.02] shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">How to Use ContentScout</h2>
            <p className="text-[10px] font-mono text-white/25 mt-0.5">
              AI Content Originality Scanner on GenLayer Studio
            </p>
          </div>
          <button onClick={onClose} className="text-white/20 hover:text-white/50 transition-colors text-xl leading-none p-1">✕</button>
        </div>

        {/* Scrollable content */}
        <div className="overflow-y-auto custom-scrollbar flex-1 p-6 space-y-3">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.num}
              initial={{ opacity: 0, x: -15 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.06 }}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
            >
              <button
                onClick={() => setExpandedStep(expandedStep === i ? null : i)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-white/[0.02] transition-colors"
              >
                <span className="text-2xl">{step.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-cyan-400/50">STEP {step.num}</span>
                  </div>
                  <h3 className="text-sm font-bold text-white/80 mt-0.5">{step.title}</h3>
                  <p className="text-[11px] font-mono text-white/30 mt-1 leading-relaxed">{step.content}</p>
                </div>
                <span className={`text-white/15 text-xs transition-transform ${expandedStep === i ? 'rotate-180' : ''}`}>▼</span>
              </button>

              <AnimatePresence>
                {expandedStep === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 pb-4 pt-0 border-t border-white/[0.04]">
                      <div className="mt-3 rounded-lg bg-cyan-400/[0.03] border border-cyan-400/10 p-3">
                        <p className="text-[11px] font-mono text-cyan-400/50 leading-relaxed">{step.detail}</p>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}

          {/* Scoring table */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 mt-4">
            <h3 className="text-xs font-mono text-white/40 tracking-wider mb-3">SCORING SYSTEM</h3>
            <div className="space-y-2">
              {[
                { range: '70 – 100', label: 'ORIGINAL', color: 'text-cyan-400', bg: 'bg-cyan-400/10 border-cyan-400/20', desc: 'Strong evidence of originality' },
                { range: '40 – 69', label: 'BORDERLINE', color: 'text-yellow-400', bg: 'bg-yellow-400/10 border-yellow-400/20', desc: 'Passes but with common patterns' },
                { range: '0 – 39', label: 'FLAGGED', color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', desc: 'Significant unoriginality detected' },
              ].map(s => (
                <div key={s.range} className="flex items-center gap-3">
                  <span className="text-xs font-mono text-white/25 w-16">{s.range}</span>
                  <span className={`text-[9px] font-mono px-2 py-0.5 rounded border ${s.bg} ${s.color}`}>{s.label}</span>
                  <span className="text-[11px] font-mono text-white/20">{s.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Key principle */}
          <div className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.02] p-5">
            <h3 className="text-xs font-mono text-cyan-400/60 tracking-wider mb-2">⚡ KEY PRINCIPLE</h3>
            <p className="text-[11px] font-mono text-white/30 leading-relaxed">
              Every score, verdict, and reasoning you see comes <span className="text-cyan-400/60 font-bold">exclusively from the on-chain AI consensus</span>.
              The browser never computes a local score. The contract at{' '}
              <a href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer" className="text-cyan-400/40 hover:text-cyan-400/70 underline">
                {CONTRACT_ADDRESS.slice(0, 8)}...{CONTRACT_ADDRESS.slice(-6)}
              </a>
              {' '}is the single source of truth. Fail-closed: score {'<'} 40 = FLAGGED, always.
            </p>
          </div>

          {/* Links */}
          <div className="flex flex-wrap gap-2 pt-2">
            <a href="https://studio.genlayer.com" target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-mono px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-cyan-400/40 hover:text-cyan-400/70 hover:border-cyan-400/20 transition-all">
              GenLayer Studio ↗
            </a>
            <a href={`${EXPLORER_URL}/address/${CONTRACT_ADDRESS}`} target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-mono px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-cyan-400/40 hover:text-cyan-400/70 hover:border-cyan-400/20 transition-all">
              View Contract ↗
            </a>
            <a href="https://github.com/lobinni/ContentScout" target="_blank" rel="noopener noreferrer"
              className="text-[10px] font-mono px-3 py-1.5 rounded-lg border border-white/[0.06] bg-white/[0.02] text-cyan-400/40 hover:text-cyan-400/70 hover:border-cyan-400/20 transition-all">
              GitHub ↗
            </a>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
