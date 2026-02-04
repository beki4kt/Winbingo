import React, { useEffect, useState } from 'react';

interface StakeSelectionProps {
  onSelectStake: (stake: number) => void;
  isDarkMode: boolean;
}

const StakeSelection: React.FC<StakeSelectionProps> = ({ onSelectStake, isDarkMode }) => {
  const [stats, setStats] = useState<any[]>([]);
  const baseStakes = [10, 20, 50, 100];
  const bg = isDarkMode ? 'bg-[#0f172a]' : 'bg-[#065f46]';
  const cardBg = isDarkMode ? 'bg-slate-800' : 'bg-white/10';

  // 🔄 Poll for Live Stats
  useEffect(() => {
    const fetchStats = async () => {
        try {
            const res = await fetch('/api/lobby/stats');
            const data = await res.json();
            if(Array.isArray(data)) setStats(data);
        } catch(e) {}
    };
    fetchStats();
    const interval = setInterval(fetchStats, 2000); // Update every 2s
    return () => clearInterval(interval);
  }, []);

  const getStat = (stake: number) => stats.find(s => s.stake === stake) || { players: 0, pot: 0, status: 'WAITING' };

  return (
    <div className={`flex flex-col h-full ${bg} items-center justify-center p-6 animate-fadeIn transition-colors duration-500`}>
      <div className="text-center mb-8">
        <h1 className="text-4xl font-black text-white mb-2 uppercase tracking-tighter drop-shadow-xl">Win Bingo</h1>
        <div className="inline-flex items-center gap-2 bg-black/20 px-3 py-1 rounded-full border border-white/10">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-white/80 text-[10px] font-bold uppercase tracking-widest">Live Lobby</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {baseStakes.map((amount) => {
          const s = getStat(amount);
          return (
            <button
              key={amount}
              onClick={() => onSelectStake(amount)}
              className={`${cardBg} backdrop-blur-md border-2 border-white/5 rounded-3xl p-4 flex flex-col items-center gap-1 transition-all hover:scale-105 active:scale-95 hover:border-emerald-400 hover:bg-emerald-500/10 group shadow-lg relative overflow-hidden`}
            >
              {/* Live Indicator */}
              {s.status === 'PLAYING' && (
                  <div className="absolute top-2 right-2 flex gap-1">
                      <span className="flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                      </span>
                  </div>
              )}

              <span className="text-4xl font-black text-white group-hover:text-emerald-400 transition-colors">{amount}</span>
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-2">ETB</span>

              {/* Live Stats */}
              <div className="w-full bg-black/20 rounded-lg p-2 flex flex-col gap-1 border border-white/5">
                  <div className="flex justify-between items-center text-[10px] text-white/70">
                      <span>PLAYERS</span>
                      <span className="font-bold text-white">{s.players}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-white/70">
                      <span>POT</span>
                      <span className="font-bold text-yellow-400">{s.pot}</span>
                  </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default StakeSelection;