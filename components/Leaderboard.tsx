import React from 'react';

// Added LeaderboardProps to fix TypeScript error in App.tsx
interface LeaderboardProps {
  isDarkMode: boolean;
}

const Leaderboard: React.FC<LeaderboardProps> = ({ isDarkMode }) => {
  const winners = [
    { id: 1, name: 'King_Addis', amount: 45200, avatar: '👑', rank: 1 },
    { id: 2, name: 'Bingo_Master', amount: 32150, avatar: '🎯', rank: 2 },
    { id: 3, name: 'Habesha_Queen', amount: 28400, avatar: '👸', rank: 3 },
    { id: 4, name: 'Lucky_Abbe', amount: 15200, avatar: '🦁', rank: 4 },
    { id: 5, name: 'Z_Man', amount: 12100, avatar: '⚡', rank: 5 },
    { id: 6, name: 'Sara_Winners', amount: 9800, avatar: '🌸', rank: 6 },
    { id: 7, name: 'Player_001', amount: 8400, avatar: '🎮', rank: 7 },
  ];

  return (
    <div className="p-4 pb-32">
      <div className="flex items-center gap-3 mb-6 px-2">
        <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
          <i className="fas fa-trophy text-white text-lg"></i>
        </div>
        <div>
          <h2 className="text-white font-black text-xl uppercase tracking-tighter">Leaderboard</h2>
          <p className="text-white/50 text-[10px] font-bold uppercase">Top Winners of the Week</p>
        </div>
      </div>

      <div className="space-y-3">
        {winners.map((winner) => (
          <div 
            key={winner.id} 
            className={`flex items-center justify-between p-4 rounded-3xl border transition-all ${
              winner.rank <= 3 
                ? 'bg-white/20 border-white/30 shadow-xl scale-[1.02]' 
                : 'bg-black/10 border-white/5'
            }`}
          >
            <div className="flex items-center gap-4">
              <div className={`w-8 h-8 flex items-center justify-center font-black text-xs rounded-full ${
                winner.rank === 1 ? 'bg-yellow-400 text-white' :
                winner.rank === 2 ? 'bg-gray-300 text-gray-700' :
                winner.rank === 3 ? 'bg-orange-400 text-white' : 'text-white/40'
              }`}>
                {winner.rank}
              </div>
              <div className="text-2xl">{winner.avatar}</div>
              <div>
                <p className="text-white font-bold text-sm">{winner.name}</p>
                <p className="text-[9px] text-white/40 uppercase font-black tracking-widest">Global Rank</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-white font-black">{winner.amount.toLocaleString()} <span className="text-[10px] text-white/50 font-bold uppercase">ETB</span></p>
              <p className="text-[9px] text-green-400 font-bold uppercase">Total Won</p>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-black/20 p-5 rounded-3xl border border-dashed border-white/10 text-center">
        <p className="text-white/40 text-[10px] font-bold uppercase mb-2">Your Rank</p>
        <div className="flex justify-around items-center">
          <div>
            <p className="text-white font-black">#1,402</p>
            <p className="text-[8px] text-white/30 uppercase">Position</p>
          </div>
          <div className="w-[1px] h-8 bg-white/10"></div>
          <div>
            <p className="text-white font-black">1,405 ETB</p>
            <p className="text-[8px] text-white/30 uppercase">Earnings</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;