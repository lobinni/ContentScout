import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Toaster, toast } from 'sonner';

import Header from './components/Header';
import SubmitForm from './components/SubmitForm';
import AnalysisResultPanel from './components/AnalysisResult';
import PendingJudgment from './components/PendingJudgment';
import SubmissionList from './components/SubmissionList';
import StatsBar from './components/StatsBar';
import WalletModal from './components/WalletModal';
import HowToUse from './components/HowToUse';

import {
  connectWallet,
  disconnectWallet,
  getBalance,
  submitContent,
  appealSubmission,
  loadOnChainStats,
  getSubmissionKeys,
  loadRecentSubmissionKeys,
  readSubmissionFromContract,
  validateSubmission,
} from './lib/genlayer';

import type {
  WalletState,
  ContractStats,
  AnalysisResult,
  SubmissionPhase,
  Submission,
} from './types';

function App() {
  const [wallet, setWallet] = useState<WalletState>({
    connected: false, address: null, balance: '0',
  });

  const [stats, setStats] = useState<ContractStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [submissionPhase, setSubmissionPhase] = useState<SubmissionPhase>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAppealing, setIsAppealing] = useState(false);

  const [submissionKeys, setSubmissionKeys] = useState<string[]>([]);

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showHowToUse, setShowHowToUse] = useState(false);

  // ─── LOAD STATS FROM CONTRACT ───────────────────────────
  const refreshStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const onChainStats = await loadOnChainStats();
      setStats(onChainStats);
    } catch {
      setStats({ submission_count: 0, total_rewarded: 0, total_rejected: 0 });
    } finally {
      setStatsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshStats();
    loadRecentSubmissionKeys(20).then(keys => {
      setSubmissionKeys(keys);
    });
  }, [refreshStats]);

  // ─── WALLET ─────────────────────────────────────────────
  const handleConnectWallet = async () => {
    try {
      const address = await connectWallet();
      const balance = await getBalance();
      setWallet({ connected: true, address, balance });
      setShowWalletModal(false);
      toast.success('Wallet connected to GenLayer Studio');
      refreshStats();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection failed';
      toast.error(msg);
    }
  };

  const handleDisconnectWallet = () => {
    disconnectWallet();
    setWallet({ connected: false, address: null, balance: '0' });
    toast.info('Wallet disconnected');
  };

  // ─── SUBMIT — CONTRACT-AUTHORITATIVE ────────────────────
  const handleSubmit = async (content: string, contentType: string, sourceUrl: string) => {
    if (!wallet.connected) { setShowWalletModal(true); return; }

    setIsSubmitting(true);
    setCurrentResult(null);
    setSubmissionPhase('submitting');

    try {
      // 1. Sends tx → MetaMask shows gas
      // 2. Waits for FINALIZED consensus (AI validators)
      // 3. Reads get_submission() from contract
      // 4. Returns ONLY the contract's judgment
      // NO LOCAL HEURISTIC IS USED AT ANY POINT
      const result = await submitContent(
        content, contentType, sourceUrl,
        (phase) => setSubmissionPhase(phase as SubmissionPhase),
      );

      setCurrentResult(result);
      setSubmissionPhase('complete');
      refreshStats();
      setSubmissionKeys(getSubmissionKeys());

      if (result.authority === 'contract') {
        if (result.is_original) {
          toast.success(`✓ Contract Judgment: ORIGINAL — Score: ${result.originality_score}/100`);
        } else {
          toast.warning(`✗ Contract Judgment: FLAGGED — Score: ${result.originality_score}/100`);
        }
        if (result.validationWarnings && result.validationWarnings.length > 0) {
          toast.warning(`⚠ ${result.validationWarnings.length} validation warning(s) — see result panel`);
        }
      } else {
        toast.error('Failed to read contract result — no local substitute available. Check explorer.');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Submission failed';
      toast.error(msg);
      setSubmissionPhase('failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─── APPEAL — CONTRACT-AUTHORITATIVE ────────────────────
  const handleAppeal = async (key: string) => {
    if (!wallet.connected) { setShowWalletModal(true); return; }

    setIsAppealing(true);
    setCurrentResult(null);
    setSubmissionPhase('submitting');

    try {
      // 1. Sends appeal tx → MetaMask shows gas
      // 2. Waits for FINALIZED re-consensus
      // 3. Reads get_submission() from contract
      // 4. Returns ONLY the contract's updated judgment
      // NO LOCAL HEURISTIC IS USED AT ANY POINT
      const result = await appealSubmission(key, (phase) => {
        setSubmissionPhase(phase as SubmissionPhase);
      });

      setCurrentResult(result);
      setSubmissionPhase('complete');
      refreshStats();

      if (result.authority === 'contract') {
        toast.success(`Appeal Judgment: Score ${result.originality_score}/100 — ${result.is_original ? 'ORIGINAL' : 'FLAGGED'}`);
      } else {
        toast.error('Failed to read appeal result from contract');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Appeal failed';
      toast.error(msg);
      setSubmissionPhase('idle');
    } finally {
      setIsAppealing(false);
    }
  };

  // ─── SELECT → always re-read from contract ─────────────
  const handleSelectSubmission = async (sub: Submission | null) => {
    if (!sub) return;

    setSubmissionPhase('reading_result');
    const fresh = await readSubmissionFromContract(sub.key);

    if (fresh) {
      const validationWarnings = validateSubmission(fresh);
      const enforcedOriginal = fresh.originality_score >= 40;
      setCurrentResult({
        originality_score: fresh.originality_score,
        is_original: enforcedOriginal,
        reasoning: fresh.reasoning,
        similar_sources: fresh.similar_sources,
        authority: 'contract',
        key: fresh.key,
        validationWarnings,
      });
    } else {
      setCurrentResult({
        originality_score: 0, is_original: false,
        reasoning: 'Could not read this submission from the contract. No local substitute is available.',
        similar_sources: [], authority: 'error', key: sub.key,
        validationWarnings: ['Contract read failed — no local heuristic is substituted'],
      });
    }
    setSubmissionPhase('complete');
  };

  const showPending = submissionPhase === 'reading_state' ||
    submissionPhase === 'submitting' ||
    submissionPhase === 'awaiting_consensus' ||
    submissionPhase === 'reading_result';

  return (
    <div className="min-h-screen relative">
      <div className="fixed inset-0 bg-gradient-to-b from-[#050508] via-[#080812] to-[#050508]" />
      <div className="fixed inset-0 grid-bg" />
      <div className="noise-overlay" />

      <div className="relative z-10">
        <Header
          wallet={wallet}
          onConnectClick={() => setShowWalletModal(true)}
          onDisconnect={handleDisconnectWallet}
        />

        <main className="container mx-auto px-5 max-w-7xl py-5 space-y-5">
          {/* Network status + How to Use button */}
          <div className="flex items-center justify-center gap-3 py-2">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.04] bg-white/[0.01]">
              <span className={`w-1.5 h-1.5 rounded-full ${wallet.connected ? 'bg-cyan-400 pulse-dot' : 'bg-white/20'}`}></span>
              <span className="text-[10px] font-mono text-white/20">
                {wallet.connected ? 'CONNECTED · GENLAYER STUDIO' : 'CONNECT WALLET TO SUBMIT'}
              </span>
              <span className="text-[10px] font-mono text-white/8">|</span>
              <span className="text-[10px] font-mono text-white/15">
                Contract: 0x3E5a...D97a
              </span>
            </div>
            <button
              onClick={() => setShowHowToUse(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-cyan-400/15 bg-cyan-400/[0.04] hover:bg-cyan-400/[0.08] hover:border-cyan-400/30 transition-all text-[10px] font-mono text-cyan-400/50 hover:text-cyan-400/80"
            >
              <span>❓</span>
              <span>How to Use</span>
            </button>
          </div>

          {/* Stats */}
          <StatsBar stats={stats} loading={statsLoading} />

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            <div className="lg:col-span-3 space-y-5">
              <SubmitForm
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting || isAppealing}
                disabled={!wallet.connected}
              />

              <AnimatePresence mode="wait">
                {showPending && (
                  <PendingJudgment key="pending" phase={submissionPhase} />
                )}
              </AnimatePresence>

              <AnimatePresence>
                {currentResult && submissionPhase === 'complete' && (
                  <AnalysisResultPanel
                    result={currentResult}
                    onAppeal={handleAppeal}
                    isAppealing={isAppealing}
                  />
                )}
              </AnimatePresence>

              {submissionPhase === 'failed' && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="rounded-xl border border-red-400/10 bg-red-400/[0.02] p-5 text-center">
                  <p className="text-sm font-mono text-red-400/60">✗ Submission failed. Please try again.</p>
                  <p className="text-[10px] font-mono text-white/15 mt-2">
                    Ensure your wallet is connected to GenLayer Studio (Chain ID: 61999) and has GEN for gas.
                  </p>
                </motion.div>
              )}
            </div>

            <div className="lg:col-span-2">
              <SubmissionList
                submissionKeys={submissionKeys}
                currentAddress={wallet.address}
                onAppeal={handleAppeal}
                onSelect={handleSelectSubmission}
                isAppealing={isAppealing}
              />
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/[0.03] py-4 mt-10">
          <div className="container mx-auto px-5 max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2">
            <span className="text-[10px] font-mono text-white/10">
              ContentScout v2.0 · Contract-Authoritative · Fail-Closed
            </span>
            <div className="flex items-center gap-4">
              <button onClick={() => setShowHowToUse(true)} className="text-[10px] font-mono text-cyan-400/20 hover:text-cyan-400/50 transition-colors">
                How to Use
              </button>
              <a href="https://studio.genlayer.com" target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-cyan-400/20 hover:text-cyan-400/50 transition-colors">
                GenLayer Studio
              </a>
              <a href="https://explorer-studio.genlayer.com/address/0x3E5a8398d07915871080A072241a4D71F652D97a" target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-cyan-400/20 hover:text-cyan-400/50 transition-colors">
                View Contract
              </a>
              <a href="https://github.com/lobinni/ContentScout" target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono text-cyan-400/20 hover:text-cyan-400/50 transition-colors">
                GitHub
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showWalletModal && (
          <WalletModal onClose={() => setShowWalletModal(false)} onConnect={handleConnectWallet} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showHowToUse && (
          <HowToUse onClose={() => setShowHowToUse(false)} />
        )}
      </AnimatePresence>

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#0a0a0f',
            border: '1px solid rgba(0, 255, 200, 0.1)',
            color: 'rgba(255,255,255,0.6)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px',
          },
        }}
      />
    </div>
  );
}

export default App;
