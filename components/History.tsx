import React, { useEffect, useState } from 'react';

interface HistoryProps {
  userId: string | null;
  isDarkMode: boolean;
}

const History: React.FC<HistoryProps> = ({ userId, isDarkMode }) => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if(!userId) return;
    fetch(`/api/history/${userId}`)
      .then(r => r.json())
      .then(d => { setHistory(Array.isArray(d) ? d : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [userId]);

  return (
    <div className="p-4 h-full overflow-y-auto pb-32 animate-fadeIn text-white">
      <h2 className="text-xl font-black mb-4 px-2">Game History</h2>
      {loading ? <div className="text-center opacity-50 mt-10">Loading...</div> : (
        <div className="flex flex-col gap-2">
           {history.length === 0 ? <div className="text-center opacity-50 mt-10">No games played yet.</div> : 
             history.map((item) => (
               <div key={item.id} className={`${isDarkMode ? 'bg-slate-800' : 'bg-white/10'} p-4 rounded-2xl flex justify-between items-center border border-white/5`}>
                  <div>
                      <div className={`text-xs font-black px-2 py-0.5 rounded w-fit mb-1 ${item.result === 'WIN' ? 'bg-green-500' : item.result === 'LOSS' ? 'bg-red-500' : 'bg-blue-500'}`}>
                          {item.result}
                      </div>
                      <div className="text-[10px] opacity-50">{new Date(item.date).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                      <div className="font-black">{item.result === 'WIN' ? `+${item.amount}` : `-${item.stake}`} ETB</div>
                      <div className="text-[10px] opacity-60">Room: {item.roomId}</div>
                  </div>
               </div>
             ))
           }
        </div>
      )}
    </div>
  );
};
export default History;