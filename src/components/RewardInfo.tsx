import { motion } from 'framer-motion';
import { PLAGIARISM_THRESHOLD } from '../lib/genlayer';

export default function RewardInfo() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, delay: 0.3 }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
        <span className="text-[10px] font-mono tracking-[0.2em] text-white/25">REWARD_SYSTEM</span>
        <span className="text-[10px] font-mono text-lime-400/50 tracking-wider">OAT TOKEN</span>
      </div>

      <div className="p-5 space-y-4">
        {/* Flow diagram */}
        <div className="flex items-center gap-2 text-[10px] font-mono">
          <span className="px-2 py-1 rounded border border-cyan-400/20 bg-cyan-400/5 text-cyan-400/60">
            SUBMIT
          </span>
          <span className="text-white/15">→</span>
          <span className="px-2 py-1 rounded border border-fuchsia-400/20 bg-fuchsia-400/5 text-fuchsia-400/60">
            AI JUDGE
          </span>
          <span className="text-white/15">→</span>
          <span className="px-2 py-1 rounded border border-lime-400/20 bg-lime-400/5 text-lime-400/60">
            REWARD
          </span>
        </div>

        <p className="text-xs font-mono text-white/25 leading-relaxed">
          Original content with score ≥ {PLAGIARISM_THRESHOLD} earns OAT token rewards via RewardVault.sol
        </p>

        {/* Info grid */}
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3">
            <div className="text-[10px] font-mono text-white/15 tracking-wider mb-1">TOKEN</div>
            <div className="text-sm font-mono text-lime-400/70">OAT</div>
            <div className="text-[9px] font-mono text-white/15">ERC-20</div>
          </div>
          <div className="rounded-lg border border-white/[0.04] bg-white/[0.02] p-3">
            <div className="text-[10px] font-mono text-white/15 tracking-wider mb-1">THRESHOLD</div>
            <div className="text-sm font-mono text-cyan-400/70">≥ {PLAGIARISM_THRESHOLD}</div>
            <div className="text-[9px] font-mono text-white/15">score</div>
          </div>
        </div>

        {/* Note */}
        <div className="flex items-start gap-2 pt-2 border-t border-white/[0.04]">
          <span className="text-[10px] font-mono text-white/10 mt-0.5">ℹ</span>
          <span className="text-[10px] font-mono text-white/15 leading-relaxed">
            Demo mode — rewards are simulated. Production uses RewardVault.sol + resolver-gated claim.
          </span>
        </div>
      </div>
    </motion.div>
  );
}
