
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
        let nextNum: number;
        do {
          nextNum = Math.floor(Math.random() * 75) + 1;
        } while (calledNumbers.includes(nextNum));

        setCurrentCall(nextNum);
        setCalledNumbers(prev => [...prev, nextNum]);
      }, 3500); 
      return () => clearInterval(interval);
    }
  }, [gameState, calledNumbers]);

  const handleMark = (num: number | string) => {
    if (gameState !== 'running' || num === '*') return;
    setMarkedNumbers(prev => 
      prev.includes(num as any) 
        ? prev.filter(n => n !== num) 
        : [...prev, num as any]
    );
  };

  const handleBingoClick = () => {
    const win = checkBingoWin(cardMatrix, markedNumbers);
    if (win) {
      const winPattern = getWinPatternCells(win, cardMatrix);
      const allValid = winPattern.every(cell => cell === '*' || calledNumbers.includes(cell as number));
      
      if (allValid) {
        setBalance(balance + DERASH);
        setWinInfo(win);
        setGameState('ended');
      } else {
        alert("Wait! Some marked numbers haven't been called yet.");
      }
    } else {
      alert("No Bingo pattern detected! Keep marking.");
    }
  };

  const getWinPatternCells = (win: {type: string, index: number}, matrix: (number|string)[][]) => {
    const cells: (number|string)[] = [];
    if (win.type === 'ROW') cells.push(...matrix[win.index]);
    if (win.type === 'COL') {
      for (let r = 0; r < 5; r++) cells.push(matrix[r][win.index]);
    }
    if (win.type === 'DIAG') {
      for (let i = 0; i < 5; i++) {
        cells.push(win.index === 1 ? matrix[i][i] : matrix[i][4-i]);
      }
    }
    if (win.type === 'CORNER') {
      cells.push(matrix[0][0], matrix[0][4], matrix[4][0], matrix[4][4]);
    }
    return cells;
  };

  const letters = [
    { label: 'B', color: 'bg-yellow-500' },
    { label: 'I', color: 'bg-green-500' },
    { label: 'N', color: 'bg-blue-500' },
    { label: 'G', color: 'bg-red-500' },
    { label: 'O', color: 'bg-purple-700' },
  ];

  const boardCols = [
    { range: [1, 15] },
    { range: [16, 30] },
    { range: [31, 45] },
    { range: [46, 60] },
    { range: [61, 75] },
  ];

  const StatPill = ({ label, value, sub, highlight }: { label: string, value: string | number, sub?: string, highlight?: boolean }) => (
    <div className={`${isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white/90 border-purple-300'} rounded-md p-1 flex flex-col items-center justify-center border min-w-0 shadow-sm ${highlight ? 'ring-2 ring-yellow-400' : ''}`}>
      <span className={`text-[6px] ${isDarkMode ? 'text-indigo-400' : 'text-purple-800'} font-bold uppercase leading-none mb-0.5 whitespace-nowrap`}>{label}</span>
      <span className={`text-[8px] font-black ${isDarkMode ? 'text-white' : 'text-purple-900'} leading-none truncate`}>{value}</span>
      {sub && <span className={`text-[6px] ${isDarkMode ? 'text-gray-500' : 'text-purple-400'} font-bold leading-none mt-0.5`}>{sub}</span>}
    </div>
  );

  return (
    <div className={`flex flex-col h-full ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#a28cd1]'} overflow-hidden animate-fadeIn select-none transition-colors duration-500`}>
      {/* Top Status Bar */}
      <div className="grid grid-cols-7 gap-1 px-2 py-2 shrink-0">
        <StatPill label="Arena" value={roomId.replace('ARENA-','')} sub="SYNC" />
        <StatPill label="Derash" value={DERASH.toFixed(0)} />
        <StatPill label="Bonus" value="Off" />
        <StatPill label="Players" value={PLAYER_COUNT} highlight={true} />
        <StatPill label="Stake" value={stake} />
        <StatPill label="Call" value={calledNumbers.length} />
        <StatPill label="Sound" value="Off" />
      </div>

      <div className="flex flex-1 overflow-hidden px-2 gap-2 pb-1 pt-1">
        {/* Left column: 1-75 Caller Grid */}
        <div className={`w-[150px] flex flex-col ${isDarkMode ? 'bg-black/40' : 'bg-white/20'} rounded-xl overflow-hidden p-1 shrink-0 border border-white/10 shadow-inner`}>
          <div className="grid grid-cols-5 gap-0.5 mb-1">
            {letters.map((l, i) => (
              <div key={i} className={`${l.color} text-white text-[10px] font-black text-center py-1.5 rounded-t-md`}>
                {l.label}
              </div>
            ))}
          </div>
          <div className="flex-1 grid grid-cols-5 gap-0.5">
            {Array.from({ length: 15 }).map((_, rowIdx) => (
              boardCols.map((col, colIdx) => {
                const num = col.range[0] + rowIdx;
                const isCalled = calledNumbers.includes(num);
                return (
                  <div 
                    key={`${colIdx}-${rowIdx}`} 
                    className={`flex items-center justify-center rounded-sm text-[9px] font-black h-full transition-all duration-300
                      ${isCalled 
                        ? (isDarkMode ? 'bg-indigo-600 text-white' : 'bg-white text-[#5e35b1]') 
                        : (isDarkMode ? 'bg-white/5 text-white/10' : 'bg-white/10 text-white/40')}`}
                  >
                    {num}
                  </div>
                );
              })
            ))}
          </div>
        </div>

        {/* Right column: Info & Player Card */}
        <div className="flex-1 flex flex-col gap-1.5 overflow-hidden">
          <div className="flex flex-col gap-1 shrink-0">
            <div className={`${isDarkMode ? 'bg-gray-800/80' : 'bg-white/30'} rounded-lg flex justify-between items-center px-3 py-1.5 border border-white/10 shadow-sm`}>
              <span className={`text-[10px] font-black ${isDarkMode ? 'text-indigo-400' : 'text-purple-900'} uppercase`}>Status</span>
              <span className={`text-[10px] font-black ${isDarkMode ? 'text-white' : 'text-purple-900'} uppercase`}>
                {gameState === 'waiting' ? 'Syncing...' : 
                 gameState === 'running' ? 'Running' : 
                 gameState === 'starting' ? countdown : 'Ended'}
              </span>
            </div>
            
            <div className={`${isDarkMode ? 'bg-gray-900' : 'bg-[#604294]'} rounded-lg p-2 flex justify-between items-center h-14 border border-white/5 shadow-inner`}>
              <span className="text-[10px] font-black text-white uppercase">Call</span>
              <div className="w-10 h-10 bg-[#f48120] rounded-full flex items-center justify-center text-white text-xl font-black shadow-lg border-2 border-white/20">
                {currentCall || '-'}
              </div>
            </div>
          </div>

          {/* Player Bingo Card */}
          <div className={`${isDarkMode ? 'bg-black/40' : 'bg-white/20'} rounded-xl p-1.5 flex-1 flex flex-col items-center justify-center border border-white/10 shadow-lg relative`}>
            <div className="grid grid-cols-5 gap-1 mb-1 w-full max-w-[190px]">
              {letters.map((l, i) => (
                <div key={i} className={`${l.color} text-white text-[11px] font-black text-center py-1 rounded-md`}>
                  {l.label}
                </div>
              ))}
            </div>
            
            <div className="grid grid-cols-5 gap-1 w-full aspect-square max-w-[190px]">
              {cardMatrix.map((row, rIdx) => (
                row.map((val, cIdx) => {
                  const isMarked = markedNumbers.includes(val as any);
                  const isTrulyCalled = val === '*' || calledNumbers.includes(val as number);
                  
                  return (
                    <button
                      key={`${cIdx}-${rIdx}`}
                      onClick={() => handleMark(val)}
                      disabled={val === '*' || gameState === 'ended'}
                      className={`
                        aspect-square flex items-center justify-center rounded-sm font-black text-base transition-all border border-black/5
                        ${val === '*' ? 'bg-green-700 text-white shadow-inner' : 
                          isMarked ? (isTrulyCalled ? 'bg-green-600 text-white ring-2 ring-white/50' : 'bg-gray-700 text-white/70') : 
                          isDarkMode ? 'bg-gray-800 text-white' : 'bg-white/90 text-black active:scale-95 shadow-sm'}
                      `}
                    >
                      {val === '*' ? '★' : val}
                    </button>
                  );
                })
              ))}
            </div>
            <p className="text-[6px] font-black text-white/50 mt-1 uppercase">Board# {boardNumber}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className={`px-3 py-3 space-y-2 shrink-0 ${isDarkMode ? 'bg-black/60' : 'bg-black/10'} backdrop-blur-md`}>
        <button 
          onClick={handleBingoClick}
          disabled={gameState !== 'running'}
          className={`
            w-full py-4 rounded-full font-black text-2xl shadow-xl transition-all active:scale-95 uppercase
            ${gameState !== 'running' 
              ? 'bg-orange-500/50 text-white/50 cursor-not-allowed' 
              : 'bg-[#f48120] text-white ring-2 ring-white/10'}
          `}
        >
          BINGO!
        </button>
        
        <div className="flex gap-2">
          <button onClick={() => window.location.reload()} className="flex-1 bg-[#1eb2d9] text-white py-2.5 rounded-full font-black text-[11px] uppercase shadow-lg">Refresh</button>
          <button onClick={onLeave} className="flex-1 bg-[#f04e4e] text-white py-2.5 rounded-full font-black text-[11px] uppercase shadow-lg">Leave</button>
        </div>
      </div>

      {/* Result Modal */}
      {gameState === 'ended' && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-6 animate-fadeIn">
          <div className={`${isDarkMode ? 'bg-gray-900 border-indigo-500/50' : 'bg-[#a28cd1] border-white/20'} rounded-[2.5rem] p-8 text-center shadow-2xl max-w-[300px] w-full border text-white`}>
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
                <h2 className="text-xl font-black mb-4 uppercase">ARENA ENDED</h2>
              </>
            )}
            <button onClick={onLeave} className={`w-full py-4 ${isDarkMode ? 'bg-indigo-600 text-white' : 'bg-white text-[#a28cd1]'} rounded-full font-black shadow-xl uppercase transition-all text-[11px] tracking-widest`}>
              Return to Lobby
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default GameRoom;
