import React, { useEffect, useState } from 'react';

const SuperAdmin: React.FC = () => {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchRequests = async () => {
    try {
        const res = await fetch('/api/admin/pending');
        const data = await res.json();
        setRequests(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handleTx = async (txId: string, action: 'APPROVE' | 'REJECT') => {
    if(loading) return;
    setLoading(true);
    try {
        await fetch('/api/admin/handle', {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ txId, action })
        });
        await fetchRequests();
    } catch (e) { alert("Error processing"); }
    setLoading(false);
  };

  return (
    <div className="h-full bg-slate-900 text-white p-4 overflow-y-auto pb-20 animate-fadeIn">
      <div className="flex justify-between items-center mb-6">
          <h1 className="text-xl font-black text-red-500 uppercase tracking-tighter">Super Admin</h1>
          <button onClick={fetchRequests} className="text-xs bg-slate-700 px-3 py-1 rounded font-bold hover:bg-slate-600">Refresh</button>
      </div>

      <div className="space-y-3">
        {requests.length === 0 ? <p className="text-center opacity-30 mt-10 text-sm font-bold uppercase">No pending requests</p> : 
         requests.map(tx => (
           <div key={tx.id} className="bg-slate-800 p-4 rounded-xl border border-white/5 shadow-lg">
              <div className="flex justify-between mb-2">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${tx.type === 'DEPOSIT' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>{tx.type}</span>
                  <span className="font-mono font-bold text-lg">{tx.amount} ETB</span>
              </div>
              <div className="text-xs opacity-60 mb-2 font-bold">User: {tx.user?.firstName}</div>
              
              <div className="grid grid-cols-2 gap-2 text-[10px] opacity-50 font-mono mb-3 bg-black/20 p-2 rounded">
                  <div>REF: {tx.ref || 'N/A'}</div>
                  <div>TEL: {tx.phone || 'N/A'}</div>
              </div>
              
              <div className="flex gap-2 mt-2">
                  <button onClick={() => handleTx(tx.id, 'APPROVE')} disabled={loading} className="flex-1 bg-green-600 py-3 rounded-lg font-bold text-xs hover:bg-green-500 active:scale-95 transition-all">APPROVE</button>
                  <button onClick={() => handleTx(tx.id, 'REJECT')} disabled={loading} className="flex-1 bg-red-600 py-3 rounded-lg font-bold text-xs hover:bg-red-500 active:scale-95 transition-all">REJECT</button>
              </div>
           </div>
         ))
        }
      </div>
    </div>
  );
};

export default SuperAdmin;