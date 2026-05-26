import React, { useState, useEffect, useMemo } from 'react';
import { generateFairBoard } from '../utils';

// ==========================================
// 🧩 INTERFACES & TYPES
// ==========================================
interface LobbyProps {
  onBoardSelect: (num: number) => void;
  selectedNumber: number | null;
  setSelectedNumber: (num: number | null) => void;
  isDarkMode: boolean;
}

// ==========================================
// 🚀 LOBBY COMPONENT
// ==========================================
const Lobby: React.FC<LobbyProps> = ({ 
  onBoardSelect, 
  selectedNumber, 
  setSelectedNumber, 
  isDarkMode 
}) => {
  // 1. Initialize State
  const [otherPicks, setOtherPicks] = useState<number[]>([]);
  
  // 2. Generate exactly 100 numbers for the board selection grid
  const numbers = useMemo(() => Array.from({ length: 100 }, (_, i) => i + 1), []);

  // 3. Simulate live multiplayer lobby activity (Other players picking boards)
  useEffect(() => {
    const interval = setInterval(() => {
      setOtherPicks((prev: number[]) => {
        const newPick = Math.floor(Math.random() * 100) + 1;
        const current = [...prev];
        
        // Keep array size manageable to simulate a fast-moving lobby
        if (current.length > 15) {
          current.shift();
        }
        
        // Prevent picking the user's currently selected number
        if (newPick === selectedNumber || current.includes(newPick)) {
          return current;
        }
        
        return [...current, newPick];
      });
    }, 2500);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  }, [selectedNumber]);

  // 4. Generate the 5x5 Preview Board Matrix when a user taps a number
  const previewBoard = useMemo(() => {
    return selectedNumber ? generateFairBoard(selectedNumber) : null;
  }, [selectedNumber]);

  // 5. Dynamic Styling Constants based on Dark Mode
  const bgColor = isDarkMode ? 'bg-[#0f172a]' : 'bg-[#065f46]';
  const cardBg = isDarkMode ? 'bg-white/5' : 'bg-white/10';
  const gridBorder = isDarkMode ? 'border-white/5' : 'border-white/10';
  const headerTextColor = isDarkMode ? 'text-white/40' : 'text-white/60';

  return (
    // MAIN WRAPPER: 
    // h-full ensures it fits perfectly inside App.tsx without overriding the Header.
    // overflow-hidden prevents any accidental scrolling.
    <div className={`flex flex-col h-full w-full ${bgColor} overflow-hidden transition-colors duration-500`}>
      
      {/* ==========================================
        TOP SECTION: 1-100 SELECTION GRID 
        ==========================================
        CRITICAL LAYOUT FIX: 
        We use 'flex-1 relative' for the parent container. 
        Inside, we use 'absolute inset-0'. This forces the grid to ONLY fill 
        available space without ever expanding its parent. It literally cannot 
        push the bottom buttons off the screen.
      */}
      <div className="flex-1 relative min-h-0 w-full z-10">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-2 sm:p-4">
          
          {/* Section Title / Helper Text */}
          <div className="mb-2 text-center">
            <span className={`text-[10px] font-black uppercase tracking-widest ${headerTextColor}`}>
              Select Your Lucky Board
            </span>
          </div>

          {/* Grid Bounding Box: Locks aspect ratio so it stays a perfect square */}
          <div className={`${cardBg} p-1 rounded-xl shadow-2xl aspect-square w-full max-w-[420px] max-h-full flex flex-col border ${gridBorder} backdrop-blur-sm`}>
            
            {/* THE 10x10 GRID:
              Using raw CSS inline styles for gridTemplateRows and gridTemplateColumns 
              guarantees it divides into exactly 100 perfectly equal squares, ignoring 
              Tailwind's row limits.
            */}
            <div 
              className="w-full h-full grid gap-[1px]"
              style={{ 
                gridTemplateColumns: 'repeat(10, minmax(0, 1fr))',
                gridTemplateRows: 'repeat(10, minmax(0, 1fr))' 
              }}
            >
              {numbers.map((num) => {
                const isActive = selectedNumber === num;
                const isPickedByOther = otherPicks.includes(num);
                
                // Dynamic styles for each individual cell
                let cellStyle = isDarkMode 
                  ? 'bg-white/5 text-white/40 hover:bg-white/10' 
                  : 'bg-white/20 text-white/60 hover:bg-white/30';
                
                if (isActive) {
                  cellStyle = 'bg-green-500 text-white shadow-xl border-b-2 border-green-700 z-10 scale-110 rounded-sm';
                } else if (isPickedByOther) {
                  cellStyle = 'bg-orange-500 text-white opacity-90 rounded-[2px] pointer-events-none scale-95';
                }

                return (
                  <button
                    key={`board-btn-${num}`}
                    onClick={() => setSelectedNumber(num)}
                    disabled={isPickedByOther}
                    className={`w-full h-full text-[10px] sm:text-[12px] font-black flex items-center justify-center transition-all duration-200 leading-none rounded-[2px] ${cellStyle}`}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
            
          </div>
        </div>
      </div>

      {/* ==========================================
        BOTTOM SECTION: SIDE-BY-SIDE CONTROLS
        ==========================================
        shrink-0 locks this div to a precise height. 
        It sits horizontally (flex-row) to preserve maximum vertical space for the grid.
      */}
      <div className="shrink-0 h-[85px] sm:h-[95px] w-full px-4 flex flex-row items-center justify-between gap-4 bg-black/20 border-t border-white/5 z-20 backdrop-blur-md pb-safe">
        
        {/* --- LEFT SIDE: MINI PREVIEW CARD --- */}
        <div className="w-[60px] h-[60px] sm:w-[65px] sm:h-[65px] shrink-0 flex flex-col items-center justify-center bg-black/40 rounded-lg p-1 border border-white/10 shadow-inner relative overflow-hidden">
           {previewBoard ? (
             <div 
               className="w-full h-full bg-white p-[1px] rounded-[4px] grid gap-[1px]"
               style={{ 
                 gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
                 gridTemplateRows: 'repeat(5, minmax(0, 1fr))' 
               }}
             >
                {/* Flatten the 5x5 matrix to map the visual mini-board */}
                {previewBoard.flat().map((val: string | number, idx: number) => {
                    const isStar = val === '*';
                    return (
                      <div 
                        key={`preview-cell-${idx}`} 
                        className={`flex items-center justify-center text-[5px] sm:text-[6px] font-black rounded-[1px] leading-none ${
                          isStar ? 'bg-orange-500 text-white' : 'bg-teal-50 text-teal-900'
                        }`}
                      >
                        {isStar ? '★' : val}
                      </div>
                    )
                })}
             </div>
           ) : (
             <div className="flex flex-col items-center justify-center w-full h-full">
               <span className="text-white/20 text-[12px] mb-1">👀</span>
               <span className="text-white/30 text-[7px] font-black tracking-wider text-center leading-tight">
                 NO<br/>BOARD
               </span>
             </div>
           )}
        </div>

        {/* --- RIGHT SIDE: START GAME BUTTON --- */}
        <button 
          onClick={() => {
            // Haptic feedback trigger for Telegram Mini App
            if (window.Telegram?.WebApp?.HapticFeedback) {
              window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
            }
            if (selectedNumber) onBoardSelect(selectedNumber);
          }}
          disabled={!selectedNumber}
          className={`flex-1 h-[60px] sm:h-[65px] rounded-xl font-black text-lg sm:text-xl uppercase tracking-widest shadow-lg transition-all duration-300 flex items-center justify-center gap-2 ${
            !selectedNumber 
              ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5 scale-100' 
              : 'bg-gradient-to-b from-orange-400 to-orange-600 text-white hover:from-orange-300 hover:to-orange-500 border border-orange-400 active:scale-95 shadow-[0_0_15px_rgba(249,115,22,0.4)]'
          }`}
        >
          {selectedNumber ? (
            <>
              <span>Start Game</span>
              <svg className="w-5 h-5 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3"></path>
              </svg>
            </>
          ) : (
            <span>Start Game</span>
          )}
        </button>

      </div>

    </div>
  );
};

export default Lobby;