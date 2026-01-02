import React from 'react';

interface HeaderProps {
  balance: number;
  bonus: number;
  activeGames: number;
  stake: number;
  onReturnToGame: () => void;
  isDarkMode: boolean;
  toggleTheme: () => void;
}

const Header: React.FC<HeaderProps> = ({ balance, bonus, activeGames, stake, onReturnToGame, isDarkMode, toggleTheme }) => {
  const MetricBox = ({ label, value, onClick }: { label: string, value: string | number, onClick?: () => void }) => (
    <div 
      onClick={onClick}
      className={`bg-white rounded-lg p-1.5 flex flex-col items-center justify-center shadow-sm flex-1 min-w-0 ${onClick ? 'cursor-pointer active:scale-95' : ''}`}
    >
      <span className="text-[7px] text-emerald-600 font-bold uppercase tracking-tight leading-none mb-0.5">{label}</span>
      <span className="text-[10px] font-black text-emerald-900 leading-none truncate">{value}</span>
    </div>
  );

  return (
    <div className="bg-transparent px-4 pt-2 pb-2 shrink-0">
      <div className="flex justify-between items-center mb-4">
        <button className="text-white text-xs font-bold flex items-center gap-1">
          <i className="fas fa-chevron-left"></i> Back
        </button>
        <div className="text-center">
          <h1 className="text-white font-black text-sm leading-tight">Win Bingo</h1>
          <p className="text-white/60 text-[8px] font-bold uppercase leading-none tracking-widest">mini app</p>
        </div>
        <button onClick={toggleTheme} className="text-white text-base w-8 h-8 flex items-center justify-center rounded-full bg-white/10 active:scale-90 transition-all">
          <i className={`fas ${isDarkMode ? 'fa-sun text-yellow-400' : 'fa-moon text-white'}`}></i>
        </button>
      </div>

      <div className="flex gap-1.5 justify-between">
        <MetricBox label="Wallet" value={balance.toFixed(2)} />
        <MetricBox label="Bonus" value={bonus} />
        <MetricBox 
          label="Active Game" 
          value={activeGames} 
          onClick={activeGames > 0 ? onReturnToGame : undefined}
        />
        <MetricBox label="Stake" value={stake} />
      </div>
    </div>
  );
};

export default Header;