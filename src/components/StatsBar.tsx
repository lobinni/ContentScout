import { motion } from 'framer-motion';
import { ContractStats } from '../types';

interface StatsBarProps {
  stats: ContractStats | null;
  loading: boolean;
}

export default function StatsBar({ stats, loading }: StatsBarProps) {
  const items = [
    { label: 'TOTAL SUBMISSIONS', value: stats?.submission_count ?? '—', color: 'text-white/60' },
    { label: 'ORIGINAL', value: stats?.total_rewarded ?? '—', color: 'text-cyan-400' },
    { label: 'FLAGGED', value: stats?.total_rejected ?? '—', color: 'text-red-400' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="flex items-center gap-1"
    >
      {items.map((item, i) => (
        <div
          key={item.label}
          className={`flex-1 rounded-lg border border-white/[0.04] bg-white/[0.01] px-4 py-2.5 ${
            i < items.length - 1 ? 'mr-2' : ''
          }`}
        >
          <div className="text-[9px] font-mono tracking-[0.15em] text-white/15 mb-1">
            {item.label}
          </div>
          <div className={`text-lg font-mono font-bold ${item.color} ${loading ? 'animate-pulse' : ''}`}>
            {loading ? '...' : item.value}
          </div>
        </div>
      ))}
      <div className="flex-1 rounded-lg border border-cyan-400/10 bg-cyan-400/[0.02] px-4 py-2.5 ml-2">
        <div className="text-[9px] font-mono tracking-[0.15em] text-white/15 mb-1">
          SOURCE
        </div>
        <div className="text-xs font-mono text-cyan-400/60">
          ON-CHAIN CONTRACT
        </div>
      </div>
    </motion.div>
  );
}
