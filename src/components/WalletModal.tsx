import { motion } from 'framer-motion';
import { CHAIN_ID } from '../lib/genlayer';

interface WalletModalProps {
  onConnect: () => void;
  onClose: () => void;
}

export default function WalletModal({ onConnect, onClose }: WalletModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 30 }}
        transition={{ type: 'spring', duration: 0.5 }}
        className="relative w-full max-w-sm rounded-xl border border-white/[0.08] bg-[#0c0c12] overflow-hidden"
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/[0.06] bg-white/[0.02]">
          <span className="text-[10px] font-mono tracking-[0.2em] text-white/25">WALLET_AUTH</span>
          <button
            onClick={onClose}
            className="text-white/20 hover:text-white/50 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Icon */}
          <div className="flex justify-center">
            <div className="relative">
              <div className="absolute inset-0 rounded-xl bg-cyan-400/20 blur-xl"></div>
              <div className="relative w-14 h-14 rounded-xl border border-cyan-400/30 bg-black/50 flex items-center justify-center">
                <svg className="w-7 h-7 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-400/40"></div>
                <div className="absolute top-0 right-0 w-2 h-2 border-t border-r border-cyan-400/40"></div>
                <div className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-cyan-400/40"></div>
                <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-400/40"></div>
              </div>
            </div>
          </div>

          <div className="text-center">
            <h2 className="text-base font-mono font-bold text-white tracking-tight">
              Connect Wallet
            </h2>
            <p className="text-xs font-mono text-white/25 mt-1.5">
              Authenticate to submit content and earn rewards
            </p>
          </div>

          {/* Network info */}
          <div className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-white/25 tracking-wider">NETWORK</span>
              <span className="text-cyan-400/70">GenLayer Bradbury</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-white/25 tracking-wider">CHAIN_ID</span>
              <span className="text-fuchsia-400/70">{CHAIN_ID}</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-white/25 tracking-wider">TOKEN</span>
              <span className="text-lime-400/70">GEN</span>
            </div>
          </div>

          {/* Connect buttons */}
          <div className="space-y-2">
            {/* MetaMask */}
            <button
              onClick={onConnect}
              className="group w-full flex items-center gap-3 p-3 rounded-lg border border-white/[0.06] bg-white/[0.02] hover:border-cyan-400/20 hover:bg-cyan-400/[0.03] transition-all duration-300"
            >
              <div className="w-9 h-9 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-xl flex-shrink-0">
                🦊
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-mono text-white/70 group-hover:text-cyan-400 transition-colors">
                  MetaMask
                </div>
                <div className="text-[10px] font-mono text-white/20">Browser extension</div>
              </div>
              <svg className="w-4 h-4 text-white/10 group-hover:text-cyan-400/50 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>

            {/* WalletConnect */}
            <button
              disabled
              className="w-full flex items-center gap-3 p-3 rounded-lg border border-white/[0.04] bg-white/[0.01] opacity-40 cursor-not-allowed"
            >
              <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-xl flex-shrink-0">
                🔗
              </div>
              <div className="flex-1 text-left">
                <div className="text-sm font-mono text-white/40">WalletConnect</div>
                <div className="text-[10px] font-mono text-white/15">Coming soon</div>
              </div>
            </button>
          </div>

          <p className="text-center text-[10px] font-mono text-white/15 leading-relaxed">
            No real funds required for this demo.
            <br />
            <span className="text-cyan-400/30">Demo wallet auto-generated on connect.</span>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
