
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
        if (next.length > 12) next.shift();
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
    }, 1000);
  };

  const containerColor = isDarkMode ? 'bg-[#0f172a]' : 'bg-[#a28cd1]';
  const gridCardColor = isDarkMode ? 'bg-gray-900/50' : 'bg-white/10';
  const btnColor = isDarkMode ? 'bg-gray-800 text-gray-500' : 'bg-white/10 text-white/50';
  const activeBtnColor = isDarkMode ? 'bg-indigo-600 text-white' : 'bg-white text-[#a28cd1]';

  return (
    <div className={`flex flex-col h-full ${containerColor} animate-fadeIn relative transition-colors duration-500`}>
      
      {/* HEADER: PROTECTED SPACE FOR STAKES AND PREVIEW */}
      <div className={`shrink-0 z-40 px-4 py-3 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#a28cd1]'} border-b border-white/10 shadow-lg`}>
        <div className="flex justify-between items-center mb-3">
          <div className={`flex-1 flex gap-1 ${isDarkMode ? 'bg-black/40' : 'bg-black/10'} rounded-xl p-1`}>
            {stakes.map(s => (
              <button
                key={s}
                onClick={() => setStake(s)}
                className={`flex-1 py-2 rounded-lg font-black text-[11px] transition-all
                  ${stake === s ? activeBtnColor + ' shadow-md' : 'text-white/40'}`}
              >
                {s} ETB
              </button>
            ))}
          </div>
        </div>

        {selectedNumber ? (
          <div className="flex gap-4 items-center bg-white/10 p-2.5 rounded-2xl animate-slideDown border border-white/5">
            <div className={`${isDarkMode ? 'bg-gray-900' : 'bg-white'} p-1.5 rounded-lg border border-white/20 shadow-xl w-20 shrink-0`}>
              <div className="grid grid-cols-5 gap-0.5">
                {previewBoard?.flat().map((val, i) => (
                  <div key={i} className={`aspect-square rounded-[1px] flex items-center justify-center text-[5px] font-black ${val === '*' ? 'bg-orange-500 text-white' : isDarkMode ? 'bg-gray-800 text-white/40' : 'bg-purple-50 text-purple-900'}`}>
                    {val === '*' ? '★' : val}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1">
              <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.1em] mb-0.5">Selected Card</p>
              <h4 className="text-2xl font-black text-white leading-none">#{selectedNumber}</h4>
              <div className="flex items-center gap-1.5 mt-1.5">
                <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                <span className="text-[9px] text-green-200 font-black uppercase tracking-wider">Ready to Enter</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="py-8 text-center border-2 border-dashed border-white/10 rounded-2xl">
            <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.2em]">Pick a card number to begin</p>
          </div>
        )}
      </div>

      {/* INDEPENDENTLY SCROLLABLE GRID */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-40 custom-scrollbar">
        <div className={`${gridCardColor} p-4 rounded-[2.5rem] border border-white/5 shadow-2xl`}>
          <div className="grid grid-cols-10 gap-2 justify-items-center">
            {numbers.map((num) => {
              const isUserSelected = selectedNumber === num;
              const isOtherSelected = otherPicks.includes(num);
              
              return (
                <button
                  key={num}
                  onClick={() => setSelectedNumber(num)}
                  className={`w-full aspect-square rounded-xl text-[12px] font-black flex items-center justify-center transition-all duration-300
                    ${isUserSelected 
                      ? activeBtnColor + ' scale-110 shadow-2xl ring-2 ring-white/60 z-10' 
                      : isOtherSelected 
                      ? 'bg-orange-500/20 text-orange-200/40 ring-1 ring-orange-500/30' 
                      : btnColor + ' hover:bg-white/20'}`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* FLOATING ACTION DOCK */}
      <div className={`fixed bottom-[88px] left-0 right-0 px-6 py-4 flex gap-4 justify-center items-center z-40 ${isDarkMode ? 'bg-gray-900/90' : 'bg-[#a28cd1]/90'} backdrop-blur-md border-t border-white/10 rounded-t-3xl`}>
        <button 
          onClick={() => {
            setSelectedNumber(null);
            setOtherPicks([]);
          }} 
          className="w-14 h-14 bg-white/10 text-white rounded-2xl flex items-center justify-center shadow-lg active:scale-90 transition-transform border border-white/10"
        >
          <i className="fas fa-rotate text-lg"></i>
        </button>
        <button 
          onClick={handleStartGameClick} 
          disabled={selectedNumber === null || loading} 
          className={`flex-1 h-14 rounded-2xl font-black text-sm shadow-2xl transition-all active:scale-95 uppercase border-b-4 flex items-center justify-center gap-3
            ${selectedNumber === null || loading 
              ? 'bg-gray-400/20 text-white/20 border-black/10' 
              : 'bg-[#f07156] text-white border-red-800'}`}
        >
          {loading ? <i className="fas fa-circle-notch animate-spin"></i> : (
            <>
              <i className="fas fa-play text-xs"></i>
              Start Game
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default Lobby;
