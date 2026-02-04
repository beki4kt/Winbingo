import React from 'react';

interface StakeModalProps {
  onClose: () => void;
  onConfirm: (stake: number) => void;
  isDarkMode: boolean;
}

const StakeSelectionModal: React.FC<StakeModalProps> = ({ onClose, onConfirm, isDarkMode }) => {
  const stakes = [10, 20, 50, 100];
  const bg = isDarkMode ? 'bg-slate-800 text-white' : 'bg-white text-emerald-900';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fadeIn">
      <div className={`w-full max-w-sm ${bg} rounded-3xl p-6 shadow-2xl scale-100`}>
        <h3 className="text-xl font-black text-center mb-2 uppercase">Select Stake</h3>
        <p className="text-center opacity-60 text-xs mb-6 font-bold">Choose your entry fee per board</p>
        
        <div className="grid grid-cols-2 gap-3 mb-6">
          {stakes.map((amount) => (
            <button
              key={amount}
              onClick={() => onConfirm(amount)}
              className="py-4 rounded-xl border-2 border-current hover:bg-emerald-500 hover:text-white hover:border-emerald-500 transition-all font-black text-xl flex flex-col items-center gap-1 active:scale-95"
            >
              <span>{amount}</span>
              <span className="text-[10px] opacity-60 uppercase">ETB</span>
            </button>
          ))}
        </div>

        <button 
          onClick={onClose}
          className="w-full py-3 bg-red-500/10 text-red-500 font-bold rounded-xl hover:bg-red-500 hover:text-white transition-colors uppercase text-xs"
        >
          Cancel
        </button>
      </div>
    </div>
  );
};

export default StakeSelectionModal;