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
    <div className={`flex flex-col h-[100dvh] w-full ${bgColor} overflow-hidden`}>
      
      {/* TOP SECTION: 1-100 GRID 
        Strictly contained to never push the screen bounds.
      */}
      <div className="flex-1 flex items-center justify-center p-2 min-h-0">
        <div className={`${cardBg} p-1 rounded-lg border border-white/5 shadow-2xl w-full max-w-[400px] aspect-square flex flex-col`}>
          <div className="grid grid-cols-10 grid-rows-10 gap-[1px] w-full h-full">
            {numbers.map((num) => {
              const isActive = selectedNumber === num;
              return (
                <button
                  key={num}
                  onClick={() => setSelectedNumber(num)}
                  className={`w-full h-full text-[10px] font-black flex items-center justify-center ${
                    isActive ? 'bg-green-500 text-white scale-[1.15] z-10 shadow-lg border-b-2 border-green-700 rounded-sm' : 
                    otherPicks.includes(num) ? 'bg-orange-500 text-white opacity-90 rounded-[1px]' : 
                    isDarkMode ? 'bg-white/5 text-white/40 rounded-[1px]' : 'bg-white/20 text-white/60 rounded-[1px]'
                  }`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION: SIDE-BY-SIDE CONTROLS
        Putting the preview and button horizontally saves vertical space 
        and creates a 100% unscrollable structural alignment.
      */}
      <div className="h-[90px] shrink-0 flex items-center justify-between px-4 pb-6 gap-4">
        
        {/* MINI PREVIEW (Pinned to the Left) */}
        <div className="w-[60px] h-[60px] shrink-0 flex items-center justify-center bg-black/20 rounded-md p-1 border border-white/10">
           {previewBoard ? (
             <div className="w-full h-full bg-white p-[1px] rounded-[3px] grid grid-cols-5 gap-[1px]">
                {previewBoard.flat().map((v, i) => (
                    <div key={i} className={`flex items-center justify-center text-[5px] font-black rounded-[1px] ${v === '*' ? 'bg-orange-500 text-white' : 'bg-teal-50 text-teal-900'}`}>
                      {v === '*' ? '★' : v}
                    </div>
                ))}
             </div>
           ) : (
             <span className="text-white/40 text-[8px] font-bold text-center leading-tight">NO<br/>BOARD</span>
           )}
        </div>

        {/* START BUTTON (Pinned to the Right, stretches to fill) */}
        <button 
          onClick={() => selectedNumber && onBoardSelect(selectedNumber)}
          disabled={!selectedNumber}
          className={`flex-1 h-[55px] rounded-xl font-black text-lg uppercase tracking-widest shadow-lg transition-transform active:scale-95 ${!selectedNumber ? 'bg-gray-500 opacity-50' : 'bg-orange-500 text-white'}`}
        >
          Start Game
        </button>

      </div>
    </div>
  );
};

export default Lobby;