import React from 'react';

interface WalletProps {
  balance: number;
  setBalance: (bal: number) => void;
  // Added isDarkMode to resolve TypeScript error in App.tsx
  isDarkMode: boolean;
}

const Wallet: React.FC<WalletProps> = ({ balance, setBalance, isDarkMode }) => {
  const depositAmounts = [10, 50, 100, 500];

  // Updated background to respect dark mode theme
  return (
    <div className={`p-6 text-white pb-32 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#065f46]'} min-h-full transition-colors duration-500`}>
      <div className="bg-white/5 backdrop-blur-md p-10 rounded-[3rem] text-center mb-8 border border-white/10">
        <h3 className="text-white/30 text-xs mb-2 font-black uppercase tracking-[0.3em]">Vault Balance</h3>
        <p className="text-6xl font-black mb-1 leading-none tracking-tighter text-white">{balance.toFixed(2)}</p>
        <p className="text-[10px] text-orange-500 font-black uppercase tracking-widest mt-2">ETB Credits</p>
      </div>

      <h3 className="text-xs font-black mb-4 uppercase tracking-widest text-white/40 px-2">Instant Refill</h3>
      <div className="grid grid-cols-2 gap-3 mb-8">
        {depositAmounts.map(amt => (
          <button 
            key={amt}
            onClick={() => setBalance(balance + amt)}
            className="bg-white/5 hover:bg-white/10 border border-white/10 py-5 rounded-3xl font-black transition-all active:scale-95 text-xs text-white uppercase tracking-tighter"
          >
            +{amt} ETB
          </button>
        ))}
      </div>

      <button className="w-full bg-orange-500 py-5 rounded-[2rem] font-black text-sm shadow-2xl mb-8 transition-transform active:scale-95 uppercase tracking-widest text-white">
        Cash-Out Funds
      </button>

      <div className="bg-white/5 p-6 rounded-[2.5rem] border border-white/5">
        <h4 className="font-black text-[9px] mb-5 text-white/20 uppercase tracking-[0.3em]">Ledger History</h4>
        <div className="space-y-5">
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="font-black text-xs uppercase tracking-tighter">Telebirr Payout</span>
              <span className="text-[8px] text-white/20 font-bold uppercase mt-0.5">Oct 26, 11:42 PM</span>
            </div>
            <span className="text-orange-500 font-black text-xs">-50.00</span>
          </div>
          <div className="flex justify-between items-center">
            <div className="flex flex-col">
              <span className="font-black text-xs uppercase tracking-tighter">Chapa Deposit</span>
              <span className="text-[8px] text-white/20 font-bold uppercase mt-0.5">Oct 25, 04:15 AM</span>
            </div>
            <span className="text-green-500 font-black text-xs">+100.00</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Wallet;