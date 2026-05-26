import React, { useState, useEffect, useMemo } from 'react';
import { generateFairBoard } from '../utils';

interface LobbyProps {
  onBoardSelect: (num: number) => void;
  selectedNumber: number | null;
  setSelectedNumber: (num: number | null) => void;
  isDarkMode: boolean;
}

// Removed React.FC and explicitly destructured LobbyProps to prevent VS Code "any" errors
const Lobby = ({ onBoardSelect, selectedNumber, setSelectedNumber, isDarkMode }: LobbyProps) => {
  const [otherPicks, setOtherPicks] = useState<number[]>([]);
  const numbers = Array.from({ length: 100 }, (_, i) => i + 1);

  useEffect(() => {
    const interval = setInterval(() => {
      // Explicitly typed (prev: number[]) to satisfy strict local TypeScript rules
      setOtherPicks((prev: number[]) => {
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
    <div className={`fixed inset-0 w-full h-full ${bgColor} overflow-hidden`}>
      
      {/* TOP SECTION: 1-100 GRID */}
      <div className="absolute top-0 left-0 right-0 bottom-[90px] p-2 flex items-center justify-center">
        <div className={`${cardBg} p-1 rounded-xl shadow-2xl w-full max-w-[380px] aspect-square flex flex-col`}>
          
          <div 
            className="grid grid-cols-10 gap-[1px] w-full h-full"
            style={{ gridTemplateRows: 'repeat(10, minmax(0, 1fr))' }}
          >
            {numbers.map((num) => {
              const isActive = selectedNumber === num;
              return (
                <button
                  key={num}
                  onClick={() => setSelectedNumber(num)}
                  className={`w-full h-full text-[10px] sm:text-[11px] font-black flex items-center justify-center transition-colors ${
                    isActive ? 'bg-green-500 text-white shadow-lg border-b-2 border-green-700 z-10 scale-110 rounded-sm' : 
                    otherPicks.includes(num) ? 'bg-orange-500 text-white opacity-90 rounded-[2px]' : 
                    isDarkMode ? 'bg-white/5 text-white/40 rounded-[2px] hover:bg-white/10' : 'bg-white/20 text-white/60 rounded-[2px] hover:bg-white/30'
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>

        </div>
      </div>

      {/* BOTTOM SECTION: SIDE-BY-SIDE CONTROLS */}
      <div className="absolute bottom-0 left-0 right-0 h-[90px] w-full px-4 flex items-center justify-between gap-4 bg-black/20 border-t border-white/5">
        
        {/* MINI PREVIEW (Left Side) */}
        <div className="w-[60px] h-[60px] shrink-0 flex items-center justify-center bg-black/30 rounded-md p-1 border border-white/10">
           {previewBoard ? (
             <div 
               className="w-full h-full bg-white p-[1px] rounded-[3px] grid grid-cols-5 gap-[1px]"
               style={{ gridTemplateRows: 'repeat(5, minmax(0, 1fr))' }}
             >
                {previewBoard.flat().map((v: string | number, i: number) => (
                    <div key={i} className={`flex items-center justify-center text-[5px] font-black rounded-[1px] ${v === '*' ? 'bg-orange-500 text-white' : 'bg-teal-50 text-teal-900'}`}>
                      {v === '*' ? '★' : v}
                    </div>
                ))}
             </div>
           ) : (
             <span className="text-white/30 text-[8px] font-bold text-center leading-tight">NO<br/>BOARD</span>
           )}
        </div>

        {/* START BUTTON (Right Side) */}
        <button 
          onClick={() => selectedNumber && onBoardSelect(selectedNumber)}
          disabled={!selectedNumber}
          className={`flex-1 h-[60px] rounded-xl font-black text-lg uppercase tracking-widest shadow-lg active:scale-95 transition-all ${!selectedNumber ? 'bg-white/10 text-white/30 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-400'}`}
        >
          Start Game
        </button>

      </div>
    </div>
  );
};

export default Lobby;