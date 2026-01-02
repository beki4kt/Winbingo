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

  const bgColor = isDarkMode ? 'bg-[#0f172a]' : 'bg-[#a28cd1]';
  const cardBg = isDarkMode ? 'bg-white/5' : 'bg-white/10';

  return (
    <div className={`flex flex-col h-full ${bgColor} animate-fadeIn transition-colors duration-500 overflow-hidden`}>
      
      {/* 1-100 GRID - Scaled to fit perfectly in one view without scrolling */}
      <div className="flex-1 px-4 flex flex-col justify-center items-center overflow-hidden">
        <div className={`${cardBg} p-1 rounded-xl border border-white/5 shadow-inner w-full max-w-[360px]`}>
          <div className="grid grid-cols-10 gap-0.5 sm:gap-1 justify-items-center">
            {numbers.map((num) => {
              const isActive = selectedNumber === num;
              const isOther = otherPicks.includes(num);
              
              let btnStyle = isDarkMode ? 'bg-white/5 text-white/20 border-white/5' : 'bg-white/10 text-white/40 border-white/5';
              if (isActive) {
                btnStyle = 'bg-green-500 text-white border-green-700 shadow-lg scale-110 z-10';
              } else if (isOther) {
                btnStyle = 'bg-orange-500 text-white border-orange-700 opacity-90';
              }

              return (
                <button
                  key={num}
                  onClick={() => setSelectedNumber(num)}
                  className={`w-full aspect-square rounded-sm text-[7px] font-black flex items-center justify-center transition-all border-b-2 ${btnStyle} hover:brightness-110`}
                >
                  {num}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* PREVIEW + START ACTIONS (BOTTOM) */}
      <div className="bg-transparent px-4 pb-20 shrink-0 flex flex-col gap-2">
        
        {/* CARD PREVIEW SPACE - LITERALLY EMPTY UNTIL SELECTED */}
        <div className="flex justify-start px-1 h-28 items-center">
          {selectedNumber ? (
            <div className={`w-24 h-24 ${isDarkMode ? 'bg-white/5' : 'bg-white/20'} rounded-lg border border-white/20 p-1 flex flex-col items-center justify-center shadow-lg animate-fadeIn`}>
              <div className="h-full w-full flex flex-col">
                <div className="flex-1 grid grid-cols-5 gap-0.5 bg-white p-0.5 rounded-sm">
                  {previewBoard?.flat().map((val, i) => (
                    <div key={i} className={`aspect-square flex items-center justify-center text-[4px] font-black rounded-[0.2px] ${val === '*' ? 'bg-orange-500 text-white' : 'bg-purple-50 text-purple-900'}`}>
                      {val === '*' ? '★' : val}
                    </div>
                  ))}
                </div>
                <div className="text-center pt-0.5">
                   <span className="text-[6px] font-black text-white/80 uppercase tracking-tighter leading-none">Card {selectedNumber}</span>
                </div>
              </div>
            </div>
          ) : (
            /* LITERALLY EMPTY SPACE REMAINS AS A SPACER */
            <div className="w-24 h-24" />
          )}
        </div>

        {/* BOTTOM BUTTONS */}
        <div className="flex gap-2 h-12">
          <button 
            onClick={() => window.location.reload()}
            className="flex-1 bg-sky-500 text-white font-black rounded-full shadow-lg border-b-4 border-sky-700 active:border-b-0 active:translate-y-1 transition-all uppercase tracking-widest text-[10px]"
          >
            Refresh
          </button>
          <button 
            onClick={handleStartGameClick}
            disabled={selectedNumber === null || loading}
            className={`flex-1 font-black rounded-full shadow-lg transition-all uppercase tracking-widest text-[10px] border-b-4 
              ${selectedNumber === null || loading 
                ? 'bg-gray-400 text-gray-200 border-gray-600' 
                : 'bg-orange-500 text-white border-orange-700 active:border-b-0 active:translate-y-1'}`}
          >
            {loading ? <i className="fas fa-spinner animate-spin"></i> : 'Start Game'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Lobby;