import React, { useState, useEffect } from 'react';
import { View } from './types';
import StakeSelection from './components/StakeSelection'; // NEW
import Lobby from './components/Lobby';
import GameRoom from './components/GameRoom';
import Wallet from './components/Wallet';
import Navigation from './components/Navigation';
import Header from './components/Header';
import SuperAdmin from './components/SuperAdmin'; // NEW
import History from './components/History';
import Profile from './components/Profile';

interface ActiveSession { roomId: string; boardNumber: number; stake: number; }

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<View>(View.LOBBY); // Will override effectively
  const [hasSelectedStake, setHasSelectedStake] = useState(false);
  const [selectedStake, setSelectedStake] = useState<number>(10);
  
  const [walletBalance, setWalletBalance] = useState<number>(0); 
  const [coinBalance, setCoinBalance] = useState<number>(0);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [tgUser, setTgUser] = useState<any>(null);

  // Game State
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [selectedSessionIdx, setSelectedSessionIdx] = useState<number>(0);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);

  useEffect(() => {
    const initApp = async () => {
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready(); tg.expand();
        const user = tg.initDataUnsafe?.user;
        if (user?.id) {
          setUserId(user.id.toString());
          setTgUser(user);
          // Check if Admin (Hardcoded or DB check)
          if(user.id === 1386622435 || user.username === 'YourUsername') setIsAdmin(true); 
          fetchUserData(user.id.toString());
        }
      }
    };
    initApp();
  }, []);

  const fetchUserData = async (tid: string) => {
      try {
        const res = await fetch(`/api/user/${tid}`);
        const data = await res.json();
        setWalletBalance(data.balance || 0);
        setCoinBalance(data.coins || 0);
        if(data.isAdmin) setIsAdmin(true);
      } catch (e) {}
  };

  // 1. First Action: User Selects Stake
  const handleStakeSelect = (stake: number) => {
      setSelectedStake(stake);
      setHasSelectedStake(true);
      setCurrentView(View.LOBBY); // Go to Lobby after stake
  };

  // 2. Lobby Action: User Picks Board -> Joins Game
  const handleBoardSelect = async (num: number) => {
      if(!userId) return;
      if (walletBalance < selectedStake) { alert("Insufficient Balance!"); return; }

      try {
         const roomId = 'RM-' + selectedStake + '-' + Math.floor(Math.random()*1000);
         const res = await fetch('/api/game/buy-ticket', {
             method: 'POST', headers: {'Content-Type': 'application/json'},
             body: JSON.stringify({ tid: userId, price: selectedStake, roomId })
         });
         const d = await res.json();
         if(d.success) {
             fetchUserData(userId);
             const newSession = { roomId, boardNumber: num, stake: selectedStake };
             setActiveSessions([...activeSessions, newSession]);
             setSelectedSessionIdx(activeSessions.length);
             setCurrentView(View.ACTIVE_GAME);
             setSelectedNumber(null);
         } else { alert("Error joining"); }
      } catch(e) {}
  };

  // --- VIEW ROUTER ---
  const renderContent = () => {
    // FORCE STAKE SELECTION FIRST if not in game and not selected
    if (!hasSelectedStake && currentView !== View.ADMIN) {
        return <StakeSelection onSelectStake={handleStakeSelect} isDarkMode={isDarkMode} />;
    }

    switch (currentView) {
      case View.LOBBY:
        return <Lobby onBoardSelect={handleBoardSelect} selectedNumber={selectedNumber} setSelectedNumber={setSelectedNumber} isDarkMode={isDarkMode} />;
      case View.ACTIVE_GAME:
        const s = activeSessions[selectedSessionIdx];
        if(!s) return null;
        return <GameRoom onLeave={() => { setActiveSessions([]); setCurrentView(View.LOBBY); }} boardNumber={s.boardNumber} stake={s.stake} roomId={s.roomId} isDarkMode={isDarkMode} userId={userId} refreshUserData={() => userId && fetchUserData(userId)} />;
      case View.WALLET:
        return <Wallet balance={walletBalance} coins={coinBalance} userId={userId} refreshData={() => userId && fetchUserData(userId)} isDarkMode={isDarkMode} />;
      case View.ADMIN:
        return <SuperAdmin />; // Protected View
      case View.HISTORY: return <History userId={userId} isDarkMode={isDarkMode} />;
      case View.PROFILE: return <Profile user={tgUser} balance={walletBalance} coins={coinBalance} isDarkMode={isDarkMode} />;
      default: return null;
    }
  };

  return (
    <div className={`flex flex-col h-[100dvh] w-full max-w-md mx-auto ${isDarkMode ? 'bg-[#0f172a]' : 'bg-[#065f46]'} overflow-hidden shadow-2xl relative`}>
      {/* Header hidden on Stake Selection */}
      {(hasSelectedStake && currentView !== View.ADMIN && currentView !== View.ACTIVE_GAME) && (
        <Header balance={walletBalance} bonus={coinBalance} activeGames={activeSessions.length} stake={selectedStake} onReturnToGame={() => setCurrentView(View.ACTIVE_GAME)} isDarkMode={isDarkMode} toggleTheme={() => setIsDarkMode(!isDarkMode)} />
      )}
      
      <main className="flex-1 overflow-hidden relative">{renderContent()}</main>

      {/* Nav hidden on Stake Selection */}
      {(hasSelectedStake && currentView !== View.ACTIVE_GAME && currentView !== View.ADMIN) && (
        <Navigation currentView={currentView} setView={setCurrentView} isDarkMode={isDarkMode} activeGameCount={activeSessions.length} />
      )}

      {/* Secret Admin Button (Top Left Overlay) */}
      {isAdmin && (
          <button onClick={() => setCurrentView(View.ADMIN)} className="absolute top-0 left-0 p-4 opacity-0 hover:opacity-100 text-red-500 font-bold z-50">Admin</button>
      )}
    </div>
  );
};

export default App;