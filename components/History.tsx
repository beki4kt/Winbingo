import React from 'react';

// Added HistoryProps to fix TypeScript error in App.tsx
interface HistoryProps {
  isDarkMode: boolean;
}

const History: React.FC<HistoryProps> = ({ isDarkMode }) => {
  const games = [
    { id: 'B-7180', date: 'Today, 2:45 PM', stake: 10, won: 80, status: 'WIN' },
    { id: 'B-7175', date: 'Today, 1:20 PM', stake: 50, won: 0, status: 'LOSS' },
    { id: 'B-7162', date: 'Yesterday', stake: 10, won: 0, status: 'LOSS' },
    { id: 'B-7150', date: 'Yesterday', stake: 100, won: 800, status: 'WIN' },
    { id: 'B-7142', date: 'Oct 24, 2023', stake: 20, won: 160, status: 'WIN' },
  ];

  return (
    <div className="p-4 pb-32">
      <div className="flex items-center gap-3 mb-6 px-2">
        <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center shadow-lg">
          <i className="fas fa-history text-white text-lg"></i>
        </div>
        <div>
          <h2 className="text-white font-black text-xl uppercase tracking-tighter">History</h2>
          <p className="text-white/50 text-[10px] font-bold uppercase">Recent Game Results</p>
        </div>
      </div>

      <div className="space-y-3">
        {games.map((game, idx) => (
          <div key={idx} className="bg-black/10 border border-white/5 p-4 rounded-3xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                game.status === 'WIN' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                <i className={`fas ${game.status === 'WIN' ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`}></i>
              </div>
              <div>
                <p className="text-white font-bold text-sm">Game {game.id}</p>
                <p className="text-[9px] text-white/30 uppercase font-black">{game.date}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`font-black ${game.status === 'WIN' ? 'text-green-400' : 'text-white/60'}`}>
                {game.status === 'WIN' ? `+${game.won}` : `-${game.stake}`}
                <span className="text-[9px] ml-1 uppercase">ETB</span>
              </p>
              <span className={`text-[8px] px-2 py-0.5 rounded-full font-black uppercase ${
                game.status === 'WIN' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
              }`}>
                {game.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default History;