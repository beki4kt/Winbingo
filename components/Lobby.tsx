import React, { useState, useEffect, useMemo } from 'react';
import { generateFairBoard } from '../utils';

interface LobbyProps {
  onStartGame: (num: number, stake: number, roomId: string) => void;
  selectedNumber: number | null;
  setSelectedNumber: (num: number | null) => void;
  activeRoomIds: string[];
  isDarkMode: boolean;
}

const Lobby: React.FC<LobbyProps> = ({ onStartGame, selectedNumber, setSelectedNumber, isDarkMode }) => {
  const [loading, setLoading] = useState(false);
  const [otherPicks, setOtherPicks] = useState<number[]>([]);
  const stake = 10;
  const numbers = Array.from({ length: 100 }, (_, i) => i + 1);

  // Simulate other players picking boards
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

  const previewBoard = useMemo(() => {
    return selectedNumber ? generateFairBoard(selectedNumber) : null;
  }, [selectedNumber]);

  const handleStartGameClick = () => {
    if (selectedNumber === null) return;
    setLoading(true);
    setTimeout(() => {
      const randomRoomId = 'EN' + (Math.floor(Math.random() * 8999) + 1000);
      onStartGame(selectedNumber, stake, randomRoomId);
      setLoading(false);
    }, 800);
  };

  const bgColor = isDarkMode ? 'bg-[#0f172a]' : 'bg-[#065f46]';
  const cardBg = isDarkMode ? 'bg-white/5' : 'bg-white/10';

  return (
    <div className={`flex flex-col h-full ${bgColor} animate-fadeIn transition-colors duration-500 overflow-hidden`}>
      
      {/* 1-100 GRID */}
      <div className="flex-1 px-4 py-2 flex flex-col justify-start items-center overflow-hidden">
        <div className={`${cardBg} p-1.5 rounded-xl border border-white/5 shadow-2xl w-full max-w-[320px]`}>
          <div className="grid grid-cols-10 gap-0.5 sm:gap-1 justify-items-center">
            {numbers.map((num) => {
              const isActive = selectedNumber === num;
              const isOther = otherPicks.includes(num);
              
              let btnStyle = isDarkMode ? 'bg-white/5 text-white/40 border-white/5' : 'bg-white/20 text-white/60 border-white/10';
              if (isActive) {
                btnStyle = 'bg-green-500 text-white border-green-700 shadow-[0_2px_0_0_rgba(0,0,0,0.3)] scale-110 z-10';
              } else if (isOther) {
                btnStyle = 'bg-orange-500 text-white border-orange-700 opacity-90 shadow-[0_1px_0_0_rgba(0,0,0,0.2)]';
              }

              return (
                <button
                  key={num}
                  onClick={() => setSelectedNumber(num)}
                  className={`w-full aspect-square rounded-md text-[9px] font-black flex items-center justify-center transition-all border-b-2 ${btnStyle} hover:brightness-110 active:translate-y-0.5 active:border-b-0`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* PREVIEW + START ACTIONS (BOTTOM) */}
      <div className="bg-transparent px-4 pb-20 shrink-0 flex flex-col gap-4">
        
        {/* CARD PREVIEW SPACE */}
        <div className="flex justify-center px-2 h-36 items-center">
          {selectedNumber ? (
            <div className={`w-32 h-32 ${isDarkMode ? 'bg-white/5' : 'bg-white/20'} rounded-2xl border-2 border-white/20 p-2 flex flex-col items-center justify-center shadow-2xl animate-scaleUp`}>
              <div className="h-full w-full flex flex-col">
                <div className="flex-1 grid grid-cols-5 gap-0.5 bg-white p-1 rounded-md shadow-inner">
                  {/* Fixed Map Type */}
                  {previewBoard?.flat().map((val: string | number, i: number) => (
                    <div key={i} className={`aspect-square flex items-center justify-center text-[7px] font-black rounded-[2px] ${val === '*' ? 'bg-orange-500 text-white' : 'bg-teal-50 text-teal-900'}`}>
                      {val === '*' ? '★' : val}
                    </div>
                  ))}
                </div>
                <div className="text-center pt-1.5">
                   <span className="text-[10px] font-black text-white uppercase tracking-tighter leading-none">Card #{selectedNumber}</span>
                </div>
              </div>
            </div>
          ) : (
            /* CONDITIONAL EMPTY SPACE */
            <div className="flex flex-col items-center justify-center text-white/30 text-[10px] font-black uppercase tracking-[0.2em] border-2 border-dashed border-white/5 rounded-2xl w-32 h-32">
              <i className="fas fa-hand-pointer mb-2 animate-bounce"></i>
              Pick One
            </div>
          )}
        </div>

        {/* BOTTOM BUTTONS */}
        <div className="flex gap-3 h-14">
          <button 
            onClick={() => window.location.reload()}
            className="flex-1 bg-sky-500 text-white font-black rounded-3xl shadow-[0_6px_0_0_#0369a1] border-b border-white/20 active:shadow-none active:translate-y-1 transition-all uppercase tracking-widest text-[11px]"
          >
            Refresh
          </button>
          <button 
            onClick={handleStartGameClick}
            disabled={selectedNumber === null || loading}
            className={`flex-1 font-black rounded-3xl transition-all uppercase tracking-widest text-[11px] shadow-[0_6px_0_0_rgba(0,0,0,0.3)]
              ${selectedNumber === null || loading 
                ? 'bg-gray-400 text-gray-200 cursor-not-allowed opacity-50' 
                : 'bg-orange-500 text-white active:shadow-none active:translate-y-1'}`}
          >
            {loading ? <i className="fas fa-spinner animate-spin"></i> : 'Start Game'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Lobby;