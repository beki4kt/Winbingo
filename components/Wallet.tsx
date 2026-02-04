import React, { useState } from 'react';

interface WalletProps {
  balance: number;
  coins: number;
  userId: string | null;
  refreshData: () => void;
  isDarkMode: boolean;
}

const Wallet: React.FC<WalletProps> = ({ balance, coins, userId, refreshData, isDarkMode }) => {
  const [loading, setLoading] = useState(false);
  const bg = isDarkMode ? 'bg-slate-800' : 'bg-white/10';

  // --- 🔗 UPDATED REDIRECT ---
  const openBotCommand = (command: string) => {
      // Use the exact bot username provided
      const botUsername = "winbingoetbot"; 
      window.Telegram?.WebApp?.openTelegramLink(`https://t.me/${botUsername}?start=${command}`);
  };

  // ... (Rest of logic: handleExchange, etc.) ...
  const handleExchange = async () => { /* Keep existing logic */ };

  return (
    <div className="p-6 h-full overflow-y-auto pb-32 animate-fadeIn text-white">
      <div className={`${bg} rounded-3xl p-6 shadow-xl border border-white/5 mb-6`}>
         <div className="text-xs font-bold opacity-60 uppercase mb-1">Total Balance</div>
         <div className="text-4xl font-black mb-6">{balance.toFixed(2)} ETB</div>
         
         <div className="flex gap-3">
             <button onClick={() => openBotCommand('deposit')} className="flex-1 bg-emerald-500 py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95">Deposit</button>
             <button onClick={() => openBotCommand('withdraw')} className="flex-1 bg-white/10 py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95">Withdraw</button>
         </div>
         <p className="text-[10px] text-center mt-3 opacity-50">Redirects to @winbingoetbot</p>
      </div>
      
      {/* ... (Keep Coins Section) ... */}
      <div className={`${bg} rounded-3xl p-6 shadow-xl border border-white/5`}>
          {/* ... (Keep existing Coin Exchange UI) ... */}
          <div className="flex justify-between items-center mb-4">
             <div>
                 <div className="text-xs font-bold opacity-60 uppercase">Win Coins</div>
                 <div className="text-2xl font-black text-yellow-400">{coins}</div>
             </div>
             <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-900 font-black">C</div>
          </div>
          <button onClick={handleExchange} className="w-full py-3 rounded-xl font-bold text-sm bg-yellow-500 text-yellow-900 shadow-lg active:scale-95">Exchange Coins</button>
      </div>
    </div>
  );
};
export default Wallet;