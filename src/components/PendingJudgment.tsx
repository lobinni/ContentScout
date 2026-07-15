import { motion } from 'framer-motion';

interface PendingJudgmentProps {
  phase: string;
}

const PHASE_LABELS: Record<string, { label: string; detail: string }> = {
  reading_state: {
    label: 'READING CONTRACT STATE',
    detail: 'Querying current submission count from the contract...',
  },
  submitting: {
    label: 'SUBMITTING TRANSACTION',
    detail: 'MetaMask will prompt for confirmation. Gas fee is paid in GEN tokens on GenLayer Studio.',
  },
  awaiting_consensus: {
    label: 'AI CONSENSUS IN PROGRESS',
    detail: 'Validators are independently analyzing your content with LLM judgment. This may take 30 seconds to several minutes.',
  },
  reading_result: {
    label: 'READING CONTRACT JUDGMENT',
    detail: 'Fetching the authoritative AI consensus result from the contract\'s get_submission() method...',
  },
};

export default function PendingJudgment({ phase }: PendingJudgmentProps) {
  const phaseInfo = PHASE_LABELS[phase] || PHASE_LABELS.awaiting_consensus;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="rounded-xl border border-cyan-400/10 bg-cyan-400/[0.02] overflow-hidden"
    >
      {/* Header */}
      <div className="px-5 py-2.5 border-b border-cyan-400/[0.06] bg-cyan-400/[0.02]">
        <span className="text-[9px] font-mono tracking-[0.2em] text-cyan-400/40">
          AWAITING CONTRACT JUDGMENT
        </span>
      </div>

      <div className="p-8 flex flex-col items-center justify-center text-center space-y-5">
        {/* Animated rings */}
        <div className="relative w-24 h-24">
          <motion.div
            className="absolute inset-0 rounded-full border border-cyan-400/20"
            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
            transition={{ rotate: { duration: 8, repeat: Infinity, ease: 'linear' }, scale: { duration: 2, repeat: Infinity } }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border border-fuchsia-400/20"
            animate={{ rotate: -360 }}
            transition={{ duration: 6, repeat: Infinity, ease: 'linear' }}
          />
          <motion.div
            className="absolute inset-4 rounded-full border border-cyan-400/30"
            animate={{ scale: [0.8, 1.2, 0.8] }}
            transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              className="w-4 h-4 rounded-full bg-cyan-400/40"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
        </div>

        {/* Phase label */}
        <div>
          <div className="text-[10px] font-mono tracking-[0.3em] text-cyan-400/60 mb-2">
            {phaseInfo.label}
          </div>
          <p className="text-xs font-mono text-white/25 max-w-sm">
            {phaseInfo.detail}
          </p>
        </div>

        {/* Progress bar */}
        <div className="w-64 h-1 bg-white/[0.04] rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-cyan-400/60 to-fuchsia-400/60 consensus-progress rounded-full" />
        </div>

        {/* Authority notice — CRITICAL: makes it clear no local result is shown */}
        <div className="rounded-lg border border-cyan-400/10 bg-black/30 px-4 py-3 max-w-md">
          <p className="text-[10px] font-mono text-white/25 leading-relaxed">
            ⏳ No result is displayed until the <span className="text-cyan-400/60 font-bold">contract's finalized on-chain judgment</span> is
            successfully read. The browser <span className="text-red-400/50 font-bold">never computes a local score</span> — every
            score, verdict, and reasoning comes exclusively from the contract's <code className="text-cyan-400/40">get_submission()</code> method.
          </p>
        </div>
      </div>
    </motion.div>
  );
}
