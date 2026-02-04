import React, { useEffect, useState } from 'react';

const SuperAdmin: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Manual Funding State
  const [targetId, setTargetId] = useState('');
  const [fundAmount, setFundAmount] = useState('');

  const fetchRequests = async () => {
    try {
        const res = await fetch('/api/admin/pending');
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleTx = async (txId: string, action: 'APPROVE' | 'REJECT') => { /* Keep existing */ };

  const handleManualFund = async () => {
      if(!targetId || !fundAmount) return alert("Fill all fields");
      setLoading(true);
      try {
          const res = await fetch('/api/admin/add-balance', {
              method: 'POST',
              headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ telegramId: targetId, amount: fundAmount })
          });
          const d = await res.json();
          if(d.success) {
              alert("Funds Added!");
              setTargetId(''); setFundAmount('');
          } else {
              alert(d.message || "Failed. Check ID.");
          }
      } catch(e) { alert("Error"); }
      setLoading(false);
  };

  return (
    <div className="h-full bg-slate-900 text-white p-4 overflow-y-auto pb-20 animate-fadeIn">
      <h1 className="text-xl font-black text-red-500 uppercase tracking-tighter mb-6">Super Admin</h1>

      {/* 💰 MANUAL FUNDING SECTION */}
      <div className="bg-slate-800 p-4 rounded-xl border border-white/5 shadow-lg mb-6">
          <h2 className="text-sm font-bold uppercase mb-2 text-green-400">Manual Funding</h2>
          <div className="flex flex-col gap-2">
              <input 
                 type="text" 
                 placeholder="Telegram User ID" 
                 value={targetId}
                 onChange={(e) => setTargetId(e.target.value)}
                 className="bg-black/20 p-2 rounded text-xs text-white border border-white/10"
              />
              <input 
                 type="number" 
                 placeholder="Amount (ETB)" 
                 value={fundAmount}
                 onChange={(e) => setFundAmount(e.target.value)}
                 className="bg-black/20 p-2 rounded text-xs text-white border border-white/10"
              />
              <button 
                  onClick={handleManualFund} 
                  disabled={loading}
                  className="bg-green-600 py-2 rounded font-bold text-xs uppercase hover:bg-green-500"
              >
                  {loading ? 'Processing...' : 'Add Funds'}
              </button>
          </div>
      </div>

      <div className="flex justify-between items-center mb-2">
          <h2 className="text-sm font-bold uppercase text-white/60">Pending Requests</h2>
          <button onClick={fetchRequests} className="text-[10px] bg-slate-700 px-2 py-1 rounded">Refresh</button>
      </div>

      <div className="space-y-3">
        {requests.length === 0 ? <p className="text-center opacity-30 mt-4 text-xs">No pending requests</p> : 
         requests.map(tx => (
           <div key={tx.id} className="bg-slate-800 p-4 rounded-xl border border-white/5 shadow-lg">
              {/* Keep existing request card UI */}
              <div className="flex justify-between mb-2">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${tx.type === 'DEPOSIT' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{tx.type}</span>
                  <span className="font-mono font-bold text-lg">{tx.amount} ETB</span>
              </div>
              <div className="text-xs opacity-60 mb-2 font-bold">User: {tx.user?.firstName}</div>
           </div>
         ))
        }
      </div>
    </div>
  );
};

export default SuperAdmin;