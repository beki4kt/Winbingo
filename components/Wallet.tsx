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

  const handleExchange = async () => {
      if(coins < 100) return alert("Need 100 coins minimum!");
      setLoading(true);
      try {
          const res = await fetch('/api/wallet/exchange', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ tid: userId })
          });
          const d = await res.json();
          if(d.success) {
              alert("Exchanged 100 Coins for 10 ETB!");
              refreshData();
          } else {
              alert(d.message);
          }
      } catch(e) { alert("Error"); }
      setLoading(false);
  };

  return (
    <div className="p-6 h-full overflow-y-auto pb-32 animate-fadeIn text-white">
      <div className={`${bg} rounded-3xl p-6 shadow-xl border border-white/5 mb-6`}>
         <div className="text-xs font-bold opacity-60 uppercase mb-1">Total Balance</div>
         <div className="text-4xl font-black mb-6">{balance.toFixed(2)} ETB</div>
         
         <div className="flex gap-3">
             <button onClick={() => window.Telegram?.WebApp?.openTelegramLink('https://t.me/WinBingoBot')} className="flex-1 bg-emerald-500 py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95">Deposit</button>
             <button onClick={() => window.Telegram?.WebApp?.openTelegramLink('https://t.me/WinBingoBot')} className="flex-1 bg-white/10 py-3 rounded-xl font-bold text-sm shadow-lg active:scale-95">Withdraw</button>
         </div>
         <p className="text-[10px] text-center mt-3 opacity-50">Transactions are handled by the Bot</p>
      </div>

      <div className={`${bg} rounded-3xl p-6 shadow-xl border border-white/5`}>
          <div className="flex justify-between items-center mb-4">
             <div>
                 <div className="text-xs font-bold opacity-60 uppercase">Win Coins</div>
                 <div className="text-2xl font-black text-yellow-400">{coins}</div>
             </div>
             <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-yellow-900 font-black">C</div>
          </div>
          
          <div className="text-xs opacity-70 mb-4">Exchange 100 Coins for 10 ETB wallet balance.</div>
          
          <button 
            onClick={handleExchange}
            disabled={coins < 100 || loading}
            className={`w-full py-3 rounded-xl font-bold text-sm shadow-lg ${coins < 100 ? 'bg-gray-600 opacity-50' : 'bg-yellow-500 text-yellow-900 active:scale-95'}`}
          >
             {loading ? 'Exchanging...' : 'Exchange (100 C -> 10 ETB)'}
          </button>
      </div>
    </div>
  );
};
export default Wallet;