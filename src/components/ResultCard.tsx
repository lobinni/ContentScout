import { motion } from 'framer-motion';
import { AnalysisResult } from '../types';
import { PLAGIARISM_THRESHOLD } from '../lib/analyzer';

interface ResultCardProps {
  result: AnalysisResult;
}

export default function ResultCard({ result }: ResultCardProps) {
  const score = result.originality_score;

  const getVerdict = (s: number) => {
    if (s >= 70) return { label: 'ORIGINAL', color: 'cyan', glow: 'neon-cyan' };
    if (s >= PLAGIARISM_THRESHOLD) return { label: 'BORDERLINE', color: 'yellow', glow: 'neon-lime' };
    return { label: 'FLAGGED', color: 'red', glow: 'neon-red' };
  };

  const verdict = getVerdict(score);

  const getBarColor = (v: number) => {
    if (v >= 70) return 'bg-cyan-400';
    if (v >= PLAGIARISM_THRESHOLD) return 'bg-yellow-400';
    return 'bg-red-400';
  };

  const getTextColor = (v: number) => {
    if (v >= 70) return 'text-cyan-400';
    if (v >= PLAGIARISM_THRESHOLD) return 'text-yellow-400';
    return 'text-red-400';
  };

  const metrics = [
    { key: 'UNIQUENESS', value: result.metrics.uniqueness },
    { key: 'VOCABULARY', value: result.metrics.vocabulary },
    { key: 'STRUCTURE', value: result.metrics.structure },
    { key: 'CREATIVITY', value: result.metrics.creativity },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.4 }}
      className="rounded-xl border border-white/[0.06] bg-white/[0.02] overflow-hidden"
    >
      {/* Header: VERDICT */}
      <div className="px-5 py-3 border-b border-white/[0.06] bg-white/[0.02] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono tracking-[0.2em] text-white/25">VERDICT</span>
        </div>
        <motion.span
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className={`text-xs font-mono font-bold tracking-[0.15em] ${getTextColor(score)} ${verdict.glow}`}
        >
          {verdict.label}
        </motion.span>
      </div>

      <div className="p-5 space-y-5">
        {/* Score Display — large and dramatic */}
        <div className="flex items-end justify-between">
          <div>
            <div className="text-[10px] font-mono tracking-[0.2em] text-white/20 mb-1">
              SCOUT_SCORE
            </div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className={`text-5xl font-mono font-bold ${getTextColor(score)} ${verdict.glow}`}
            >
              {score}
              <span className="text-lg text-white/20 ml-1">/100</span>
            </motion.div>
          </div>

          {/* Mini waveform visualization */}
          <div className="flex items-end gap-[3px] h-10">
            {Array.from({ length: 16 }).map((_, i) => {
              const h = Math.sin((i / 16) * Math.PI) * score * 0.8 + 8;
              return (
                <motion.div
                  key={i}
                  initial={{ height: 0 }}
                  animate={{ height: h }}
                  transition={{ delay: 0.1 + i * 0.03, duration: 0.4 }}
                  className={`w-[3px] rounded-full ${getBarColor(score)} opacity-50`}
                />
              );
            })}
          </div>
        </div>

        {/* Metrics */}
        <div className="space-y-2.5">
          {metrics.map((m, i) => (
            <motion.div
              key={m.key}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.08 }}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono tracking-[0.15em] text-white/25">{m.key}</span>
                <span className={`text-xs font-mono font-medium ${getTextColor(m.value)}`}>{m.value}</span>
              </div>
              <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${m.value}%` }}
                  transition={{ duration: 0.8, delay: 0.4 + i * 0.1 }}
                  className={`h-full rounded-full ${getBarColor(m.value)}`}
                  style={{ opacity: 0.6 }}
                />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Reasoning — terminal style */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="rounded-lg bg-black/30 border border-white/[0.04] p-4"
        >
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-mono text-cyan-400/50 tracking-wider">$</span>
            <span className="text-[10px] font-mono text-white/20 tracking-wider">VALIDATOR_REASONING</span>
          </div>
          <p className="text-xs font-mono text-white/40 leading-relaxed">
            {result.reasoning}
          </p>
        </motion.div>

        {/* Similar Sources */}
        {result.similar_sources.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="rounded-lg bg-red-400/5 border border-red-400/10 p-4"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span>
              <span className="text-[10px] font-mono text-red-400/60 tracking-wider">
                SIMILAR_SOURCES [{result.similar_sources.length}]
              </span>
            </div>
            {result.similar_sources.map((src: string, i: number) => (
              <div key={i} className="flex items-center gap-2 mt-1.5">
                <span className="text-[10px] font-mono text-red-400/30">→</span>
                <span className="text-xs font-mono text-red-400/50 truncate">{src}</span>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}
