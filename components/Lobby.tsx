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
    <div className={`flex flex-col h-full ${bgColor} animate-fadeIn transition-colors duration-500 overflow-hidden`}>
      <div className="flex-1 px-4 py-2 flex flex-col justify-start items-center overflow-hidden">
        <div className={`${cardBg} p-1.5 rounded-xl border border-white/5 shadow-2xl w-full max-w-[320px]`}>
          <div className="grid grid-cols-10 gap-0.5 sm:gap-1 justify-items-center">
            {numbers.map((num) => {
              const isActive = selectedNumber === num;
              return (
                <button
                  key={num}
                  onClick={() => setSelectedNumber(num)}
                  className={`w-full aspect-square rounded-md text-[9px] font-black flex items-center justify-center transition-all border-b-2 ${
                    isActive ? 'bg-green-500 text-white border-green-700 scale-110 z-10' : 
                    otherPicks.includes(num) ? 'bg-orange-500 text-white border-orange-700 opacity-90' : 
                    isDarkMode ? 'bg-white/5 text-white/40 border-white/5' : 'bg-white/20 text-white/60 border-white/10'
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-transparent px-4 pb-20 shrink-0 flex flex-col gap-4">
        <div className="flex justify-center h-32 items-center">
           {previewBoard ? (
             <div className="w-28 h-28 bg-white p-1 rounded grid grid-cols-5 gap-0.5">
                {previewBoard.flat().map((v, i) => (
                    <div key={i} className={`flex items-center justify-center text-[6px] font-black rounded-[1px] ${v === '*' ? 'bg-orange-500 text-white' : 'bg-teal-50 text-teal-900'}`}>{v === '*' ? '★' : v}</div>
                ))}
             </div>
           ) : <div className="text-white/40 text-xs font-bold uppercase">Select a Board</div>}
        </div>

        <button 
          onClick={() => selectedNumber && onBoardSelect(selectedNumber)}
          disabled={!selectedNumber}
          className={`w-full py-4 rounded-2xl font-black uppercase tracking-widest shadow-lg ${!selectedNumber ? 'bg-gray-500 opacity-50' : 'bg-orange-500 text-white'}`}
        >
          Continue
        </button>
      </div>
    </div>
  );
};
export default Lobby;