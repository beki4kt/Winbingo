import React from 'react';

interface StakeSelectionProps {
  onSelectStake: (stake: number) => void;
  isDarkMode: boolean;
}

const StakeSelection: React.FC<StakeSelectionProps> = ({ onSelectStake, isDarkMode }) => {
  const stakes = [10, 20, 50, 100];
  const bg = isDarkMode ? 'bg-[#0f172a]' : 'bg-[#065f46]';
  const cardBg = isDarkMode ? 'bg-slate-800' : 'bg-white/10';

  return (
    <div className={`flex flex-col h-full ${bg} items-center justify-center p-6 animate-fadeIn`}>
      <div className="text-center mb-8">
        <h1 className="text-3xl font-black text-white mb-2 uppercase tracking-tighter">Win Bingo</h1>
        <p className="text-white/60 text-sm font-bold uppercase tracking-widest">Select Your Stake</p>
      </div>

      <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
        {stakes.map((amount) => (
          <button
            key={amount}
            onClick={() => onSelectStake(amount)}
            className={`${cardBg} backdrop-blur-md border-2 border-white/10 rounded-3xl p-6 flex flex-col items-center gap-2 transition-all hover:scale-105 active:scale-95 hover:border-emerald-400 hover:bg-emerald-500/20 group`}
          >
            <span className="text-4xl font-black text-white group-hover:text-emerald-400 transition-colors">{amount}</span>
            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest bg-black/20 px-2 py-1 rounded-md">ETB / Board</span>
          </button>
        ))}
      </div>

      <div className="mt-10 text-white/20 text-[10px] uppercase font-bold text-center max-w-xs leading-relaxed">
        Players are grouped by stake.<br/>Higher stakes = Bigger Pots!
      </div>
    </div>
  );
};

export default StakeSelection;