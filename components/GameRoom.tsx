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
  const [countdown, setCountdown] = useState(5); 
  const [currentCall, setCurrentCall] = useState<number | null>(null);
  const [calledNumbers, setCalledNumbers] = useState<number[]>([]);
  const [markedNumbers, setMarkedNumbers] = useState<number[]>(['*' as any]);
  const [winInfo, setWinInfo] = useState<{type: string, index: number} | null>(null);

  const PLAYER_COUNT = useMemo(() => Math.floor(Math.random() * 20) + 40, []); 
  const DERASH = (stake * PLAYER_COUNT) * 0.8;

  const cardMatrix = useMemo(() => generateFairBoard(boardNumber), [boardNumber]);

  useEffect(() => {
    if (gameState === 'waiting') {
      setTimeout(() => setGameState('starting'), 800);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'starting' && countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (gameState === 'starting' && countdown === 0) {
      setGameState('running');
    }
  }, [gameState, countdown]);

  useEffect(() => {
    if (gameState === 'running') {
      // SLOWER CALLING SPEED: 8.0 seconds interval
      const interval = setInterval(() => {
        if (calledNumbers.length >= 75) {
          setGameState('ended');
          clearInterval(interval);
          return;
        }
        let nextNum;
        do { nextNum = Math.floor(Math.random() * 75) + 1; } while (calledNumbers.includes(nextNum));
        setCurrentCall(nextNum);
        setCalledNumbers(prev => [...prev, nextNum]);
      }, 8000); 
      return () => clearInterval(interval);
    }
  }, [gameState, calledNumbers]);

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
      if (tg && typeof tg.showAlert === 'function') {
        tg.showAlert("Pattern not complete! Check your marks carefully.");
      } else {
        alert("Pattern not complete!");
      }
    }
  };

  const letters = ['B', 'I', 'N', 'G', 'O'];
  const colors = ['bg-yellow-500', 'bg-green-500', 'bg-sky-500', 'bg-red-500', 'bg-purple-700'];

  const MetricBox = ({ label, value }: { label: string, value: string | number }) => (
    <div className="bg-white rounded-md p-1 flex flex-col items-center justify-center flex-1 min-w-0 shadow-sm">
      <span className="text-[6px] text-purple-400 font-bold uppercase leading-none mb-0.5">{label}</span>
      <span className="text-[9px] font-black text-purple-900 leading-none">{value}</span>
    </div>
  );

  const containerBg = isDarkMode ? 'bg-[#0f172a]' : 'bg-[#a28cd1]';

  return (
    <div className={`flex flex-col h-full ${containerBg} overflow-hidden animate-fadeIn transition-colors duration-500`}>
      
      {/* GAME TASKBAR */}
      <div className="px-2 pt-2 pb-2 flex gap-1 justify-between shrink-0">
        <MetricBox label="Game" value={roomId} />
        <MetricBox label="Derash" value={DERASH.toFixed(0)} />
        <MetricBox label="Bonus" value="Off" />
        <MetricBox label="Players" value={PLAYER_COUNT} />
        <MetricBox label="Stake" value={stake} />
        <MetricBox label="Call" value={calledNumbers.length} />
        <MetricBox label="Sound" value="Off" />
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 flex px-2 gap-3 overflow-hidden">
        
        {/* LEFT: MASTER BOARD (1-75) */}
        <div className="w-[125px] bg-black/60 rounded-xl p-1.5 flex flex-col border border-white/10 shadow-inner overflow-hidden">
           <div className="grid grid-cols-5 gap-0.5 mb-1 shrink-0">
              {letters.map((l, i) => (
                <div key={i} className={`${colors[i]} text-white text-[10px] font-black text-center py-1 rounded-sm shadow-md`}>{l}</div>
              ))}
           </div>
           <div className="flex-1 grid grid-cols-5 gap-0.5 overflow-y-auto custom-scrollbar">
              {Array.from({ length: 15 }).map((_, rowIdx) => (
                letters.map((_, colIdx) => {
                  const num = (colIdx * 15) + rowIdx + 1;
                  const isCalled = calledNumbers.includes(num);
                  return (
                    <div 
                      key={`${colIdx}-${rowIdx}`} 
                      className={`aspect-square flex items-center justify-center rounded-[2px] text-[9px] font-black transition-all border ${
                        isCalled 
                        ? 'bg-white text-purple-900 border-white shadow-sm scale-105 z-10' 
                        : 'bg-black/40 text-white/10 border-white/5' // DARKER UNCALLED NUMBERS
                      }`}
                    >
                      {num}
                    </div>
                  );
                })
              ))}
           </div>
        </div>

        {/* RIGHT: CALLER & PLAYER CARD */}
        <div className="flex-1 flex flex-col gap-2 overflow-hidden pt-1">
           {/* STATUS BOX */}
           <div className="bg-white/20 rounded-xl px-3 py-2 flex justify-between items-center border border-white/10 shadow-inner">
              <span className="text-[9px] font-black text-white/60 uppercase tracking-widest leading-none">Status</span>
              <span className="text-[11px] font-black text-white uppercase tracking-tight">{gameState === 'starting' ? countdown : gameState === 'running' ? 'Live' : 'Ended'}</span>
           </div>

           {/* CURRENT CALL */}
           <div className="bg-purple-900/40 rounded-xl p-3 flex justify-between items-center border border-white/10 shadow-lg h-16 shrink-0">
              <span className="text-[9px] font-black text-white/60 uppercase tracking-widest leading-none">Called</span>
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center text-white text-xl font-black border-2 border-white/20 shadow-xl">
                {currentCall || '-'}
              </div>
           </div>

           {/* PLAYER CARD */}
           <div className={`${isDarkMode ? 'bg-white/5' : 'bg-white/30'} rounded-2xl p-2 flex flex-col border border-white/10 shadow-2xl shrink-0 transition-all`}>
              <div className="grid grid-cols-5 gap-1 mb-1">
                 {letters.map((l, i) => <div key={i} className={`${colors[i]} text-white text-[10px] font-black text-center rounded-sm shadow-sm`}>{l}</div>)}
              </div>
              <div className="grid grid-cols-5 gap-1.5 w-full aspect-square">
                {cardMatrix.map((row, rIdx) => row.map((val, cIdx) => {
                  const isMarked = markedNumbers.includes(val as any);
                  const isTrulyCalled = val === '*' || calledNumbers.includes(val as number);
                  // Highlight corners specifically if winInfo says CORNER
                  const isCorner = winInfo?.type === 'CORNER' && ((rIdx === 0 || rIdx === 4) && (cIdx === 0 || cIdx === 4));
                  
                  return (
                    <button 
                      key={`${cIdx}-${rIdx}`} 
                      onClick={() => handleMark(val)} 
                      disabled={val === '*' || gameState === 'ended'}
                      className={`aspect-square flex items-center justify-center rounded-md font-black text-sm transition-all shadow-md border-b-2 active:border-b-0 active:translate-y-0.5 ${
                        val === '*' ? 'bg-green-700 text-white border-green-900' : 
                        isMarked ? (isTrulyCalled ? 'bg-green-600 text-white border-green-800' : 'bg-gray-800 text-white/10 border-black') : 
                        'bg-white text-purple-900 border-gray-300'
                      } ${isCorner ? 'ring-4 ring-yellow-400 z-10' : ''}`}
                    >
                      {val === '*' ? '★' : val}
                    </button>
                  );
                }))}
              </div>
              <p className="text-[6px] text-white/40 text-center mt-1 uppercase font-bold tracking-widest leading-none">Card {boardNumber}</p>
           </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="px-4 py-4 shrink-0 flex flex-col gap-3 bg-black/10 backdrop-blur-md pb-safe">
        <button 
          onClick={handleBingoClick} 
          disabled={gameState !== 'running'}
          className={`w-full py-4 rounded-full font-black text-2xl uppercase border-b-8 shadow-2xl transition-all active:border-b-0 active:translate-y-2
            ${gameState !== 'running' ? 'bg-gray-400 text-white/50 border-gray-600' : 'bg-orange-500 text-white border-orange-700'}`}
        >
          BINGO!
        </button>
        <div className="flex gap-2 h-10">
            <button onClick={() => window.location.reload()} className="flex-1 bg-sky-500 text-white rounded-full font-black text-[10px] uppercase border-b-4 border-sky-700 active:border-b-0 active:translate-y-1">Refresh</button>
            <button onClick={onLeave} className="flex-1 bg-red-500 text-white rounded-full font-black text-[10px] uppercase border-b-4 border-red-700 active:border-b-0 active:translate-y-1">Leave</button>
        </div>
      </div>

      {/* WIN OVERLAY */}
      {gameState === 'ended' && (
        <div className="fixed inset-0 bg-black/90 z-[100] flex items-center justify-center p-8 animate-fadeIn backdrop-blur-md">
          <div className={`${isDarkMode ? 'bg-[#1e293b]' : 'bg-[#a28cd1]'} rounded-[2.5rem] p-10 text-center border-2 border-white/20 shadow-2xl text-white max-w-[300px] w-full`}>
            <div className="w-16 h-16 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl border-2 border-white">
               <i className={`fas ${winInfo ? 'fa-crown' : 'fa-flag-checkered'} text-2xl`}></i>
            </div>
            <h2 className="text-2xl font-black mb-2 uppercase tracking-tighter">
              {winInfo ? (winInfo.type === 'CORNER' ? 'CORNER BINGO!' : 'BINGO!') : 'GAME OVER'}
            </h2>
            {winInfo && (
              <p className="text-4xl font-black text-yellow-300 mb-8 tracking-tighter animate-pulse">
                {DERASH.toFixed(0)} <span className="text-sm">ETB</span>
              </p>
            )}
            {!winInfo && <p className="text-white/40 text-xs mb-8 font-bold uppercase tracking-widest">Try again!</p>}
            <button onClick={onLeave} className="w-full py-4 bg-white text-purple-900 rounded-full font-black uppercase shadow-lg border-b-4 border-purple-300">
              Collect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRoom;