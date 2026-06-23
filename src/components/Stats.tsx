import { motion } from 'framer-motion';
import { ContractStats } from '../types';

interface StatsProps {
  stats: ContractStats;
}

export default function Stats({ stats }: StatsProps) {
  const rate = stats.submission_count > 0
    ? Math.round((stats.total_rewarded / stats.submission_count) * 100)
    : 0;

  const items = [
    { label: 'SUBMISSIONS', value: stats.submission_count, color: 'cyan' },
    { label: 'REWARDED', value: stats.total_rewarded, color: 'lime' },
    { label: 'REJECTED', value: stats.total_rejected, color: 'red' },
    { label: 'PASS RATE', value: `${rate}%`, color: 'magenta' },
  ];

  const getColor = (c: string) => {
    switch (c) {
      case 'cyan': return { text: 'text-cyan-400', shadow: 'neon-cyan', bar: 'bg-cyan-400', border: 'border-cyan-400/20' };
      case 'lime': return { text: 'text-lime-400', shadow: 'neon-lime', bar: 'bg-lime-400', border: 'border-lime-400/20' };
      case 'red': return { text: 'text-red-400', shadow: 'neon-red', bar: 'bg-red-400', border: 'border-red-400/20' };
      case 'magenta': return { text: 'text-fuchsia-400', shadow: 'neon-magenta', bar: 'bg-fuchsia-400', border: 'border-fuchsia-400/20' };
      default: return { text: 'text-white', shadow: '', bar: 'bg-white', border: 'border-white/20' };
    }
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((item, i) => {
        const c = getColor(item.color);
        return (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: i * 0.08 }}
            className={`relative p-4 rounded-lg border ${c.border} bg-white/[0.02] overflow-hidden group hover:bg-white/[0.04] transition-colors`}
          >
            {/* Corner accents */}
            <div className={`absolute top-0 left-0 w-3 h-[1px] ${c.bar} opacity-40`}></div>
            <div className={`absolute top-0 left-0 w-[1px] h-3 ${c.bar} opacity-40`}></div>
            <div className={`absolute bottom-0 right-0 w-3 h-[1px] ${c.bar} opacity-40`}></div>
            <div className={`absolute bottom-0 right-0 w-[1px] h-3 ${c.bar} opacity-40`}></div>

            <div className="text-[10px] font-mono tracking-[0.2em] text-white/30 mb-2">{item.label}</div>
            <div className={`text-2xl md:text-3xl font-mono font-bold ${c.text} ${c.shadow}`}>
              {item.value}
            </div>

            {/* Decorative bottom bar */}
            <div className="mt-3 h-[2px] bg-white/5 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: typeof item.value === 'number' ? `${Math.min(100, item.value * 10 + 20)}%` : `${rate}%` }}
                transition={{ duration: 1, delay: 0.3 + i * 0.1 }}
                className={`h-full ${c.bar} opacity-40 rounded-full`}
              />
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}
