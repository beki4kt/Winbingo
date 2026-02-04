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

  const handleDeepLink = (action: 'deposit' | 'withdraw') => {
      // 1. Close Mini App
      window.Telegram?.WebApp?.close();
      
      // 2. Trigger Bot Action via Link
      // This forces the bot to open with /start deposit
      // Note: Since we closed the app, the user sees the chat.
      // We rely on the user clicking the "Deposit" button again in the chat OR
      // we use openTelegramLink which might work better for some clients:
      const botUsername = "winbingoetbot"; 
      window.Telegram?.WebApp?.openTelegramLink(`https://t.me/${botUsername}?start=${action}`);
  };

  const handleExchange = async () => { /* Keep logic */ };

  return (
    <div className="p-6 h-full overflow-y-auto pb-32 animate-fadeIn text-white">
      <div className={`${bg} rounded-3xl p-6 shadow-xl border border-white/5 mb-6`}>
         <div className="text-xs font-bold opacity-60 uppercase mb-1">Total Balance</div>
         <div className="text-4xl font-black mb-6">{balance.toFixed(2)} ETB</div>
         
         <div className="flex gap-3">
             <button onClick={() => handleDeepLink('deposit')} className="flex-1 bg-emerald-500 py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95">Deposit</button>
             <button onClick={() => handleDeepLink('withdraw')} className="flex-1 bg-white/10 py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95">Withdraw</button>
         </div>
         <p className="text-[10px] text-center mt-3 opacity-50">Takes you to Bot Chat</p>
      </div>
      {/* ... Coins Section ... */}
    </div>
  );
};
export default Wallet;