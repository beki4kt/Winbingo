import React, { useState, useEffect, useMemo } from 'react';
import { generateFairBoard } from '../utils';

interface LobbyProps {
  onBoardSelect: (num: number) => void;
  selectedNumber: number | null;
  setSelectedNumber: (num: number | null) => void;
  isDarkMode: boolean;
}

const Lobby: React.FC<LobbyProps> = ({ onBoardSelect, selectedNumber, setSelectedNumber, isDarkMode }) => {
  const [otherPicks, setOtherPicks] = useState<number[]>([]);
  const numbers = Array.from({ length: 100 }, (_, i) => i + 1);

  useEffect(() => {
    const interval = setInterval(() => {
      setOtherPicks(prev => {
        const newPick = Math.floor(Math.random() * 100) + 1;
        const current = [...prev];
        if (current.length > 15) current.shift();
        if (newPick === selectedNumber || current.includes(newPick)) return current;
        return [...current, newPick];
      });
    }, 2500);
    return () => clearInterval(interval);
  }, [selectedNumber]);

  const previewBoard = useMemo(() => selectedNumber ? generateFairBoard(selectedNumber) : null, [selectedNumber]);
  const bgColor = isDarkMode ? 'bg-[#0f172a]' : 'bg-[#065f46]';
  const cardBg = isDarkMode ? 'bg-white/5' : 'bg-white/10';

  return (
    <div className={`flex flex-col h-[100dvh] w-full ${bgColor} animate-fadeIn transition-colors duration-500 overflow-hidden`}>
      
      {/* Top Section: Tightly Packed 1-100 Grid */}
      <div className="flex-1 px-2 flex items-center justify-center min-h-0 overflow-hidden">
        <div className={`${cardBg} p-1 rounded-lg border border-white/5 shadow-2xl w-full max-w-[360px] aspect-square`}>
          <div className="grid grid-cols-10 grid-rows-10 gap-[1px] w-full h-full">
            {numbers.map((num) => {
              const isActive = selectedNumber === num;
              return (
                <button
                  key={num}
                  onClick={() => setSelectedNumber(num)}
                  className={`w-full h-full rounded-[1px] text-[8px] sm:text-[9px] font-black flex items-center justify-center transition-all ${
                    isActive ? 'bg-green-500 text-white scale-110 z-10 shadow-md border-b border-green-700' : 
                    otherPicks.includes(num) ? 'bg-orange-500 text-white opacity-90' : 
                    isDarkMode ? 'bg-white/5 text-white/40' : 'bg-white/20 text-white/60'
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Bottom Section: Shrunk Preview & Start Game Button */}
      <div className="shrink-0 px-4 pb-4 sm:pb-6 flex flex-col gap-2 items-center justify-end">
        <div className="flex justify-center items-center h-[70px]">
           {previewBoard ? (
             <div className="w-[64px] h-[64px] bg-white p-[2px] rounded grid grid-cols-5 gap-[1px] shadow-inner">
                {previewBoard.flat().map((v, i) => (
                    <div key={i} className={`flex items-center justify-center text-[5px] font-black rounded-[1px] ${v === '*' ? 'bg-orange-500 text-white' : 'bg-teal-50 text-teal-900'}`}>
                      {v === '*' ? '★' : v}
                    </div>
                ))}
             </div>
           ) : (
             <div className="text-white/40 text-[10px] font-bold uppercase tracking-widest text-center">
               Select<br/>Board
             </div>
           )}
        </div>

        <button 
          onClick={() => selectedNumber && onBoardSelect(selectedNumber)}
          disabled={!selectedNumber}
          className={`w-full max-w-[360px] py-2.5 sm:py-3 rounded-xl font-black uppercase tracking-widest shadow-lg active:scale-95 transition-transform text-sm ${!selectedNumber ? 'bg-gray-500 opacity-50' : 'bg-orange-500 text-white'}`}
        >
          Start Game
        </button>
      </div>

    </div>
  );
};

export default Lobby;