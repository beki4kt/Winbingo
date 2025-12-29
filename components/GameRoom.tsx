
import React, { useState, useEffect, useMemo } from 'react';
import { generateFairBoard, checkBingoWin } from '../utils.ts';

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
  const PLAYER_COUNT = useMemo(() => Math.floor(Math.random() * 10) + 25, []); 
  const DERASH = (stake * PLAYER_COUNT) * (1 - HOUSE_CUT);

  const cardMatrix = useMemo(() => generateFairBoard(boardNumber), [boardNumber]);

  useEffect(() => {
    if (gameState === 'waiting') {
      const timer = setTimeout(() => setGameState('starting'), 1500);
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
      }, 4000); 
      return () => clearInterval(interval);
    }
  }, [gameState, calledNumbers]);

  const handleMark = (num: number | string) => {
    if (gameState !== 'running' || num === '*') return;
    setMarkedNumbers(prev => prev.includes(num as any) ? prev.filter(n => n !== num) : [...prev, num as any]);
  };

  const handleBingoClick = () => {
    const win = checkBingoWin(cardMatrix, markedNumbers);
    if (win) {
      setBalance(balance + DERASH);
      setWinInfo(win);
      setGameState('ended');
    } else {
      alert("Verification failed: Bingo pattern not present.");
    }
  };

  const letters = [
    { label: 'B', color: 'bg-slate-700' },
    { label: 'I', color: 'bg-slate-700' },
    { label: 'N', color: 'bg-slate-700' },
    { label: 'G', color: 'bg-slate-700' },
    { label: 'O', color: 'bg-slate-700' },
  ];

  const boardCols = [{ range: [1, 15] }, { range: [16, 30] }, { range: [31, 45] }, { range: [46, 60] }, { range: [61, 75] }];

  return (
    <div className="flex flex-col h-full bg-[#0f172a] overflow-hidden animate-fadeIn select-none">
      <div className="flex justify-between items-center px-4 py-3 bg-slate-900/50 border-b border-white/5">
        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Session {roomId.split('-')[1]}</span>
        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Pot: {DERASH.toFixed(0)} ETB</span>
      </div>

      <div className="flex flex-1 overflow-hidden p-2 gap-2">
        <div className="w-[120px] flex flex-col bg-black/20 rounded-xl overflow-hidden p-1 shrink-0 border border-white/5">
          <div className="grid grid-cols-5 gap-0.5 mb-1">
            {letters.map((l, i) => <div key={i} className={`${l.color} text-white text-[9px] font-black text-center py-1 rounded-sm`}>{l.label}</div>)}
          </div>
          <div className="flex-1 grid grid-cols-5 gap-0.5">
            {Array.from({ length: 15 }).map((_, rowIdx) => boardCols.map((col, colIdx) => {
              const num = col.range[0] + rowIdx;
              const isCalled = calledNumbers.includes(num);
              return <div key={`${colIdx}-${rowIdx}`} className={`flex items-center justify-center rounded-sm text-[8px] font-bold ${isCalled ? 'bg-indigo-500 text-white' : 'bg-white/5 text-white/20'}`}>{num}</div>;
            }))}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-2 overflow-hidden">
          <div className="bg-slate-900 border border-white/5 rounded-xl p-3 flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Last Ball</span>
              <span className="text-xl font-black text-white">{currentCall || '--'}</span>
            </div>
            <div className="w-10 h-10 bg-indigo-500/10 rounded-full flex items-center justify-center border border-indigo-500/20">
               <span className="text-indigo-400 text-xs font-black">{calledNumbers.length}</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-white/5 rounded-2xl p-2 flex-1 flex flex-col items-center justify-center relative">
            <div className="grid grid-cols-5 gap-1 w-full aspect-square max-w-[220px]">
              {cardMatrix.map((row, rIdx) => row.map((val, cIdx) => {
                const isMarked = markedNumbers.includes(val as any);
                const isTrulyCalled = val === '*' || calledNumbers.includes(val as number);
                return (
                  <button 
                    key={`${cIdx}-${rIdx}`} 
                    onClick={() => handleMark(val)} 
                    className={`aspect-square flex items-center justify-center rounded-md font-black text-sm border ${
                      val === '*' ? 'bg-emerald-900/50 border-emerald-500/50 text-emerald-400' : 
                      isMarked ? (isTrulyCalled ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-white/50') : 
                      'bg-slate-800/40 border-white/5 text-white/80 hover:bg-slate-800'
                    }`}
                  >
                    {val === '*' ? <i className="fas fa-shield"></i> : val}
                  </button>
                );
              }))}
            </div>
            <p className="text-[7px] font-black text-white/20 mt-3 tracking-[0.2em] uppercase">Security Verified Card #{boardNumber}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3 shrink-0 bg-slate-900/80 border-t border-white/10">
        <button 
          onClick={handleBingoClick} 
          disabled={gameState !== 'running'} 
          className={`w-full py-4 rounded-2xl font-black text-xl shadow-xl uppercase tracking-widest transition-all active:scale-[0.98] ${
            gameState !== 'running' ? 'bg-emerald-500/20 text-emerald-500/40' : 'bg-emerald-500 text-white border-b-4 border-emerald-700'
          }`}
        >
          CLAIM BINGO
        </button>
        <div className="flex gap-2">
          <button onClick={onLeave} className="flex-1 bg-slate-800 text-white/60 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest border border-white/5">Exit Room</button>
        </div>
      </div>

      {gameState === 'ended' && (
        <div className="fixed inset-0 bg-[#0f172a]/95 backdrop-blur-sm z-[100] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-slate-900 rounded-[2rem] p-8 text-center shadow-2xl max-w-[320px] w-full border border-white/10">
            <div className={`w-12 h-12 rounded-full mx-auto mb-6 flex items-center justify-center border-2 ${winInfo ? 'bg-emerald-500/10 border-emerald-500 text-emerald-500' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
              <i className={`fas ${winInfo ? 'fa-check-double' : 'fa-hourglass-end'}`}></i>
            </div>
            <h2 className="text-lg font-black mb-1 uppercase tracking-tighter text-white">
              {winInfo ? 'BINGO VALIDATED' : 'SESSION CONCLUDED'}
            </h2>
            <div className="my-6 p-4 bg-black/20 rounded-2xl border border-white/5">
              <p className="text-[10px] text-white/40 uppercase font-black tracking-widest mb-1">Total Payout</p>
              <p className={`text-4xl font-black ${winInfo ? 'text-emerald-400' : 'text-white/60'}`}>
                {winInfo ? DERASH.toFixed(0) : '0.00'} <span className="text-sm">ETB</span>
              </p>
            </div>
            <button onClick={onLeave} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase tracking-widest text-xs border-b-4 border-indigo-800 active:translate-y-1 active:border-b-0 transition-all">
              Return to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRoom;
