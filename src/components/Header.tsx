import { motion } from 'framer-motion';
import { WalletState } from '../types';
import { formatAddress, CHAIN_ID } from '../lib/genlayer';

interface HeaderProps {
  wallet: WalletState;
  onConnectClick: () => void;
  onDisconnect: () => void;
}

export default function Header({ wallet, onConnectClick, onDisconnect }: HeaderProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-cyan-500/10 bg-black/70 backdrop-blur-xl">
      <div className="container mx-auto px-5 max-w-7xl">
        {/* Top micro-bar */}
        <div className="flex items-center justify-between py-1 border-b border-white/5 text-[10px] font-mono text-white/25 tracking-wider">
          <span>SYS.CONTENT_SCOUT v2.0</span>
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 pulse-dot"></span>
              NETWORK: BRADBURY ({CHAIN_ID})
            </span>
            <span>THRESHOLD: 40</span>
          </div>
        </div>

        {/* Main header */}
        <div className="flex items-center justify-between py-3">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-3"
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            {/* Logo mark */}
            <div className="relative w-9 h-9">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-cyan-400 to-magenta-500 opacity-20 blur-md"></div>
              <div className="relative w-9 h-9 rounded-lg border border-cyan-400/40 bg-black/50 flex items-center justify-center overflow-hidden">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4" />
                  <circle cx="12" cy="12" r="10" strokeLinecap="round" />
                </svg>
                {/* Corner accents */}
                <div className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-cyan-400/60"></div>
                <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-cyan-400/60"></div>
                <div className="absolute bottom-0 left-0 w-1.5 h-1.5 border-b border-l border-cyan-400/60"></div>
                <div className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-cyan-400/60"></div>
              </div>
            </div>

            <div>
              <h1 className="text-base font-bold tracking-tight text-white">
                Content<span className="text-cyan-400">Scout</span>
              </h1>
              <p className="text-[10px] font-mono text-white/30 tracking-widest uppercase">
                AI Content Scanner
              </p>
            </div>
          </motion.div>

          {/* Wallet */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            {wallet.connected ? (
              <div className="flex items-center gap-3">
                {/* Balance */}
                <div className="hidden sm:block text-right">
                  <div className="text-[10px] font-mono text-white/30 uppercase">Balance</div>
                  <div className="text-sm font-mono text-cyan-400 neon-cyan">{wallet.balance} GEN</div>
                </div>

                <button
                  onClick={onDisconnect}
                  className="group flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:border-red-400/30 hover:bg-red-400/5 transition-all duration-300"
                >
                  <span className="w-2 h-2 rounded-full bg-cyan-400 group-hover:bg-red-400 transition-colors"></span>
                  <span className="text-xs font-mono text-white/60 group-hover:text-red-400 transition-colors">
                    {formatAddress(wallet.address!)}
                  </span>
                </button>
              </div>
            ) : (
              <button
                onClick={onConnectClick}
                className="relative group px-4 py-2 rounded-lg overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-fuchsia-500/20 group-hover:from-cyan-500/30 group-hover:to-fuchsia-500/30 transition-all"></div>
                <div className="absolute inset-[1px] rounded-[7px] bg-black/80"></div>
                <div className="relative flex items-center gap-2 text-sm font-medium text-cyan-400 group-hover:text-cyan-300 transition-colors">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  <span className="hidden sm:inline font-mono text-xs tracking-wider">CONNECT</span>
                  <span className="sm:hidden font-mono text-xs">LINK</span>
                </div>
              </button>
            )}
          </motion.div>
        </div>
      </div>
    </header>
  );
}
