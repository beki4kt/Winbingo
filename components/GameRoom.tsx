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
      // UPDATED CALLING SPEED: 3.5 seconds interval
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
      }, 3500); 
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
        tg.showAlert("No Bingo! Make sure all squares in a line or the corners are called and marked.");
      } else {
        alert("No Bingo!");
      }
    }
  };

  const letters = ['B', 'I', 'N', 'G', 'O'];
  const colors = ['bg-yellow-500', 'bg-green-500', 'bg-sky-500', 'bg-red-500', 'bg-purple-700'];

  const MetricBox = ({ label, value }: { label: string, value: string | number }) => (
    <div className="bg-white rounded-lg p-1 flex flex-col items-center justify-center flex-1 min-w-0 shadow-sm border border-black/5">
      <span className="text-[7px] text-purple-400 font-black uppercase tracking-tight leading-none mb-0.5">{label}</span>
      <span className="text-[10px] font-black text-purple-900 leading-none">{value}</span>
    </div>
  );

  const containerBg = isDarkMode ? 'bg-[#0f172a]' : 'bg-[#a28cd1]';

  return (
    <div className={`flex flex-col h-full ${containerBg} overflow-hidden animate-fadeIn transition-colors duration-500 pb-safe`}>
      
      {/* GAME TASKBAR */}
      <div className="px-3 pt-3 pb-2 flex gap-1.5 justify-between shrink-0">
        <MetricBox label="Game" value={roomId} />
        <MetricBox label="Pot" value={DERASH.toFixed(0)} />
        <MetricBox label="Bonus" value="Off" />
        <MetricBox label="Active" value={PLAYER_COUNT} />
        <MetricBox label="Stake" value={stake} />
        <MetricBox label="Called" value={calledNumbers.length} />
      </div>

      {/* CONTENT AREA */}
      <div className="flex-1 flex px-3 gap-3 overflow-hidden">
        
        {/* LEFT: MASTER BOARD (1-75) */}
        <div className="w-[130px] bg-black/40 rounded-2xl p-2 flex flex-col border border-white/10 shadow-2xl overflow-hidden">
           <div className="grid grid-cols-5 gap-1 mb-1.5 shrink-0">
              {letters.map((l, i) => (
                <div key={i} className={`${colors[i]} text-white text-[11px] font-black text-center py-1 rounded-md shadow-md border-b-2 border-black/20`}>{l}</div>
              ))}
           </div>
           <div className="flex-1 grid grid-cols-5 gap-1 overflow-y-auto custom-scrollbar pr-0.5">
              {Array.from({ length: 15 }).map((_, rowIdx) => (
                letters.map((_, colIdx) => {
                  const num = (colIdx * 15) + rowIdx + 1;
                  const isCalled = calledNumbers.includes(num);
                  return (
                    <div 
                      key={`${colIdx}-${rowIdx}`} 
                      className={`aspect-square flex items-center justify-center rounded-md text-[11px] font-black transition-all border ${
                        isCalled 
                        ? 'bg-white text-purple-900 border-white shadow-[0_0_10px_rgba(255,255,255,0.4)] scale-110 z-10' 
                        : 'bg-black/20 text-white/10 border-white/5' 
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
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
           {/* STATUS & CALLER */}
           <div className="flex flex-col gap-2 shrink-0">
             <div className="bg-white/20 rounded-xl px-4 py-2 flex justify-between items-center border border-white/10 shadow-inner">
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Status</span>
                <span className="text-[12px] font-black text-white uppercase">{gameState === 'starting' ? `Start in ${countdown}` : gameState === 'running' ? 'Live Game' : 'Final Results'}</span>
             </div>

             <div className="bg-purple-900/40 rounded-2xl p-3 flex justify-between items-center border border-white/10 shadow-2xl h-20">
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">Next Call</span>
                <div className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center text-white text-3xl font-black border-4 border-white/40 shadow-[0_0_25px_rgba(249,115,22,0.6)] animate-pulse">
                  {currentCall || '-'}
                </div>
             </div>
           </div>

           {/* PLAYER CARD */}
           <div className={`${isDarkMode ? 'bg-white/5' : 'bg-white/30'} rounded-[2rem] p-3 flex flex-col border-2 border-white/10 shadow-2xl shrink-0`}>
              <div className="grid grid-cols-5 gap-1 mb-2">
                 {letters.map((l, i) => <div key={i} className={`${colors[i]} text-white text-[11px] font-black text-center rounded-md py-0.5 shadow-sm`}>{l}</div>)}
              </div>
              <div className="grid grid-cols-5 gap-2 w-full aspect-square">
                {cardMatrix.map((row, rIdx) => row.map((val, cIdx) => {
                  const isMarked = markedNumbers.includes(val as any);
                  const isTrulyCalled = val === '*' || calledNumbers.includes(val as number);
                  // Dynamic Corner Highlighting
                  const isCornerCell = (rIdx === 0 || rIdx === 4) && (cIdx === 0 || cIdx === 4);
                  const showCornerWin = winInfo?.type === 'CORNER' && isCornerCell;
                  
                  return (
                    <button 
                      key={`${cIdx}-${rIdx}`} 
                      onClick={() => handleMark(val)} 
                      disabled={val === '*' || gameState === 'ended'}
                      className={`aspect-square flex items-center justify-center rounded-xl font-black text-base transition-all shadow-lg border-b-4 active:border-b-0 active:translate-y-1 ${
                        val === '*' ? 'bg-green-700 text-white border-green-900' : 
                        isMarked ? (isTrulyCalled ? 'bg-green-500 text-white border-green-700' : 'bg-gray-800 text-white/10 border-black shadow-none scale-95') : 
                        'bg-white text-purple-900 border-gray-300 hover:brightness-110'
                      } ${showCornerWin ? 'ring-4 ring-yellow-400 z-10 animate-pulse' : ''}`}
                    >
                      {val === '*' ? '★' : val}
                    </button>
                  );
                }))}
              </div>
              <p className="text-[8px] text-white/50 text-center mt-2 uppercase font-black tracking-[0.2em]">Board #{boardNumber}</p>
           </div>
        </div>
      </div>

      {/* FOOTER ACTIONS */}
      <div className="px-5 py-5 shrink-0 flex flex-col gap-4 bg-black/10 backdrop-blur-xl border-t border-white/5">
        <button 
          onClick={handleBingoClick} 
          disabled={gameState !== 'running'}
          className={`w-full py-5 rounded-3xl font-black text-3xl uppercase border-b-8 shadow-2xl transition-all active:border-b-0 active:translate-y-2
            ${gameState !== 'running' ? 'bg-gray-400 text-white/50 border-gray-600' : 'bg-orange-600 text-white border-orange-800 hover:brightness-110'}`}
        >
          BINGO!
        </button>
        <div className="flex gap-3 h-12">
            <button onClick={() => window.location.reload()} className="flex-1 bg-sky-500 text-white rounded-2xl font-black text-xs uppercase border-b-4 border-sky-700 active:border-b-0 active:translate-y-1">Refresh</button>
            <button onClick={onLeave} className="flex-1 bg-red-500 text-white rounded-2xl font-black text-xs uppercase border-b-4 border-red-700 active:border-b-0 active:translate-y-1">Surrender</button>
        </div>
      </div>

      {/* WIN OVERLAY */}
      {gameState === 'ended' && (
        <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-8 animate-fadeIn backdrop-blur-2xl">
          <div className={`${isDarkMode ? 'bg-[#1e293b]' : 'bg-purple-600'} rounded-[3rem] p-10 text-center border-4 border-white/20 shadow-[0_0_100px_rgba(255,255,255,0.1)] text-white max-w-[320px] w-full`}>
            <div className="w-20 h-20 bg-yellow-400 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl border-4 border-white animate-bounce">
               <i className={`fas ${winInfo ? 'fa-crown' : 'fa-skull-crossbones'} text-3xl`}></i>
            </div>
            <h2 className="text-3xl font-black mb-2 uppercase tracking-tighter leading-none">
              {winInfo ? (winInfo.type === 'CORNER' ? 'CORNER WIN!' : 'MEGA BINGO!') : 'UNLUCKY!'}
            </h2>
            {winInfo ? (
              <>
                <p className="text-white/60 text-xs font-bold uppercase mb-6 tracking-widest">You captured the prize</p>
                <p className="text-5xl font-black text-yellow-300 mb-10 tracking-tighter drop-shadow-lg">
                  {DERASH.toFixed(0)} <span className="text-base">ETB</span>
                </p>
              </>
            ) : (
              <p className="text-white/40 text-sm mb-10 font-bold uppercase tracking-widest">Someone else claimed bingo</p>
            )}
            <button onClick={onLeave} className="w-full py-5 bg-white text-purple-900 rounded-[2rem] font-black uppercase shadow-2xl border-b-8 border-purple-200 active:border-b-0 active:translate-y-2 transition-all">
              Withdraw Pot
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRoom;