
import React, { useState, useEffect } from 'react';
import { View } from './types';
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import Wallet from './components/Wallet';
import Navigation from './components/Navigation';
import Header from './components/Header';
import Admin from './components/Admin';
import Leaderboard from './components/Leaderboard';
import History from './components/History';

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
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    // Initialize Telegram WebApp
    if (window.Telegram && window.Telegram.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();

      const color = isDarkMode ? '#0f172a' : '#a28cd1';
      
      if (tg.isVersionAtLeast && tg.isVersionAtLeast('6.1')) {
        try {
          if (typeof tg.setHeaderColor === 'function') tg.setHeaderColor(color);
          if (typeof tg.setBackgroundColor === 'function') tg.setBackgroundColor(color);
        } catch (e) {
          console.warn("Telegram theme updates failed", e);
        }
      }
    }
  }, [isDarkMode]);

  const handleJoinGame = (num: number, stake: number, roomId: string) => {
    if (walletBalance < stake) {
      if (window.Telegram?.WebApp?.showAlert) {
        window.Telegram.WebApp.showAlert("Insufficient balance! Refill your wallet.");
      } else {
        alert("Insufficient balance! Please deposit funds.");
      }
      return;
    }
    
    if (window.Telegram?.WebApp?.HapticFeedback?.impactOccurred) {
      window.Telegram.WebApp.HapticFeedback.impactOccurred('medium');
    }

    setWalletBalance(prev => prev - stake);
    const newSession = { roomId, boardNumber: num, stake };
    const newSessions = [...activeSessions, newSession];
    setActiveSessions(newSessions);
    setSelectedSessionIdx(newSessions.length - 1);
    setCurrentView(View.ACTIVE_GAME);
  };

  const handleLeaveGame = (roomId: string) => {
    if (window.Telegram?.WebApp?.HapticFeedback?.notificationOccurred) {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred('warning');
    }
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
            <div className={`w-24 h-24 ${isDarkMode ? 'bg-indigo-500/20' : 'bg-white/20'} rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/10 shadow-lg`}>
              <i className="fas fa-user text-4xl text-white"></i>
            </div>
            <h2 className="text-2xl font-black mb-1">Win Player</h2>
            <p className="text-white/60 text-xs mb-6 font-bold uppercase">ID: 99281734</p>
            <div className={`${isDarkMode ? 'bg-gray-800' : 'bg-white/10'} rounded-3xl p-6 text-left space-y-4 shadow-inner border border-white/5`}>
              <div className="flex justify-between text-sm">
                <span className="font-bold opacity-70">Total Games</span>
                <span className="font-black">142</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-bold opacity-70">Total Won</span>
                <span className="font-black text-orange-200">1,405 ETB</span>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const bgColor = isDarkMode ? 'bg-[#0f172a]' : 'bg-[#a28cd1]';

  return (
    <div className={`flex flex-col h-screen max-w-md mx-auto ${bgColor} overflow-hidden shadow-2xl relative transition-colors duration-500`}>
      {(currentView !== View.ADMIN && currentView !== View.ACTIVE_GAME) && (
        <Header 
          balance={walletBalance} 
          bonus={bonus} 
          activeGames={activeSessions.length} 
          stake={activeSessions.reduce((acc, s) => acc + s.stake, 0)} 
          onReturnToGame={returnToGame}
          isDarkMode={isDarkMode}
          toggleTheme={() => {
            if (window.Telegram?.WebApp?.HapticFeedback?.impactOccurred) {
              window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
            }
            setIsDarkMode(!isDarkMode);
          }}
        />
      )}
      
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {renderContent()}
      </main>

      {currentView !== View.ACTIVE_GAME && (
        <Navigation 
          currentView={currentView} 
          setView={(v) => {
            if (window.Telegram?.WebApp?.HapticFeedback?.impactOccurred) {
              window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
            }
            setCurrentView(v);
          }} 
          isDarkMode={isDarkMode} 
        />
      )}
    </div>
  );
};

export default App;
