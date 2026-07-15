import { motion } from 'framer-motion';
import { isMetaMaskAvailable, CHAIN_ID, CHAIN_NAME, getExplorerContractUrl, CONTRACT_ADDRESS } from '../lib/genlayer';

interface WalletModalProps {
  onClose: () => void;
  onConnect: () => void;
}

export default function WalletModal({ onClose, onConnect }: WalletModalProps) {
  const metaMaskAvailable = isMetaMaskAvailable();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md mx-4 rounded-2xl border border-white/[0.08] bg-[#0a0a0f] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className="flex justify-center mb-5">
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-cyan-400 to-fuchsia-500 opacity-20 blur-lg"></div>
            <div className="relative w-14 h-14 rounded-xl border border-cyan-400/30 bg-black/50 flex items-center justify-center">
              <svg className="w-7 h-7 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-6">
          <h2 className="text-lg font-bold text-white mb-1">Connect Wallet</h2>
          <p className="text-xs font-mono text-white/25">
            Sign transactions on GenLayer Studio
          </p>
        </div>

        {/* Network info */}
        <div className="rounded-lg border border-white/[0.04] bg-black/30 p-4 mb-5 space-y-2.5">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-white/20 uppercase">Network</span>
            <span className="text-white/40">{CHAIN_NAME}</span>
          </div>
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-white/20 uppercase">Chain ID</span>
            <span className="text-white/40">{CHAIN_ID}</span>
          </div>
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-white/20 uppercase">Token</span>
            <span className="text-white/40">GEN (Native)</span>
          </div>
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-white/20 uppercase">Contract</span>
            <span className="text-cyan-400/40">{CONTRACT_ADDRESS.slice(0, 8)}...{CONTRACT_ADDRESS.slice(-6)}</span>
          </div>
        </div>

        {/* Connect buttons */}
        <div className="space-y-3">
          {metaMaskAvailable ? (
            <button
              onClick={onConnect}
              className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 border border-cyan-400/30 text-cyan-400 font-mono text-sm tracking-wider hover:from-cyan-500/30 hover:to-fuchsia-500/30 hover:border-cyan-400/50 transition-all"
            >
              🦊 CONNECT WITH METAMASK
            </button>
          ) : (
            <a
              href="https://metamask.io/download/"
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full py-3 rounded-lg bg-gradient-to-r from-orange-500/20 to-orange-600/20 border border-orange-400/30 text-orange-400 font-mono text-sm tracking-wider text-center hover:from-orange-500/30 hover:to-orange-600/30 transition-all"
            >
              📥 INSTALL METAMASK
            </a>
          )}
        </div>

        {/* Contract link */}
        <div className="mt-4 text-center">
          <a
            href={getExplorerContractUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[10px] font-mono text-cyan-400/30 hover:text-cyan-400/60 transition-colors"
          >
            VIEW CONTRACT ON EXPLORER →
          </a>
        </div>

        {/* Info */}
        <div className="mt-4 rounded-lg border border-cyan-400/10 bg-cyan-400/[0.02] px-4 py-2.5">
          <p className="text-[10px] font-mono text-cyan-400/30 text-center leading-relaxed">
            GenLayer Studio provides free GEN for testing.
            MetaMask will prompt you to switch to the Studio network.
          </p>
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          className="w-full mt-4 py-2 text-xs font-mono text-white/15 hover:text-white/30 transition-colors"
        >
          CANCEL
        </button>
      </motion.div>
    </motion.div>
  );
}
