
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
  const PLAYER_COUNT = useMemo(() => Math.floor(Math.random() * 15) + 30, []); 
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
    window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('light');
    setMarkedNumbers(prev => prev.includes(num as any) ? prev.filter(n => n !== num) : [...prev, num as any]);
  };

  const handleBingoClick = () => {
    const win = checkBingoWin(cardMatrix, markedNumbers);
    if (win) {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('success');
      setBalance(balance + DERASH);
      setWinInfo(win);
      setGameState('ended');
    } else {
      window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred('error');
      alert("No Bingo detected! Check your card again.");
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
      <div className="grid grid-cols-7 gap-1 px-2 py-2 shrink-0">
        <div className="bg-white/20 rounded p-1 text-center text-[8px] text-white font-black">Pot: {DERASH.toFixed(0)}</div>
        <div className="bg-white/20 rounded p-1 text-center text-[8px] text-white font-black col-span-2">Arena: {roomId.replace('ARENA-','')}</div>
      </div>

      <div className="flex flex-1 overflow-hidden px-2 gap-2 pb-1 pt-1">
        <div className="w-[150px] flex flex-col bg-white/20 rounded-xl overflow-hidden p-1 shrink-0 border border-white/10 shadow-inner">
          <div className="grid grid-cols-5 gap-0.5 mb-1">
            {letters.map((l, i) => <div key={i} className={`${l.color} text-white text-[10px] font-black text-center py-1.5 rounded-t-md`}>{l.label}</div>)}
          </div>
          <div className="flex-1 grid grid-cols-5 gap-0.5">
            {Array.from({ length: 15 }).map((_, rowIdx) => boardCols.map((col, colIdx) => {
              const num = col.range[0] + rowIdx;
              const isCalled = calledNumbers.includes(num);
              return <div key={`${colIdx}-${rowIdx}`} className={`flex items-center justify-center rounded-sm text-[9px] font-black transition-all ${isCalled ? 'bg-white text-[#5e35b1]' : 'bg-white/10 text-white/40'}`}>{num}</div>;
            }))}
          </div>
        </div>

        <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
          <div className="bg-black/40 rounded-lg p-2 flex justify-between items-center h-14 border border-white/5">
            <span className="text-[10px] font-black text-white uppercase">Last Call</span>
            <div className="w-10 h-10 bg-[#f48120] rounded-full flex items-center justify-center text-white text-xl font-black shadow-lg">
              {currentCall || '-'}
            </div>
          </div>
          <div className="bg-white/20 rounded-xl p-1.5 flex-1 flex flex-col items-center justify-center relative border border-white/10 shadow-lg">
            <div className="grid grid-cols-5 gap-1 w-full aspect-square max-w-[190px]">
              {cardMatrix.map((row, rIdx) => row.map((val, cIdx) => {
                const isMarked = markedNumbers.includes(val as any);
                const isTrulyCalled = val === '*' || calledNumbers.includes(val as number);
                return (
                  <button 
                    key={`${cIdx}-${rIdx}`} 
                    onClick={() => handleMark(val)} 
                    disabled={val === '*' || gameState === 'ended'}
                    className={`aspect-square flex items-center justify-center rounded-sm font-black text-base transition-all border border-black/5 ${
                      val === '*' ? 'bg-green-700 text-white' : 
                      isMarked ? (isTrulyCalled ? 'bg-green-600 text-white shadow-md ring-2 ring-white/50' : 'bg-gray-700 text-white/70') : 
                      'bg-white/90 text-black active:scale-95 shadow-sm'
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

      <div className="px-3 py-3 space-y-2 shrink-0 bg-black/10 backdrop-blur-md">
        <button 
          onClick={handleBingoClick} 
          disabled={gameState !== 'running'} 
          className={`w-full py-4 rounded-full font-black text-2xl shadow-xl uppercase transition-all active:scale-95 ${
            gameState !== 'running' ? 'bg-orange-500/50 text-white/50 cursor-not-allowed' : 'bg-[#f48120] text-white ring-2 ring-white/10'
          }`}
        >
          BINGO!
        </button>
        <button onClick={onLeave} className="w-full bg-[#f04e4e] text-white py-2.5 rounded-full font-black text-[11px] uppercase shadow-lg">Leave Room</button>
      </div>

      {gameState === 'ended' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-[#a28cd1] rounded-[2.5rem] p-8 text-center shadow-2xl max-w-[300px] w-full border border-white/20 text-white">
            {winInfo ? (
              <>
                <div className="w-16 h-16 bg-green-500 rounded-full mx-auto mb-4 flex items-center justify-center shadow-lg border-2 border-white animate-bounce">
                  <i className="fas fa-crown text-white text-2xl"></i>
                </div>
                <h2 className="text-2xl font-black mb-1 uppercase">WINNER!</h2>
                <p className="text-4xl font-black text-yellow-400 mb-6">{DERASH.toFixed(0)} ETB</p>
              </>
            ) : (
              <>
                <div className="w-16 h-16 bg-white/10 rounded-full mx-auto mb-6 flex items-center justify-center">
                  <i className="fas fa-flag-checkered text-white/40 text-2xl"></i>
                </div>
                <h2 className="text-xl font-black mb-4 uppercase">GAME ENDED</h2>
              </>
            )}
            <button onClick={onLeave} className="w-full py-4 bg-white text-[#a28cd1] rounded-full font-black uppercase transition-all active:scale-95">
              Return to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRoom;
