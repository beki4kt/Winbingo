
import React from 'react';
import { View } from '../types';

interface NavigationProps {
  currentView: View;
  setView: (view: View) => void;
  isDarkMode: boolean;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, setView, isDarkMode }) => {
  const tabs = [
    { id: View.LOBBY, label: 'Game', icon: 'fa-gamepad' },
    { id: View.SCORES, label: 'Scores', icon: 'fa-trophy' },
    { id: View.HISTORY, label: 'History', icon: 'fa-history' },
    { id: View.WALLET, label: 'Wallet', icon: 'fa-wallet' },
    { id: View.PROFILE, label: 'Profile', icon: 'fa-user' },
  ];

  const bgColor = isDarkMode ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-200';
  const activeColor = isDarkMode ? 'text-indigo-400' : 'text-gray-800';
  const inactiveColor = isDarkMode ? 'text-gray-600' : 'text-gray-400';

  return (
    <nav className={`absolute bottom-0 left-0 right-0 ${bgColor} border-t flex justify-around items-center py-3 px-1 z-40 rounded-t-3xl shadow-2xl transition-colors duration-500`}>
      {tabs.map(tab => {
        const isActive = currentView === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => setView(tab.id)}
            className={`flex flex-col items-center flex-1 transition-all active:scale-90 ${
              isActive ? activeColor : inactiveColor
            }`}
          >
            <i className={`fas ${tab.icon} text-lg mb-1`}></i>
            <span className="text-[9px] font-bold uppercase tracking-tighter">{tab.label}</span>
            {isActive && <div className={`w-1 h-1 ${isDarkMode ? 'bg-indigo-400' : 'bg-gray-800'} rounded-full mt-0.5`}></div>}
          </button>
        );
      })}
    </nav>
  );
};

export default Navigation;
