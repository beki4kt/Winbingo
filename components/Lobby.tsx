
import React, { useState, useEffect, useMemo } from 'react';
import { generateFairBoard } from '../utils';

interface LobbyProps {
  onStartGame: (num: number, stake: number, roomId: string) => void;
  selectedNumber: number | null;
  setSelectedNumber: (num: number | null) => void;
  activeRoomIds: string[];
  isDarkMode: boolean;
}

const Lobby: React.FC<LobbyProps> = ({ onStartGame, selectedNumber, setSelectedNumber, activeRoomIds, isDarkMode }) => {
  const [loading, setLoading] = useState(false);
  const [stake, setStake] = useState<number>(10);
  const [otherPicks, setOtherPicks] = useState<number[]>([]);
  const numbers = Array.from({ length: 100 }, (_, i) => i + 1);

  const stakes = [10, 25, 50, 100];

  const previewBoard = useMemo(() => {
    return selectedNumber ? generateFairBoard(selectedNumber) : null;
  }, [selectedNumber]);

  useEffect(() => {
    const interval = setInterval(() => {
      setOtherPicks(prev => {
        const next = [...prev];
        if (next.length > 15) next.shift();
        let pick;
        do {
          pick = Math.floor(Math.random() * 100) + 1;
        } while (pick === selectedNumber || next.includes(pick));
        return [...next, pick];
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [selectedNumber]);

  const handleStartGameClick = () => {
    if (selectedNumber === null) return;
    setLoading(true);
    setTimeout(() => {
      const randomRoomId = 'ARENA-' + (Math.floor(Math.random() * 8999) + 1000);
      onStartGame(selectedNumber, stake, randomRoomId);
      setLoading(false);
    }, 1200);
  };

  const handleRefresh = () => {
    setSelectedNumber(null);
    setOtherPicks([]);
  };

  const containerColor = isDarkMode ? 'bg-[#0f172a]' : 'bg-[#a28cd1]';
  const gridCardColor = isDarkMode ? 'bg-gray-900/50' : 'bg-white/10';
  const btnColor = isDarkMode ? 'bg-gray-800 text-gray-400' : 'bg-white/20 text-purple-900/60';
  const activeBtnColor = isDarkMode ? 'bg-indigo-600 text-white' : 'bg-white text-[#a28cd1]';

  return (
    <div className={`flex flex-col min-h-full ${containerColor} animate-fadeIn relative pb-96 transition-colors duration-500`}>
      <div className="px-4 py-2">
        <div className={`flex justify-between items-center ${isDarkMode ? 'bg-black/40' : 'bg-black/10'} rounded-2xl p-1`}>
          {stakes.map(s => (
            <button
              key={s}
              onClick={() => setStake(s)}
              className={`flex-1 py-2 rounded-xl font-black text-[11px] transition-all
                ${stake === s 
                  ? activeBtnColor + ' shadow-md scale-105' 
                  : 'text-white/40'}`}
            >
              {s} ETB
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 py-2 overflow-visible">
        <div className={`${gridCardColor} p-4 rounded-[2.5rem] border border-white/10 shadow-xl`}>
          <div className="grid grid-cols-10 gap-1.5 justify-items-center">
            {numbers.map((num) => {
              const isUserSelected = selectedNumber === num;
              const isOtherSelected = otherPicks.includes(num);
              
              return (
                <button
                  key={num}
                  onClick={() => setSelectedNumber(num)}
                  className={`w-full aspect-square rounded-lg text-[12px] font-black flex items-center justify-center transition-all duration-200
                    ${isUserSelected 
                      ? activeBtnColor + ' scale-110 shadow-lg ring-2 ring-white/50' 
                      : isOtherSelected 
                      ? 'bg-white/5 text-white/5' 
                      : btnColor + ' hover:opacity-80'}`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {selectedNumber && (
        <div className="fixed bottom-[180px] left-6 z-20 animate-fadeIn pointer-events-none origin-bottom-left">
          <div className={`${isDarkMode ? 'bg-gray-900 ring-indigo-500/50' : 'bg-white/95 ring-purple-200'} backdrop-blur-md p-2.5 rounded-2xl border-2 border-white/20 shadow-[0_15px_35px_rgba(0,0,0,0.5)] w-32 ring-1`}>
            <div className="flex justify-between items-center mb-1.5 px-0.5">
              <p className={`text-[8px] font-black uppercase ${isDarkMode ? 'text-indigo-400' : 'text-purple-900'} tracking-tighter`}>Card #{selectedNumber}</p>
            </div>
            <div className="grid grid-cols-5 gap-1">
              {previewBoard?.flat().map((val, i) => (
                <div 
                  key={i} 
                  className={`aspect-square rounded-[3px] flex items-center justify-center text-[7px] font-black
                    ${val === '*' 
                      ? 'bg-[#f48120] text-white animate-pulse' 
                      : isDarkMode 
                        ? 'bg-gray-800 text-gray-300 border border-gray-700' 
                        : 'bg-purple-50 text-purple-900 border border-purple-100'}`}
                >
                  {val === '*' ? '★' : val}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="fixed bottom-[100px] left-0 right-0 px-6 flex gap-4 justify-center items-center z-30">
        <button onClick={handleRefresh} className="flex-1 bg-[#4b91f7] text-white py-4 rounded-2xl font-black text-sm shadow-xl active:scale-95 transition-all uppercase border-b-4 border-blue-600">Refresh</button>
        <button onClick={handleStartGameClick} disabled={selectedNumber === null || loading} className={`flex-1 py-4 rounded-2xl font-black text-sm shadow-xl transition-all active:scale-95 uppercase border-b-4 ${selectedNumber === null || loading ? 'bg-[#f07156]/40 text-white/50 border-red-900/10' : 'bg-[#f07156] text-white border-red-700'}`}>
          {loading ? <i className="fas fa-circle-notch animate-spin"></i> : 'Start Game'}
        </button>
      </div>
    </div>
  );
};

export default Lobby;
