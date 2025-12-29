
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
  const MetricPill = ({ label, value, color = "text-black", onClick }: { label: string, value: string | number, color?: string, onClick?: () => void }) => (
    <button 
      onClick={onClick}
      className={`${isDarkMode ? 'bg-gray-800' : 'bg-white'} rounded-full py-2 px-1 flex flex-col items-center justify-center shadow-sm transition-all active:scale-95 flex-1 min-w-0 ${onClick ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
    >
      <span className={`text-[8px] ${isDarkMode ? 'text-gray-400' : 'text-gray-400'} font-bold uppercase tracking-tight leading-none mb-1 whitespace-nowrap`}>{label}</span>
      <span className={`text-[11px] font-black ${isDarkMode ? 'text-white' : 'text-black'} leading-none truncate w-full text-center px-1`}>{value}</span>
    </button>
  );

  return (
    <div className="bg-transparent px-4 pt-4 pb-2 shrink-0">
      <div className="flex justify-between items-center mb-6">
        <button className="text-white text-sm font-bold flex items-center gap-1">
          <i className="fas fa-chevron-left"></i> Back
        </button>
        <div className="text-center">
          <h1 className="text-white font-black text-lg leading-tight tracking-tight">Addis Bingo</h1>
          <p className="text-white/60 text-[9px] font-bold uppercase tracking-[0.2em] leading-none">mini app</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={toggleTheme}
            className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-white transition-all active:scale-90"
          >
            <i className={`fas ${isDarkMode ? 'fa-sun' : 'fa-moon'}`}></i>
          </button>
          <button className="text-white text-lg">
            <i className="fas fa-ellipsis"></i>
          </button>
        </div>
      </div>

      <div className="flex gap-2 justify-between">
        <MetricPill label="Wallet" value={balance.toFixed(2)} />
        <MetricPill label="Bonus" value={bonus} />
        <MetricPill 
          label="Active Game" 
          value={activeGames} 
          onClick={activeGames > 0 ? onReturnToGame : undefined}
        />
        <MetricPill label="Stake" value={stake} />
      </div>
    </div>
  );
};

export default Header;
