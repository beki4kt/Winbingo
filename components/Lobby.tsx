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

  // Sped up to 1500ms so you can see the glowing orange lights move faster!
  useEffect(() => {
    const interval = setInterval(() => {
      setOtherPicks(prev => {
        const newPick = Math.floor(Math.random() * 100) + 1;
        const current = [...prev];
        if (current.length > 15) current.shift();
        if (newPick === selectedNumber || current.includes(newPick)) return current;
        return [...current, newPick];
      });
    }, 1500); 
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
              const isOtherPick = otherPicks.includes(num);

              // 🟢 THE NEW LIGHTING LOGIC 🟢
              let btnClass = isDarkMode ? 'bg-white/5 text-white/40 border-white/5' : 'bg-white/20 text-white/60 border-white/10';
              
              if (isActive) {
                // Your selected board gets a bright neon green glow and a ring
                btnClass = 'bg-green-500 text-white border-green-700 scale-[1.15] z-20 shadow-[0_0_15px_rgba(34,197,94,1)] ring-2 ring-green-300';
              } else if (isOtherPick) {
                // Other players' boards get a solid orange highlight without the pulsing glow
                btnClass = 'bg-orange-500 text-white border-orange-400 z-10';
              }

              return (
                <button
                  key={num}
                  onClick={() => setSelectedNumber(num)}
                  className={`w-full aspect-square rounded-md text-[9px] font-black flex items-center justify-center transition-all border-b-2 ${btnClass}`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="bg-transparent px-4 pb-8 shrink-0 flex flex-row items-center justify-center gap-8">
        {previewBoard ? (
          <div className="w-28 h-28 shrink-0 bg-white p-1 rounded-md grid grid-cols-5 gap-[1px] shadow-lg">
            {previewBoard.flat().map((v, i) => (
                <div key={i} className={`flex items-center justify-center text-[7px] font-black rounded-[2px] ${v === '*' ? 'bg-orange-500 text-white' : 'bg-teal-50 text-teal-900 border border-teal-100/50'}`}>{v === '*' ? '★' : v}</div>
            ))}
          </div>
        ) : (
          <div className="w-28 h-28 shrink-0 flex flex-col justify-center items-center gap-2 border-2 border-white/20 border-dashed rounded-md bg-white/5">
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-ping"></span>
            <span className="text-white/50 text-[10px] font-bold uppercase text-center leading-tight">Select<br/>Board</span>
          </div>
        )}

        <button 
          onClick={() => selectedNumber && onBoardSelect(selectedNumber)}
          disabled={!selectedNumber}
          className={`px-8 py-3 w-32 rounded-xl font-black text-sm uppercase tracking-widest shadow-lg transition-all active:scale-95 flex-shrink-0 ${!selectedNumber ? 'bg-gray-500/50 text-white/50 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600 shadow-[0_4px_20px_rgba(249,115,22,0.4)]'}`}
        >
          Start
        </button>
      </div>
    </div>
  );
};
export default Lobby;