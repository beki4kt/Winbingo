import React from 'react';

interface ProfileProps {
  user: any;
  balance: number;
  coins: number;
  isDarkMode: boolean;
}

const Profile: React.FC<ProfileProps> = ({ user, balance, coins, isDarkMode }) => {
  const bg = isDarkMode ? 'bg-slate-800' : 'bg-white/10';
  
  return (
    <div className="p-8 text-white text-center animate-fadeIn h-full overflow-y-auto pb-32">
      <div className={`w-24 h-24 ${isDarkMode ? 'bg-indigo-500/20' : 'bg-white/20'} rounded-full mx-auto mb-4 flex items-center justify-center border-4 border-white/10 shadow-lg`}>
        {user?.photo_url ? (
            <img src={user.photo_url} alt="Profile" className="w-full h-full rounded-full" />
        ) : (
            <i className="fas fa-user text-4xl text-white"></i>
        )}
      </div>
      <h2 className="text-2xl font-black mb-1">{user?.first_name || 'Win Player'}</h2>
      <p className="text-white/60 text-xs mb-6 font-bold uppercase tracking-widest">ID: {user?.id || '---'}</p>
      
      <div className={`${bg} rounded-3xl p-6 text-left space-y-4 shadow-inner border border-white/5`}>
        <div className="flex justify-between items-center pb-4 border-b border-white/5">
          <span className="font-bold opacity-70 text-sm">Wallet Balance</span>
          <span className="font-black text-xl text-emerald-400">{balance.toFixed(2)} ETB</span>
        </div>
        <div className="flex justify-between items-center">
            <span className="font-bold opacity-70 text-sm">Win Coins</span>
            <div className="flex items-center gap-2">
                <div className="w-5 h-5 rounded-full bg-yellow-400 flex items-center justify-center text-[10px] text-yellow-900 font-bold">C</div>
                <span className="font-black text-xl text-yellow-400">{coins}</span>
            </div>
        </div>
      </div>
      
      <div className="mt-6 p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 text-xs text-blue-200">
        <i className="fas fa-info-circle mr-2"></i>
        Play games to earn Coins. 100 Coins = 10 ETB.
      </div>
    </div>
  );
};

export default Profile;