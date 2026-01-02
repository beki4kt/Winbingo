
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

  const HOUSE_CUT = 0.20;
  const PLAYER_COUNT = useMemo(() => Math.floor(Math.random() * 25) + 35, []); 
  const DERASH = (stake * PLAYER_COUNT) * (1 - HOUSE_CUT);

  const cardMatrix = useMemo(() => generateFairBoard(boardNumber), [boardNumber]);

  useEffect(() => {
    if (gameState === 'waiting') {
      const timer = setTimeout(() => setGameState('starting'), 2000);
      return () => clearTimeout(timer);
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
      const interval = setInterval(() => {
        if (calledNumbers.length >= 75) {
          clearInterval(interval);
          setGameState('ended');
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
    const tg = window.Telegram?.WebApp;
    if (tg && tg.isVersionAtLeast && tg.isVersionAtLeast('6.1') && tg.HapticFeedback?.impactOccurred) {
      tg.HapticFeedback.impactOccurred('light');
    }
    setMarkedNumbers(prev => prev.includes(num as any) ? prev.filter(n => n !== num) : [...prev, num as any]);
  };

  const handleBingoClick = () => {
    const win = checkBingoWin(cardMatrix, markedNumbers);
    const tg = window.Telegram?.WebApp;
    if (win) {
      if (tg && tg.isVersionAtLeast && tg.isVersionAtLeast('6.1') && tg.HapticFeedback?.notificationOccurred) {
        tg.HapticFeedback.notificationOccurred('success');
      }
      setBalance(balance + DERASH);
      setWinInfo(win);
      setGameState('ended');
    } else {
      if (tg && tg.isVersionAtLeast && tg.isVersionAtLeast('6.1') && tg.HapticFeedback?.notificationOccurred) {
        tg.HapticFeedback.notificationOccurred('error');
      }
      
      if (tg && tg.isVersionAtLeast && tg.isVersionAtLeast('6.0') && typeof tg.showAlert === 'function') {
        tg.showAlert("No Bingo detected! Please check your card numbers again.");
      } else {
        alert("No Bingo detected! Please check your card numbers again.");
      }
    }
  };

  const letters = [
    { label: 'B', color: 'bg-yellow-500' },
    { label: 'I', color: 'bg-green-500' },
    { label: 'N', color: 'bg-blue-500' },
    { label: 'G', color: 'bg-red-500' },
    { label: 'O', color: 'bg-purple-700' },
  ];

  const boardCols = [{ range: [1, 15] }, { range: [16, 30] }, { range: [31, 45] }, { range: [46, 60] }, { range: [61, 75] }];
  const bgColor = isDarkMode ? 'bg-[#0f172a]' : 'bg-[#a28cd1]';

  return (
    <div className={`flex flex-col h-full ${bgColor} overflow-hidden animate-fadeIn select-none transition-colors duration-500`}>
      
      {/* RESTORED RICH TASKBAR */}
      <div className="bg-black/30 px-4 py-3 border-b border-white/10 space-y-3">
        <div className="flex justify-between items-center">
          <div className="flex flex-col">
            <span className="text-[10px] text-white/40 font-black uppercase tracking-wider leading-none">Arena ID</span>
            <span className="text-[13px] font-black text-white">{roomId}</span>
          </div>
          <div className="flex gap-6">
            <div className="text-right">
              <span className="text-[10px] text-white/40 font-black uppercase tracking-wider leading-none">Players</span>
              <p className="text-[13px] font-black text-white">{PLAYER_COUNT}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-orange-400 font-black uppercase tracking-wider leading-none">Derash (Pot)</span>
              <p className="text-[13px] font-black text-white">{DERASH.toFixed(0)} <span className="text-[10px]">ETB</span></p>
            </div>
          </div>
        </div>

        {/* RESTORED CALLED HISTORY LIST */}
        <div className="flex gap-2 overflow-x-auto pb-1.5 custom-scrollbar scroll-smooth">
          {calledNumbers.slice(-12).reverse().map((num, idx) => (
            <div 
              key={idx} 
              className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-black border transition-all duration-300 ${idx === 0 ? 'bg-[#f48120] text-white scale-110 shadow-lg border-white/40 z-10' : 'bg-white/10 text-white/50 border-white/5'}`}
            >
              {num}
            </div>
          ))}
          {calledNumbers.length === 0 && (
            <div className="text-[10px] text-white/30 font-black uppercase tracking-widest py-2.5">Waiting for caller...</div>
          )}
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden px-2 gap-2 pb-1 pt-3">
        {/* LEFT: MINI MASTER BOARD */}
        <div className="w-[145px] flex flex-col bg-white/10 rounded-2xl overflow-hidden p-1.5 shrink-0 border border-white/5 shadow-inner">
          <div className="grid grid-cols-5 gap-0.5 mb-1.5">
            {letters.map((l, i) => <div key={i} className={`${l.color} text-white text-[9px] font-black text-center py-1.5 rounded-t-md shadow-sm`}>{l.label}</div>)}
          </div>
          <div className="flex-1 grid grid-cols-5 gap-0.5">
            {Array.from({ length: 15 }).map((_, rowIdx) => boardCols.map((col, colIdx) => {
              const num = col.range[0] + rowIdx;
              const isCalled = calledNumbers.includes(num);
              return <div key={`${colIdx}-${rowIdx}`} className={`flex items-center justify-center rounded-[2px] text-[8px] font-black transition-all ${isCalled ? 'bg-white text-[#5e35b1] shadow-sm' : 'bg-white/5 text-white/10'}`}>{num}</div>;
            }))}
          </div>
        </div>

        {/* RIGHT: LIVE CALL & MAIN BOARD */}
        <div className="flex-1 flex flex-col gap-3 overflow-hidden">
          {/* LIVE CALL BALL */}
          <div className="bg-black/40 rounded-[1.5rem] p-4 flex justify-between items-center h-20 border border-white/10 relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8 blur-xl"></div>
            <div className="z-10">
              <span className="text-[10px] font-black text-white/40 uppercase tracking-widest leading-none">Now Calling</span>
              <p className="text-[11px] text-orange-400 font-black uppercase tracking-tight mt-1">Live Arena Feed</p>
            </div>
            <div className="w-14 h-14 bg-[#f48120] rounded-full flex items-center justify-center text-white text-3xl font-black shadow-[0_0_25px_rgba(244,129,32,0.6)] z-10 border-4 border-white/20 animate-pulse">
              {currentCall || '--'}
            </div>
          </div>

          {/* PLAYER CARD GRID */}
          <div className="bg-white/10 rounded-[2rem] p-3 flex-1 flex flex-col items-center justify-center border border-white/10 shadow-xl">
            <div className="grid grid-cols-5 gap-2 w-full aspect-square max-w-[220px]">
              {cardMatrix.map((row, rIdx) => row.map((val, cIdx) => {
                const isMarked = markedNumbers.includes(val as any);
                const isTrulyCalled = val === '*' || calledNumbers.includes(val as number);
                return (
                  <button 
                    key={`${cIdx}-${rIdx}`} 
                    onClick={() => handleMark(val)} 
                    disabled={val === '*' || gameState === 'ended'}
                    className={`aspect-square flex items-center justify-center rounded-xl font-black text-xl transition-all border-b-4 active:border-b-0 active:translate-y-1 ${
                      val === '*' ? 'bg-green-700 text-white border-green-900 shadow-inner' : 
                      isMarked ? (isTrulyCalled ? 'bg-green-600 text-white shadow-2xl ring-2 ring-white/50 border-green-800' : 'bg-gray-800 text-white/20 border-gray-950') : 
                      'bg-white text-black border-gray-300 shadow-lg'
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

      {/* FOOTER: ACTION BUTTONS */}
      <div className="px-4 py-5 space-y-3 shrink-0 bg-black/30 backdrop-blur-xl border-t border-white/10">
        <button 
          onClick={handleBingoClick} 
          disabled={gameState !== 'running'} 
          className={`w-full py-5 rounded-2xl font-black text-3xl shadow-[0_12px_40px_rgba(0,0,0,0.4)] uppercase transition-all active:scale-95 tracking-tighter ${
            gameState !== 'running' ? 'bg-orange-500/30 text-white/20 cursor-not-allowed' : 'bg-[#f48120] text-white ring-2 ring-white/30 animate-pulse'
          }`}
        >
          BINGO!
        </button>
        <div className="flex gap-3">
            <button onClick={onLeave} className="flex-1 bg-white/10 text-white/50 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest border border-white/5 active:bg-white/20">Back to Lobby</button>
            <button className="flex-1 bg-red-600/20 text-red-500 py-3 rounded-xl font-black text-[11px] uppercase tracking-widest border border-red-500/20 active:bg-red-600/40">Surrender</button>
        </div>
      </div>

      {/* OVERLAY: WINNER */}
      {gameState === 'ended' && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-2xl z-[100] flex items-center justify-center p-8 animate-fadeIn">
          <div className="bg-[#a28cd1] rounded-[3.5rem] p-12 text-center shadow-2xl max-w-[340px] w-full border-t-8 border-white border-x-2 border-b-2 text-white">
            {winInfo ? (
              <>
                <div className="w-24 h-24 bg-yellow-400 rounded-full mx-auto mb-8 flex items-center justify-center shadow-[0_0_50px_rgba(250,204,21,0.6)] border-4 border-white animate-bounce">
                  <i className="fas fa-crown text-white text-4xl"></i>
                </div>
                <h2 className="text-4xl font-black mb-2 uppercase tracking-tighter">WINNER!</h2>
                <p className="text-6xl font-black text-yellow-300 mb-10 drop-shadow-2xl">{DERASH.toFixed(0)} <span className="text-2xl">ETB</span></p>
              </>
            ) : (
              <>
                <div className="w-24 h-24 bg-white/10 rounded-full mx-auto mb-10 flex items-center justify-center border-4 border-dashed border-white/20">
                  <i className="fas fa-flag-checkered text-white/40 text-4xl"></i>
                </div>
                <h2 className="text-3xl font-black mb-8 uppercase tracking-tight">GAME OVER</h2>
              </>
            )}
            <button onClick={onLeave} className="w-full py-6 bg-white text-[#a28cd1] rounded-[2.5rem] font-black uppercase shadow-2xl transition-all active:scale-95 text-xl tracking-tight">
              Collect Payout
            </button>
          </div>
        </div>
      )}

      {/* OVERLAY: COUNTDOWN */}
      {gameState === 'starting' && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-[90] flex items-center justify-center">
            <div className="text-center">
                <p className="text-white/40 font-black uppercase tracking-[0.4em] mb-6">Entering Arena</p>
                <div className="text-[12rem] font-black text-white leading-none animate-ping">{countdown}</div>
            </div>
        </div>
      )}
    </div>
  );
};

export default GameRoom;
