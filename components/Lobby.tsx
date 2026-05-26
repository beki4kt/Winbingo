import React, { useState, useEffect, useMemo } from 'react';
import { generateFairBoard } from '../utils';

interface LobbyProps {
  onBoardSelect: (num: number) => void;
  selectedNumber: number | null;
  setSelectedNumber: (num: number | null) => void;
  isDarkMode: boolean;
}

const Lobby = ({ onBoardSelect, selectedNumber, setSelectedNumber, isDarkMode }: LobbyProps) => {
  const [otherPicks, setOtherPicks] = useState<number[]>([]);
  const numbers = Array.from({ length: 100 }, (_, i) => i + 1);

  // Simulate other players picking boards
  useEffect(() => {
    const interval = setInterval(() => {
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

  // Generate the preview board when a number is selected
  const previewBoard = useMemo(() => selectedNumber ? generateFairBoard(selectedNumber) : null, [selectedNumber]);
  
  const bgColor = isDarkMode ? 'bg-[#0f172a]' : 'bg-[#065f46]';
  const cardBg = isDarkMode ? 'bg-white/5' : 'bg-white/10';

  return (
    <div className={`flex flex-col h-full w-full ${bgColor} overflow-hidden`}>
      
      {/* TOP SECTION: 1-100 GRID 
          Using 'flex-1 relative' and 'absolute inset-0' guarantees the grid 
          only fills available space and NEVER pushes the bottom bar out. 
      */}
      <div className="flex-1 relative min-h-0 w-full z-10">
        <div className="absolute inset-0 p-2 sm:p-4 flex items-center justify-center">
          
          <div className={`${cardBg} p-1 rounded-xl shadow-lg aspect-square w-full max-w-[420px] max-h-full flex flex-col border border-white/5`}>
            
            {/* Inline grid template rows guarantee exactly 10 rows */}
            <div 
              className="w-full h-full grid grid-cols-10 gap-[1px]"
              style={{ gridTemplateRows: 'repeat(10, minmax(0, 1fr))' }}
            >
              {numbers.map((num) => {
                const isActive = selectedNumber === num;
                return (
                  <button
                    key={num}
                    onClick={() => setSelectedNumber(num)}
                    className={`w-full h-full text-[10px] sm:text-[12px] font-black flex items-center justify-center transition-colors leading-none ${
                      isActive ? 'bg-green-500 text-white shadow-xl border-b-2 border-green-700 z-10 scale-110 rounded-sm' : 
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
      </div>

      {/* BOTTOM SECTION: SIDE-BY-SIDE CONTROLS
          shrink-0 locks this to exactly 80px tall. It cannot be squeezed.
      */}
      <div className="shrink-0 h-[80px] w-full px-3 sm:px-4 flex items-center justify-between gap-3 sm:gap-4 bg-black/20 border-t border-white/5 z-20 relative">
        
        {/* MINI PREVIEW CARD (Left Side) */}
        <div className="w-[55px] h-[55px] sm:w-[60px] sm:h-[60px] shrink-0 flex items-center justify-center bg-black/30 rounded-md p-1 border border-white/10 shadow-inner">
           {previewBoard ? (
             <div 
               className="w-full h-full bg-white p-[1px] rounded-[3px] grid grid-cols-5 gap-[1px]"
               style={{ gridTemplateRows: 'repeat(5, minmax(0, 1fr))' }}
             >
                {previewBoard.flat().map((v: string | number, i: number) => (
                    <div key={i} className={`flex items-center justify-center text-[5px] sm:text-[6px] font-black rounded-[1px] leading-none ${v === '*' ? 'bg-orange-500 text-white' : 'bg-teal-50 text-teal-900'}`}>
                      {v === '*' ? '★' : v}
                    </div>
                ))}
             </div>
           ) : (
             <span className="text-white/30 text-[8px] font-bold text-center leading-tight">NO<br/>BOARD</span>
           )}
        </div>

        {/* START GAME BUTTON (Right Side) */}
        <button 
          onClick={() => selectedNumber && onBoardSelect(selectedNumber)}
          disabled={!selectedNumber}
          className={`flex-1 h-[55px] sm:h-[60px] rounded-xl font-black text-lg sm:text-xl uppercase tracking-widest shadow-lg active:scale-95 transition-all ${
            !selectedNumber 
              ? 'bg-white/10 text-white/30 cursor-not-allowed border border-white/5' 
              : 'bg-orange-500 text-white hover:bg-orange-400 border border-orange-400'
          }`}
        >
          Start Game
        </button>

      </div>

    </div>
  );
};

export default Lobby;