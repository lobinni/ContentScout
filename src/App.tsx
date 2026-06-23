import { useState, useEffect } from 'react';
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

import { Submission, AnalysisResult } from './types';

function App() {
  const { wallet, connect, disconnect } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);

  const { getAllSubmissions, getStats, submit, appeal } = useContract();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [stats, setStats] = useState(getStats());

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentResult, setCurrentResult] = useState<AnalysisResult | null>(null);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setSubmissions(getAllSubmissions());
    setStats(getStats());
  };

  const handleConnectWallet = async () => {
    try {
      await connect();
      setShowWalletModal(false);
      toast.success('Wallet linked');
    } catch {
      toast.error('Connection failed');
    }
  };

  const handleDisconnectWallet = () => {
    disconnect();
    toast.info('Wallet disconnected');
  };

  const handleSubmit = async (content: string, contentType: string, sourceUrl: string) => {
    if (!wallet.connected) {
      setShowWalletModal(true);
      return;
    }

    setIsSubmitting(true);
    setCurrentResult(null);

    try {
      const result = await submit(content, contentType, sourceUrl);
      if (result) {
        const { submission } = result;
        const analysisResult: AnalysisResult = {
          originality_score: submission.originality_score,
          is_original: submission.is_original,
          reasoning: submission.reasoning,
          similar_sources: submission.similar_sources,
          metrics: {
            uniqueness: Math.min(100, Math.round(submission.originality_score * 0.9 + Math.random() * 10)),
            vocabulary: Math.min(100, Math.round(submission.originality_score * 0.85 + Math.random() * 15)),
            structure: Math.min(100, Math.round(submission.originality_score * 0.95 + Math.random() * 5)),
            creativity: Math.min(100, Math.round(submission.originality_score * 0.8 + Math.random() * 20)),
          },
        };
        setCurrentResult(analysisResult);
        refreshData();

        if (submission.is_original) {
          toast.success(`✓ Original — Score: ${submission.originality_score}`);
        } else {
          toast.warning(`✗ Flagged — Score: ${submission.originality_score}`);
        }
      }
    } catch {
      toast.error('Submission failed');
    } finally {
      setIsSubmitting(false);
    }
  };

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
    } catch {
      toast.error('Appeal failed');
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
                <span>AI CONSENSUS PROTOCOL</span>
              </div>
              <div className="flex items-center gap-4">
                <a
                  href="https://github.com/user/ContentScout"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-400/50 transition-colors"
                >
                  CONTENTSCOUT↗
                </a>
                <span className="text-white/5">|</span>
                <a
                  href="https://explorer-bradbury.genlayer.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-cyan-400/50 transition-colors"
                >
                  EXPLORER↗
                </a>
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
