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
  // ─── STATE ──────────────────────────────────────────────
  const [wallet, setWallet] = useState<WalletState>({
    connected: false,
    address: null,
    balance: '0',
  });

  const [stats, setStats] = useState<ContractStats | null>(null);
  const [statsLoading, setStatsLoading] = useState(false);

  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [submissionPhase, setSubmissionPhase] = useState<SubmissionPhase>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAppealing, setIsAppealing] = useState(false);

  const [submissionKeys, setSubmissionKeys] = useState<string[]>([]);

  const [showWalletModal, setShowWalletModal] = useState(false);

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

  // ─── WALLET CONNECTION ──────────────────────────────────
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

  // ─── SUBMIT — CONTRACT-AUTHORITATIVE FLOW ───────────────
  const handleSubmit = async (content: string, contentType: string, sourceUrl: string) => {
    if (!wallet.connected) {
      setShowWalletModal(true);
      return;
    }

    setIsSubmitting(true);
    setCurrentResult(null);
    setSubmissionPhase('submitting');

    try {
      // This function:
      // 1. Sends tx to contract → MetaMask shows gas fee
      // 2. Waits for FINALIZED consensus (AI validators)
      // 3. Reads get_submission() from contract
      // 4. Returns ONLY the contract's judgment
      // NO LOCAL HEURISTIC IS USED AT ANY POINT
      const result = await submitContent(
        content,
        contentType,
        sourceUrl,
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

  // ─── APPEAL — CONTRACT-AUTHORITATIVE FLOW ───────────────
  const handleAppeal = async (key: string) => {
    if (!wallet.connected) {
      setShowWalletModal(true);
      return;
    }

    setIsAppealing(true);
    setCurrentResult(null); // Clear previous result — no local substitute shown
    setSubmissionPhase('submitting');

    try {
      // This function:
      // 1. Sends appeal tx to contract → MetaMask shows gas fee
      // 2. Waits for FINALIZED re-consensus (AI validators re-judge)
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
        if (result.validationWarnings && result.validationWarnings.length > 0) {
          toast.warning(`⚠ ${result.validationWarnings.length} validation warning(s)`);
        }
      } else {
        toast.error('Failed to read appeal result from contract — no local substitute available');
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Appeal failed';
      toast.error(msg);
      setSubmissionPhase('idle');
    } finally {
      setIsAppealing(false);
    }
  };

  // ─── Select submission from list → read from contract ───
  const handleSelectSubmission = async (sub: Submission | null) => {
    if (!sub) return;

    // ALWAYS re-read from contract to ensure we have the latest
    // AUTHORITATIVE judgment. Never display cached/local data.
    setSubmissionPhase('reading_result');
    const fresh = await readSubmissionFromContract(sub.key);

    if (fresh) {
      // Apply validation warnings (same as submit/appeal flows)
      const validationWarnings = validateSubmission(fresh);
      const enforcedOriginal = fresh.originality_score >= 40;

      setCurrentResult({
        originality_score: fresh.originality_score,
        is_original: enforcedOriginal, // FAIL-CLOSED: always derived from score
        reasoning: fresh.reasoning,
        similar_sources: fresh.similar_sources,
        authority: 'contract',
        key: fresh.key,
        validationWarnings,
      });
      setSubmissionPhase('complete');
    } else {
      setCurrentResult({
        originality_score: 0,
        is_original: false,
        reasoning: 'Could not read this submission from the contract. No local substitute is available.',
        similar_sources: [],
        authority: 'error',
        key: sub.key,
        validationWarnings: ['Contract read failed — no local heuristic is substituted'],
      });
      setSubmissionPhase('complete');
    }
  };

  // ─── Determine if pending animation should show ─────────
  const showPending = submissionPhase === 'reading_state' ||
    submissionPhase === 'submitting' ||
    submissionPhase === 'awaiting_consensus' ||
    submissionPhase === 'reading_result';

  // ─── RENDER ─────────────────────────────────────────────
  return (
    <div className="min-h-screen relative">
      {/* Background */}
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
          {/* Network status */}
          <div className="flex items-center justify-center gap-3 py-2">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/[0.04] bg-white/[0.01]">
              <span className={`w-1.5 h-1.5 rounded-full ${wallet.connected ? 'bg-cyan-400 pulse-dot' : 'bg-white/20'}`}></span>
              <span className="text-[10px] font-mono text-white/20">
                {wallet.connected ? 'CONNECTED · GENLAYER STUDIO' : 'CONNECT WALLET TO SUBMIT'}
              </span>
              <span className="text-[10px] font-mono text-white/8">|</span>
              <span className="text-[10px] font-mono text-white/15">
                Contract: 0x1416...7c22
              </span>
            </div>
          </div>

          {/* Stats */}
          <StatsBar stats={stats} loading={statsLoading} />

          {/* Main grid */}
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
            {/* Left column — Form + Result */}
            <div className="lg:col-span-3 space-y-5">
              {/* Submit form */}
              <SubmitForm
                onSubmit={handleSubmit}
                isSubmitting={isSubmitting || isAppealing}
                disabled={!wallet.connected}
              />

              {/* Pending judgment — shown during submit AND appeal */}
              <AnimatePresence mode="wait">
                {showPending && (
                  <PendingJudgment key="pending" phase={submissionPhase} />
                )}
              </AnimatePresence>

              {/* Contract-authoritative result */}
              <AnimatePresence>
                {currentResult && submissionPhase === 'complete' && (
                  <AnalysisResultPanel
                    result={currentResult}
                    onAppeal={handleAppeal}
                    isAppealing={isAppealing}
                  />
                )}
              </AnimatePresence>

              {/* Error state */}
              {submissionPhase === 'failed' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="rounded-xl border border-red-400/10 bg-red-400/[0.02] p-5 text-center"
                >
                  <p className="text-sm font-mono text-red-400/60">
                    ✗ Submission failed. Please try again.
                  </p>
                  <p className="text-[10px] font-mono text-white/15 mt-2">
                    Ensure your wallet is connected to GenLayer Studio (Chain ID: 61999) and has GEN for gas.
                    No local analysis is provided as a substitute.
                  </p>
                </motion.div>
              )}
            </div>

            {/* Right column — Submission list */}
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
              ContentScout v2.0 · Contract-Authoritative · Fail-Closed · No Local Heuristic
            </span>
            <div className="flex items-center gap-4">
              <a
                href="https://studio.genlayer.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono text-cyan-400/20 hover:text-cyan-400/50 transition-colors"
              >
                GenLayer Studio
              </a>
              <a
                href="https://explorer-studio.genlayer.com/address/0x141666BB3C83D10a2CC0bA2d42aE8973a2B47c22"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-mono text-cyan-400/20 hover:text-cyan-400/50 transition-colors"
              >
                View Contract
              </a>
            </div>
          </div>
        </footer>
      </div>

      {/* Wallet Modal */}
      <AnimatePresence>
        {showWalletModal && (
          <WalletModal
            onClose={() => setShowWalletModal(false)}
            onConnect={handleConnectWallet}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
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
