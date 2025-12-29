
import React, { useState, useEffect } from 'react';
import { View } from './types.ts';
import Lobby from './components/Lobby.tsx';
import GameRoom from './components/GameRoom.tsx';
import Wallet from './components/Wallet.tsx';
import Navigation from './components/Navigation.tsx';
import Header from './components/Header.tsx';
import Admin from './components/Admin.tsx';
import Leaderboard from './components/Leaderboard.tsx';
import History from './components/History.tsx';

interface ActiveSession {
  roomId: string;
  boardNumber: number;
  stake: number;
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.LOBBY);
  const [walletBalance, setWalletBalance] = useState<number>(1.91); 
  const [bonus, setBonus] = useState<number>(0);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [selectedSessionIdx, setSelectedSessionIdx] = useState<number>(0);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  
  // Forced Dark Mode for professional look
  const isDarkMode = true;

  const handleJoinGame = (num: number, stake: number, roomId: string) => {
    if (walletBalance < stake) {
      alert("Insufficient balance for this stake.");
      return;
    }
    
    setWalletBalance(prev => prev - stake);
    const newSession = { roomId, boardNumber: num, stake };
    const newSessions = [...activeSessions, newSession];
    setActiveSessions(newSessions);
    setSelectedSessionIdx(newSessions.length - 1);
    setCurrentView(View.ACTIVE_GAME);
  };

  const handleLeaveGame = (roomId: string) => {
    const updated = activeSessions.filter(s => s.roomId !== roomId);
    setActiveSessions(updated);
    if (updated.length === 0) {
      setCurrentView(View.LOBBY);
      setSelectedNumber(null);
    } else {
      setSelectedSessionIdx(0);
      setCurrentView(View.LOBBY);
    }
  };

  const returnToGame = () => {
    if (activeSessions.length > 0) {
      setCurrentView(View.ACTIVE_GAME);
    }
  };

  const renderContent = () => {
    switch (currentView) {
      case View.LOBBY:
        return (
          <Lobby 
            onStartGame={handleJoinGame} 
            selectedNumber={selectedNumber}
            setSelectedNumber={setSelectedNumber}
            activeRoomIds={activeSessions.map(s => s.roomId)}
            isDarkMode={isDarkMode}
          />
        );
      case View.ACTIVE_GAME:
        const currentSession = activeSessions[selectedSessionIdx];
        if (!currentSession) return null;
        return (
          <GameRoom 
            onLeave={() => handleLeaveGame(currentSession.roomId)} 
            boardNumber={currentSession.boardNumber}
            stake={currentSession.stake}
            balance={walletBalance}
            setBalance={setWalletBalance}
            roomId={currentSession.roomId}
            isDarkMode={isDarkMode}
          />
        );
      case View.WALLET:
        return <Wallet balance={walletBalance} setBalance={setWalletBalance} isDarkMode={isDarkMode} />;
      case View.SCORES:
        return <Leaderboard isDarkMode={isDarkMode} />;
      case View.HISTORY:
        return <History isDarkMode={isDarkMode} />;
      case View.ADMIN:
        return <Admin isDarkMode={isDarkMode} />;
      case View.PROFILE:
        return (
          <div className="p-8 text-white text-center animate-fadeIn min-h-full">
            <div className="w-24 h-24 bg-indigo-500/10 rounded-full mx-auto mb-4 flex items-center justify-center border border-white/10 shadow-lg">
              <i className="fas fa-user-shield text-4xl text-indigo-400"></i>
            </div>
            <h2 className="text-xl font-black mb-1 uppercase tracking-tight">Verified Account</h2>
            <p className="text-white/40 text-[10px] mb-8 font-bold uppercase tracking-widest">ID: 99281734</p>
            <div className="bg-slate-900 rounded-3xl p-6 text-left space-y-4 border border-white/5">
              <div className="flex justify-between text-[11px] uppercase font-bold tracking-wider">
                <span className="opacity-50">Total Events</span>
                <span>142</span>
              </div>
              <div className="flex justify-between text-[11px] uppercase font-bold tracking-wider">
                <span className="opacity-50">Total Revenue</span>
                <span className="text-emerald-400">1,405 ETB</span>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-[#0f172a] overflow-hidden relative shadow-[0_0_100px_rgba(0,0,0,0.5)]">
      {(currentView !== View.ADMIN && currentView !== View.ACTIVE_GAME) && (
        <Header 
          balance={walletBalance} 
          bonus={bonus} 
          activeGames={activeSessions.length} 
          stake={activeSessions.reduce((acc, s) => acc + s.stake, 0)} 
          onReturnToGame={returnToGame}
          isDarkMode={isDarkMode}
          toggleTheme={() => {}}
        />
      )}
      
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {renderContent()}
      </main>

      {currentView !== View.ACTIVE_GAME && (
        <Navigation currentView={currentView} setView={setCurrentView} isDarkMode={isDarkMode} />
      )}
    </div>
  );
};

export default App;
