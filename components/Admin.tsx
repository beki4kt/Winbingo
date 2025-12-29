import React, { useState } from 'react';

interface WithdrawalRequest {
  id: string;
  user: string;
  amount: number;
  method: string;
  status: 'pending' | 'approved' | 'rejected';
}

// Added AdminProps to fix TypeScript error in App.tsx
interface AdminProps {
  isDarkMode: boolean;
}

const Admin: React.FC<AdminProps> = ({ isDarkMode }) => {
  const [commission, setCommission] = useState(20);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([
    { id: 'W-101', user: 'Abebe_251', amount: 500, method: 'Telebirr', status: 'pending' },
    { id: 'W-102', user: 'Sara_M', amount: 1200, method: 'Chapa', status: 'pending' },
    { id: 'W-103', user: 'Johnny_T', amount: 50, method: 'Telebirr', status: 'pending' },
  ]);

  const handleAction = (id: string, status: 'approved' | 'rejected') => {
    setWithdrawals(prev => prev.map(w => w.id === id ? { ...w, status } : w));
  };

  return (
    <div className="p-6 text-white pb-32 min-h-full">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black flex items-center gap-2">
          <i className="fas fa-shield-halved text-orange-400"></i> Admin
        </h2>
        <button onClick={() => window.location.reload()} className="text-[10px] bg-white/10 px-3 py-1 rounded-full font-bold uppercase tracking-widest">Sync Server</button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-black/40 border border-white/10 p-5 rounded-[2rem] shadow-xl">
          <p className="text-[10px] uppercase font-bold text-white/40 mb-1 tracking-widest">Platform Profit</p>
          <p className="text-2xl font-black text-green-400">14,250</p>
          <p className="text-[9px] text-white/20 uppercase font-bold">20% commission</p>
        </div>
        <div className="bg-black/40 border border-white/10 p-5 rounded-[2rem] shadow-xl">
          <p className="text-[10px] uppercase font-bold text-white/40 mb-1 tracking-widest">Players Live</p>
          <p className="text-2xl font-black text-blue-400">1,248</p>
          <p className="text-[9px] text-white/20 uppercase font-bold">14 lobbies active</p>
        </div>
      </div>

      <div className="bg-white/10 rounded-[2rem] p-6 mb-8 border border-white/5 shadow-inner">
        <h3 className="text-xs font-black uppercase mb-4 tracking-widest flex justify-between items-center">
          Commission Control
          <span className="text-green-400 text-[10px] animate-pulse">Running</span>
        </h3>
        <div className="space-y-4">
          <div>
            <div className="flex justify-between text-[11px] mb-3">
              <span className="opacity-60 font-bold uppercase tracking-tighter">Current House Cut</span>
              <span className="font-black text-orange-400 text-lg">{commission}%</span>
            </div>
            <input 
              type="range" 
              min="5" max="40" 
              value={commission} 
              onChange={(e) => setCommission(parseInt(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-orange-500 mb-2" 
            />
            <p className="text-[8px] text-white/20 text-center italic mt-2">Global change applied instantly to all active game rooms.</p>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center mb-4 px-1">
        <h3 className="text-sm font-black uppercase tracking-widest">Payout Requests</h3>
        <span className="text-[10px] font-bold text-orange-400 bg-orange-400/10 px-3 py-1 rounded-full border border-orange-400/20">
          {withdrawals.filter(w => w.status === 'pending').length} Actions
        </span>
      </div>
      
      <div className="space-y-3">
        {withdrawals.filter(w => w.status === 'pending').map(req => (
          <div key={req.id} className="bg-black/30 border border-white/10 p-4 rounded-3xl flex justify-between items-center shadow-lg animate-fadeIn">
            <div>
              <p className="text-xs font-black tracking-tight">{req.user}</p>
              <p className="text-[9px] text-white/30 uppercase font-bold">{req.amount} ETB • {req.method}</p>
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handleAction(req.id, 'approved')}
                className="w-10 h-10 bg-green-500 rounded-2xl flex items-center justify-center text-xs shadow-xl active:scale-90 transition-transform"
              >
                <i className="fas fa-check"></i>
              </button>
              <button 
                onClick={() => handleAction(req.id, 'rejected')}
                className="w-10 h-10 bg-red-500 rounded-2xl flex items-center justify-center text-xs shadow-xl active:scale-90 transition-transform"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
          </div>
        ))}
        {withdrawals.filter(w => w.status === 'pending').length === 0 && (
          <div className="text-center py-12 bg-white/5 rounded-[2rem] border border-dashed border-white/10 opacity-40">
            <i className="fas fa-check-double text-4xl mb-3"></i>
            <p className="text-[10px] font-black uppercase tracking-widest">All Payouts Processed</p>
          </div>
        )}
      </div>
      
      <div className="mt-12 p-5 bg-red-500/10 border border-red-500/20 rounded-[2rem] text-center">
         <p className="text-[9px] text-red-500/60 font-black uppercase tracking-widest mb-4">Critical System Controls</p>
         <button className="w-full py-4 bg-red-500/20 text-red-500 text-[10px] font-black rounded-2xl border border-red-500/30 uppercase tracking-widest transition-all active:scale-95">
            Maintenance Mode: OFF
         </button>
      </div>
    </div>
  );
};

export default Admin;