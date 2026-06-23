import { motion } from 'framer-motion';
import { CHAIN_ID, getFaucetUrl } from '../lib/genlayer';

interface WalletModalProps {
  onConnect: () => void;
  onClose: () => void;
  isMetaMaskAvailable: boolean;
}

export default function WalletModal({ onConnect, onClose, isMetaMaskAvailable }: WalletModalProps) {
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
              Sign transactions on GenLayer Bradbury
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
              <span className="text-lime-400/70">GEN (Native)</span>
            </div>
            <div className="flex justify-between text-[10px] font-mono">
              <span className="text-white/25 tracking-wider">TX_FEE</span>
              <span className="text-yellow-400/70">~0.001 GEN</span>
            </div>
          </div>

          {/* Connect buttons */}
          <div className="space-y-2">
            {/* MetaMask */}
            {isMetaMaskAvailable ? (
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
                  <div className="text-[10px] font-mono text-white/20">Sign real transactions</div>
                </div>
                <svg className="w-4 h-4 text-white/10 group-hover:text-cyan-400/50 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ) : (
              <div className="w-full p-4 rounded-lg border border-red-400/20 bg-red-400/5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">🦊</span>
                  <div>
                    <div className="text-sm font-mono text-red-400/80">MetaMask Not Found</div>
                    <div className="text-[10px] font-mono text-white/20">Required for on-chain transactions</div>
                  </div>
                </div>
                <a
                  href="https://metamask.io/download/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-2 rounded border border-orange-400/30 text-orange-400/80 text-xs font-mono hover:bg-orange-400/10 transition-colors"
                >
                  INSTALL METAMASK ↗
                </a>
              </div>
            )}
          </div>

          {/* Get tokens */}
          <div className="rounded-lg border border-lime-400/10 bg-lime-400/5 p-3">
            <div className="flex items-center gap-2 text-[10px] font-mono text-lime-400/60 mb-2">
              <span>💰</span>
              <span>Need GEN tokens?</span>
            </div>
            <a
              href={getFaucetUrl()}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center py-1.5 rounded border border-lime-400/20 text-lime-400/70 text-[11px] font-mono hover:bg-lime-400/10 transition-colors"
            >
              GET FREE TESTNET TOKENS ↗
            </a>
          </div>

          <p className="text-center text-[10px] font-mono text-white/15 leading-relaxed">
            Transactions require GEN for gas fees.
            <br />
            <span className="text-cyan-400/30">Network will auto-switch on connect.</span>
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
}
