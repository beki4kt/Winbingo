import React, { useState, useEffect, useMemo } from 'react';
import { generateFairBoard, checkBingoWin } from '../utils';

interface GameRoomProps {
  onLeave: () => void;
  boardNumber: number;
  stake: number;
  balance: number;
  setBalance: (bal: number) => void;
  roomId: string;
  isDarkMode: boolean;
}

const GameRoom: React.FC<GameRoomProps> = ({ onLeave, boardNumber, stake, balance, setBalance, roomId, isDarkMode }) => {
  const [gameState, setGameState] = useState<'waiting' | 'starting' | 'running' | 'ended'>('waiting');
  const [currentCall, setCurrentCall] = useState<number | null>(null);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [markedNumbers, setMarkedNumbers] = useState<number[]>(['*' as any]);
  const [winInfo, setWinInfo] = useState<{type: string, index: number} | null>(null);
  const [serverRoomId, setServerRoomId] = useState<string>('');

  const PLAYER_COUNT = 42; 
  const DERASH = (stake * PLAYER_COUNT) * 0.8;
  const cardMatrix = useMemo(() => generateFairBoard(boardNumber), [boardNumber]);

  // --- MULTIPLAYER SYNC ---
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/game/sync');
        const data = await res.json();
        
        if (data) {
           setCalledNumbers(data.calledNumbers);
           setCurrentCall(data.currentCall);
           setServerRoomId(data.roomId);
           
           if (data.status === 'ended' && gameState !== 'ended') {
             setGameState('ended');
           } else if (data.status === 'running' && gameState !== 'running') {
             setGameState('running');
           }
        }
      } catch (err) {
        console.error("Sync error:", err);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [gameState]);

  const handleMark = (num: number | string) => {
    if (gameState !== 'running' || num === '*') return;
    setMarkedNumbers(prev => prev.includes(num as any) ? prev.filter(n => n !== num) : [...prev, num as any]);
  };

  const handleBingoClick = () => {
    const win = checkBingoWin(cardMatrix, markedNumbers);
    const tg = window.Telegram?.WebApp;
    if (win) {
      setBalance(balance + DERASH);
      setWinInfo(win);
      setGameState('ended');
    } else {
      if (tg?.showAlert) tg.showAlert("No Bingo! Check your board.");
      else alert("No Bingo!");
    }
  };

  const letters = ['B', 'I', 'N', 'G', 'O'];
  const colors = ['bg-yellow-500', 'bg-green-600', 'bg-sky-600', 'bg-red-600', 'bg-emerald-800'];
  const containerBg = isDarkMode ? 'bg-[#0f172a]' : 'bg-[#065f46]';

  return (
    <div className={`flex flex-col h-full ${containerBg} overflow-hidden animate-fadeIn pb-safe`}>
      {/* TASKBAR */}
      <div className="px-3 pt-3 pb-2 flex gap-1.5 justify-between shrink-0">
        <div className="bg-white rounded-lg p-1 flex-1 text-center"><span className="text-[7px] text-emerald-600 font-bold block">ROOM</span><span className="text-[10px] font-black">{serverRoomId || '...'}</span></div>
        <div className="bg-white rounded-lg p-1 flex-1 text-center"><span className="text-[7px] text-emerald-600 font-bold block">POT</span><span className="text-[10px] font-black">{DERASH.toFixed(0)}</span></div>
        <div className="bg-white rounded-lg p-1 flex-1 text-center"><span className="text-[7px] text-emerald-600 font-bold block">CALLED</span><span className="text-[10px] font-black">{calledNumbers.length}</span></div>
      </div>

      {/* GAME AREA */}
      <div className="flex-1 flex px-3 gap-3 overflow-hidden">
        {/* LEFT: MASTER BOARD */}
        <div className="w-[130px] bg-black/40 rounded-2xl p-2 flex flex-col border border-white/10 overflow-hidden">
           <div className="flex-1 grid grid-cols-5 gap-1 overflow-y-auto custom-scrollbar content-start">
              {Array.from({ length: 75 }).map((_, i) => {
                  const num = i + 1;
                  const isCalled = calledNumbers.includes(num);
                  return (
                    <div key={num} className={`aspect-square flex items-center justify-center rounded-md text-[10px] font-black ${isCalled ? 'bg-orange-500 text-white scale-110' : 'bg-black/20 text-white/10'}`}>
                      {num}
                    </div>
                  );
              })}
           </div>
        </div>

        {/* RIGHT: CALLER & CARD */}
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
           {/* CALLER DISPLAY */}
           <div className="bg-emerald-900/40 rounded-2xl p-3 flex justify-between items-center border border-white/10 h-20">
              <span className="text-[10px] font-black text-white/60 uppercase">Last Call</span>
              <div className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center text-white text-3xl font-black shadow-lg border-4 border-white/20">
                {currentCall || '-'}
              </div>
           </div>

           {/* PLAYER CARD */}
           <div className={`${isDarkMode ? 'bg-white/5' : 'bg-white/30'} rounded-[2rem] p-3 border-2 border-white/10 shadow-2xl`}>
              <div className="grid grid-cols-5 gap-1 mb-2">
                 {letters.map((l, i) => <div key={i} className={`${colors[i]} text-white text-[10px] font-black text-center rounded py-0.5`}>{l}</div>)}
              </div>
              <div className="grid grid-cols-5 gap-1.5 w-full aspect-square">
                {cardMatrix.map((row, rIdx) => row.map((val, cIdx) => {
                  const isMarked = markedNumbers.includes(val as any);
                  const isTrulyCalled = val === '*' || calledNumbers.includes(val as number);
                  
                  return (
                    <button 
                      key={`${cIdx}-${rIdx}`} 
                      onClick={() => handleMark(val)} 
                      disabled={val === '*' || gameState === 'ended'}
                      className={`aspect-square rounded-lg font-black text-sm flex items-center justify-center transition-all ${
                        val === '*' ? 'bg-green-600 text-white' : 
                        isMarked ? (isTrulyCalled ? 'bg-green-500 text-white' : 'bg-gray-800 text-white/20') : 
                        'bg-white text-emerald-900'
                      }`}
                    >
                      {val === '*' ? '★' : val}
                    </button>
                  );
                }))}
              </div>
           </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="px-5 py-5 shrink-0 flex flex-col gap-3 bg-black/10 backdrop-blur border-t border-white/5">
        <button onClick={handleBingoClick} className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-2xl uppercase shadow-lg active:scale-95">BINGO!</button>
        <button onClick={onLeave} className="w-full py-3 bg-red-500/80 text-white rounded-xl font-bold text-xs uppercase">Leave Game</button>
      </div>

      {/* WIN OVERLAY */}
      {gameState === 'ended' && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-8 backdrop-blur-xl">
           <div className="text-center text-white">
              <h2 className="text-4xl font-black text-yellow-400 mb-4">{winInfo ? 'YOU WON!' : 'GAME OVER'}</h2>
              <p className="mb-8 opacity-60 uppercase font-bold tracking-widest text-xs">Waiting for next round...</p>
              <button onClick={onLeave} className="px-8 py-3 bg-white text-black font-black rounded-full uppercase">Main Menu</button>
           </div>
        </div>
      )}
    </div>
  );
};

export default GameRoom;