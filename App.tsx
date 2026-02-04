// App.tsx
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
import Profile from './components/Profile';
import StakeSelectionModal from './components/StakeSelectionModal'; // New component

interface ActiveSession {
  roomId: string;
  boardNumber: number;
  stake: number;
}

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.LOBBY);
  const [walletBalance, setWalletBalance] = useState<number>(0); 
  const [coinBalance, setCoinBalance] = useState<number>(0); // New Coin State
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [selectedSessionIdx, setSelectedSessionIdx] = useState<number>(0);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tgUser, setTgUser] = useState<any>(null);
  // Stake Modal State
  const [showStakeModal, setShowStakeModal] = useState(false);
  const [pendingBoardNum, setPendingBoardNum] = useState<number | null>(null);

  // Fetch Data Wrapper
  const fetchUserData = async (tid: string) => {
      try {
        const res = await fetch(`/api/user/${tid}`);
        const data = await res.json();
        if (data.balance !== undefined) {
          setWalletBalance(data.balance);
          setCoinBalance(data.coins); // Update coins
        }
      } catch (e) { console.error("Failed to load user data", e); }
  };

  useEffect(() => {
    const initApp = async () => {
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready(); tg.expand(); tg.enableClosingConfirmation();
        const user = tg.initDataUnsafe?.user;
        if (user?.id) {
          setUserId(user.id.toString());
          setTgUser(user);
          fetchUserData(user.id.toString());
        }
      }
    };
    initApp();
  }, []);

  const safeAlert = (msg: string) => window.Telegram?.WebApp?.showAlert ? window.Telegram.WebApp.showAlert(msg) : alert(msg);

  // 1. Lobby triggers stake modal instead of immediate join
  const handleBoardSelect = (num: number) => {
      setPendingBoardNum(num);
      setShowStakeModal(true);
  };

  // 2. Stake Modal confirms and joins game
  const handleConfirmStake = async (stake: number) => {
    setShowStakeModal(false);
    if (pendingBoardNum === null || !userId) return;

    if (walletBalance < stake) { safeAlert("Insufficient balance!"); return; }

    try {
      const roomId = 'RM' + Math.floor(Math.random() * 9999);
      const res = await fetch('/api/game/buy-ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tid: userId, price: stake, roomId })
      });
      const result = await res.json();

      if (result.success) {
        fetchUserData(userId); // Refresh balances
        window.Telegram?.WebApp?.HapticFeedback?.impactOccurred('medium');
        const newSession = { roomId, boardNumber: pendingBoardNum, stake };
        setActiveSessions([...activeSessions, newSession]);
        setSelectedSessionIdx(activeSessions.length);
        setCurrentView(View.ACTIVE_GAME);
        setSelectedNumber(null);
      } else { safeAlert(result.message || "Failed"); }
    } catch (e) { safeAlert("Connection Error"); }
  };

  const handleLeaveGame = (roomId: string) => {
    if(userId) fetchUserData(userId); // Refresh on leave to get coin updates
    const updated = activeSessions.filter(s => s.roomId !== roomId);
    setActiveSessions(updated);
    setCurrentView(View.LOBBY);
    setSelectedSessionIdx(0);
  };

  const renderContent = () => {
    switch (currentView) {
      case View.LOBBY:
        return <Lobby onBoardSelect={handleBoardSelect} selectedNumber={selectedNumber} setSelectedNumber={setSelectedNumber} isDarkMode={isDarkMode} />;
      case View.ACTIVE_GAME:
        const currentSession = activeSessions[selectedSessionIdx];
        if (!currentSession) return null;
        return <GameRoom onLeave={() => handleLeaveGame(currentSession.roomId)} boardNumber={currentSession.boardNumber} stake={currentSession.stake} roomId={currentSession.roomId} isDarkMode={isDarkMode} userId={userId} refreshUserData={() => userId && fetchUserData(userId)}/>;
      case View.WALLET:
        return <Wallet balance={walletBalance} coins={coinBalance} userId={userId} refreshData={() => userId && fetchUserData(userId)} isDarkMode={isDarkMode} />;
      case View.HISTORY: return <History userId={userId} isDarkMode={isDarkMode} />;
      case View.PROFILE: return <Profile user={tgUser} balance={walletBalance} coins={coinBalance} isDarkMode={isDarkMode} />;
      case View.SCORES: return <Leaderboard isDarkMode={isDarkMode} />;
      case View.ADMIN: return <Admin isDarkMode={isDarkMode} />;
      default: return null;
    }
  };

  return (
    <div className={`flex flex-col h-[100dvh] w-full max-w-md mx-auto ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#065f46]'} overflow-hidden shadow-2xl relative transition-colors duration-500`}>
      {(currentView !== View.ADMIN && currentView !== View.ACTIVE_GAME) && (
        <Header balance={walletBalance} bonus={coinBalance} activeGames={activeSessions.length} stake={activeSessions.reduce((acc, s) => acc + s.stake, 0)} onReturnToGame={() => activeSessions.length > 0 && setCurrentView(View.ACTIVE_GAME)} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />
      )}
      <main className="flex-1 overflow-hidden relative">{renderContent()}</main>
      {currentView !== View.ACTIVE_GAME && (
        <Navigation currentView={currentView} setView={setCurrentView} isDarkMode={isDarkMode} activeGameCount={activeSessions.length} />
      )}
      {/* Stake Selection Modal */}
      {showStakeModal && (
          <StakeSelectionModal onClose={() => setShowStakeModal(false)} onConfirm={handleConfirmStake} isDarkMode={isDarkMode} />
      )}
    </div>
  );
};

export default App;