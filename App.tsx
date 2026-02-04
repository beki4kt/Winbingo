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
  const [walletBalance, setWalletBalance] = useState<number>(0); 
  const [bonus, setBonus] = useState<number>(0);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [selectedSessionIdx, setSelectedSessionIdx] = useState<number>(0);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);

  // 1. INITIALIZE & FETCH REAL BALANCE
  useEffect(() => {
    const initApp = async () => {
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        tg.expand();
        
        const telegramId = tg.initDataUnsafe?.user?.id;
        if (telegramId) {
          setUserId(telegramId.toString());
          try {
            // Call Backend to get Real Balance
            const res = await fetch(`/api/user/${telegramId}`);
            const data = await res.json();
            if (data.balance !== undefined) {
              setWalletBalance(data.balance);
            }
          } catch (e) {
            console.error("Failed to load user data", e);
          }
        }
      }
    };
    initApp();
  }, []);

  const safeAlert = (message: string) => {
    const tg = window.Telegram?.WebApp;
    if (tg?.showAlert) tg.showAlert(message);
    else alert(message);
  };

  // 2. BUY TICKET (Integrated with Server)
  const handleJoinGame = async (num: number, stake: number, roomId: string) => {
    if (!userId) {
      safeAlert("Please open in Telegram.");
      return;
    }

    if (walletBalance < stake) {
      safeAlert("Insufficient balance! Please deposit.");
      return;
    }

    try {
      // Call Backend to Deduct Money
      const res = await fetch('/api/game/buy-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tid: userId, price: stake })
      });
      
      const result = await res.json();

      if (result.success) {
        // Update Local State with Server Balance
        setWalletBalance(result.newBalance);
        
        // Haptic Feedback
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');

        // Start Game
        const newSession = { roomId, boardNumber: num, stake };
        const newSessions = [...activeSessions, newSession];
        setActiveSessions(newSessions);
        setSelectedSessionIdx(newSessions.length - 1);
        setCurrentView(View.ACTIVE_GAME);
      } else {
        safeAlert(result.message || "Transaction Failed");
      }
    } catch (e) {
      safeAlert("Connection Error");
    }
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
    if (activeSessions.length > 0) setCurrentView(View.ACTIVE_GAME);
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
            userId={userId} // Pass ID for winning logic
          />
        );
      case View.WALLET:
        return <Wallet balance={walletBalance} setBalance={setWalletBalance} isDarkMode={isDarkMode} />;
      case View.SCORES: return <Leaderboard isDarkMode={isDarkMode} />;
      case View.HISTORY: return <History isDarkMode={isDarkMode} />;
      case View.ADMIN: return <Admin isDarkMode={isDarkMode} />;
      case View.PROFILE: return <div className="p-10 text-white text-center">User ID: {userId}</div>;
      default: return null;
    }
  };

  return (
    <div className={`flex flex-col h-[100dvh] w-full max-w-md mx-auto ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#065f46]'} overflow-hidden shadow-2xl relative transition-colors duration-500`}>
      {(currentView !== View.ADMIN && currentView !== View.ACTIVE_GAME) && (
        <Header 
          balance={walletBalance} 
          bonus={bonus} 
          activeGames={activeSessions.length} 
          stake={activeSessions.reduce((acc, s) => acc + s.stake, 0)} 
          onReturnToGame={returnToGame}
          isDarkMode={isDarkMode}
          toggleTheme={() => setIsDarkMode(!isDarkMode)}
        />
      )}
      <main className="flex-1 overflow-hidden relative">{renderContent()}</main>
      {currentView !== View.ACTIVE_GAME && (
        <Navigation 
          currentView={currentView} 
          setView={setCurrentView} 
          isDarkMode={isDarkMode}
          activeGameCount={activeSessions.length}
        />
      )}
    </div>
  );
};

export default App;