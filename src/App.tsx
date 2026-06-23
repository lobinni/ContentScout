import { useState, useEffect, useCallback } from 'react';
import { Toaster, toast } from 'sonner';
import { AnimatePresence } from 'framer-motion';

import Header from './components/Header';
import Stats from './components/Stats';
import SubmitForm from './components/SubmitForm';
import ResultCard from './components/ResultCard';
import SubmissionList from './components/SubmissionList';
import WalletModal from './components/WalletModal';
import RewardInfo from './components/RewardInfo';

import { useWallet } from './hooks/useWallet';
import { useContract } from './hooks/useContract';

import { Submission, ContractStats, AnalysisResult } from './types';
import * as genlayer from './lib/genlayer';

function App() {
  const { wallet, connect, disconnect, isMetaMaskAvailable } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);

  const { getAllSubmissions, getStats, submit, appeal, loadOnChainStats } = useContract();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState<ContractStats>({
    submission_count: 0,
    total_rewarded: 0,
    total_rejected: 0,
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  // Refresh local data
  const refreshData = useCallback(() => {
    setSubmissions(getAllSubmissions());
    setStats(getStats());
  }, [getAllSubmissions, getStats]);

  // Load on startup
  useEffect(() => {
    refreshData();

    // Try to load on-chain stats in background
    loadOnChainStats().then((onChainStats) => {
      if (onChainStats && onChainStats.submission_count > 0) {
        // Merge with local stats
        setStats(prev => ({
          submission_count: prev.submission_count + onChainStats.submission_count,
          total_rewarded: prev.total_rewarded + onChainStats.total_rewarded,
          total_rejected: prev.total_rejected + onChainStats.total_rejected,
        }));
      }
    });
  }, []);

  // Connect wallet
  const handleConnectWallet = async () => {
    try {
      await connect();
      setShowWalletModal(false);
      toast.success('Wallet connected to GenLayer Bradbury');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      toast.error(msg);
    }
  };

  const handleDisconnectWallet = () => {
    disconnect();
    toast.info('Wallet disconnected');
  };

  // ─── SUBMIT: Local-first, on-chain in background ─────────
  const handleSubmit = async (content: string, contentType: string, sourceUrl: string) => {
    if (!wallet.connected) {
      setShowWalletModal(true);
      return;
    }

    setIsSubmitting(true);
    setCurrentResult(null);

    try {
      // submitContent() returns IMMEDIATELY with local analysis
      const result = submit(content, contentType, sourceUrl);
      const { submission, analysis, onChainPromise } = result;

      // Build the analysis result with full metrics
      const analysisResult: AnalysisResult = {
        originality_score: analysis.originality_score,
        is_original: analysis.is_original,
        reasoning: analysis.reasoning,
        similar_sources: analysis.similar_sources,
        metrics: analysis.metrics,
        txStatus: submission.txStatus,
      };

      // SHOW RESULT IMMEDIATELY
      setCurrentResult(analysisResult);
      refreshData();

      // Toast with local result
      if (analysis.is_original) {
        toast.success(`✓ Original — Score: ${analysis.originality_score}/100`);
      } else {
        toast.warning(`✗ Flagged — Score: ${analysis.originality_score}/100`);
      }

      // If on-chain was attempted, wait for it in background
      if (onChainPromise) {
        toast.info('📡 Broadcasting to GenLayer...');

        onChainPromise.then((onChainResult) => {
          if (onChainResult) {
            // Update the result with tx info
            setCurrentResult(prev => prev ? {
              ...prev,
              txHash: onChainResult.txHash,
              txStatus: 'finalized',
              key: onChainResult.key,
            } : prev);

            refreshData();

            toast.success(
              <div>
                <div>⛓ Transaction finalized on-chain</div>
                <a
                  href={genlayer.getExplorerTxUrl(onChainResult.txHash)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-cyan-400 hover:underline"
                >
                  View on Explorer ↗
                </a>
              </div>
            );
          } else {
            setCurrentResult(prev => prev ? { ...prev, txStatus: 'failed' } : prev);
            toast.warning('On-chain tx failed — result saved locally');
          }
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Submission failed';
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── APPEAL ───────────────────────────────────────────────
  const handleAppeal = async (key: string) => {
    if (!wallet.connected) {
      setShowWalletModal(true);
      return;
    }

    try {
      const result = await appeal(key);
      if (result) {
        refreshData();
        toast.success(`Appeal processed — New score: ${result.originality_score}`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Appeal failed';
      toast.error(msg);
    }
  };

  return (
    <div className="min-h-screen bg-[#07070b] text-white scanlines">
      {/* Background layers */}
      <div className="fixed inset-0 grid-bg pointer-events-none"></div>
      <div className="fixed top-[-200px] left-[-200px] w-[600px] h-[600px] bg-cyan-500/[0.04] rounded-full blur-[150px] pointer-events-none"></div>
      <div className="fixed bottom-[-200px] right-[-200px] w-[600px] h-[600px] bg-fuchsia-500/[0.04] rounded-full blur-[150px] pointer-events-none"></div>
      <div className="noise-overlay"></div>

      <div className="relative z-10">
        <Header
          wallet={wallet}
          onConnectClick={() => setShowWalletModal(true)}
          onDisconnect={handleDisconnectWallet}
        />

        <main className="container mx-auto px-4 py-6 max-w-7xl">
          {/* Network Status Bar */}
          <div className="flex items-center justify-between mb-4 px-3 py-2 rounded-lg border border-white/[0.04] bg-white/[0.01]">
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <span className="flex items-center gap-1.5 text-cyan-400/70">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 pulse-dot"></span>
                {wallet.connected ? 'ON-CHAIN MODE' : 'LOCAL MODE'}
              </span>
              <span className="text-white/20">|</span>
              <span className="text-white/30">GenLayer Bradbury ({genlayer.CHAIN_ID})</span>
            </div>
            <div className="flex items-center gap-3 text-[10px] font-mono">
              <a
                href={genlayer.getFaucetUrl()}
                target="_blank"
                rel="noopener noreferrer"
                className="text-cyan-400/50 hover:text-cyan-400 transition-colors"
              >
                GET GEN TOKENS ↗
              </a>
            </div>
          </div>

          {/* Stats */}
          <Stats stats={stats} />

          {/* Main grid */}
          <div className="grid lg:grid-cols-5 gap-5 mt-6">
            {/* Left column */}
            <div className="lg:col-span-2 space-y-5">
              <SubmitForm
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting}
                walletConnected={wallet.connected}
              />

              <AnimatePresence mode="wait">
                {currentResult && <ResultCard result={currentResult} />}
              </AnimatePresence>

              {!currentResult && <RewardInfo />}
            </div>

            {/* Right column */}
            <div className="lg:col-span-3">
              <SubmissionList
                submissions={submissions}
                currentAddress={wallet.address}
                onAppeal={handleAppeal}
                onSelect={setSelectedSubmission}
                selectedKey={selectedSubmission?.key}
              />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="relative z-10 mt-12 border-t border-white/[0.04]">
          <div className="container mx-auto px-4 py-6 max-w-7xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-[10px] font-mono text-white/15 tracking-wider">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-1 h-1 rounded-full bg-cyan-400/50"></span>
                  POWERED BY GENLAYER
                </span>
                <span className="text-white/5">|</span>
                <span>HYBRID ON-CHAIN + LOCAL</span>
              </div>
              <div className="flex items-center gap-4">
                <a href={genlayer.getExplorerContractUrl()} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400/50 transition-colors">CONTRACT↗</a>
                <span className="text-white/5">|</span>
                <a href={genlayer.EXPLORER_URL} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400/50 transition-colors">EXPLORER↗</a>
                <span className="text-white/5">|</span>
                <a href={genlayer.getFaucetUrl()} target="_blank" rel="noopener noreferrer" className="hover:text-cyan-400/50 transition-colors">FAUCET↗</a>
              </div>
            </div>
          </div>
        </footer>
      </div>

      {/* Wallet Modal */}
      <AnimatePresence>
        {showWalletModal && (
          <WalletModal
            onConnect={handleConnectWallet}
            onClose={() => setShowWalletModal(false)}
            isMetaMaskAvailable={isMetaMaskAvailable()}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <Toaster
        position="bottom-right"
        theme="dark"
        toastOptions={{
          style: {
            background: '#0c0c12',
            border: '1px solid rgba(255,255,255,0.06)',
            color: 'rgba(255,255,255,0.7)',
            fontFamily: '"JetBrains Mono", monospace',
            fontSize: '12px',
          },
        }}
      />
    </div>
  );
}

export default App;
