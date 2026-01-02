import React from 'react';
import { View } from '../types';

interface NavigationProps {
  currentView: View;
  setView: (view: View) => void;
  isDarkMode: boolean;
  activeGameCount: number;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, setView, isDarkMode, activeGameCount }) => {
  const tabs = [
    { id: View.LOBBY, label: 'Play', icon: 'fa-gamepad' },
    { id: View.SCORES, label: 'Top', icon: 'fa-trophy' },
    { id: View.HISTORY, label: 'Logs', icon: 'fa-history' },
    { id: View.WALLET, label: 'Wallet', icon: 'fa-wallet' },
    { id: View.PROFILE, label: 'Me', icon: 'fa-user' },
  ];

  const bgColor = isDarkMode 
    ? 'bg-gray-900/80 border-gray-800' 
    : 'bg-white/80 border-white/20';
  
  return (
    <nav className={`fixed bottom-0 left-0 right-0 ${bgColor} backdrop-blur-xl border-t flex justify-around items-center py-2 px-2 z-50 rounded-t-[2rem] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] transition-all duration-500 pb-safe`}>
      {tabs.map(tab => {
        const isActive = currentView === tab.id;
        const activeClass = isDarkMode ? 'bg-indigo-500/20 text-indigo-400' : 'bg-emerald-600/20 text-emerald-700';
        const inactiveClass = isDarkMode ? 'text-gray-500' : 'text-gray-400';

        return (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`flex flex-col items-center justify-center flex-1 py-2 rounded-2xl transition-all relative active:scale-90 ${
              isActive ? activeClass : inactiveClass
            }`}
          >
            <div className="relative">
              <i className={`fas ${tab.icon} text-xl mb-0.5`}></i>
              {tab.id === View.LOBBY && activeGameCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white animate-pulse">
                  {activeGameCount}
                </span>
              )}
            </div>
            <span className={`text-[9px] font-black uppercase tracking-tight ${isActive ? 'opacity-100' : 'opacity-60'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
};

export default Navigation;