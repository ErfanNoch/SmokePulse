import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Lock } from 'lucide-react';
import { UserProfile } from '../types';

interface PinLockScreenProps {
  profile: UserProfile;
  onUnlock: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({ profile, onUnlock }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  const handleKeyPress = (num: number) => {
    if (pin.length < 6) {
      const nextPin = pin + num;
      setPin(nextPin);
      setError(false);

      if (nextPin === profile.pin) {
        onUnlock();
      } else if (nextPin.length === (profile.pin?.length || 4)) {
        setError(true);
        setTimeout(() => setPin(''), 450);
      }
    }
  };

  const handleDelete = () => {
    setPin((p) => p.slice(0, -1));
    setError(false);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-xs flex flex-col items-center text-center">
        <div className="w-12 h-12 rounded-2xl bg-neutral-900 border border-neutral-800 flex items-center justify-center mb-4 text-white">
          <Lock className="w-5 h-5" />
        </div>

        <h1 className="text-base font-semibold text-white tracking-tight">
          Vault Locked
        </h1>
        <p className="text-xs text-neutral-400 mt-1 mb-6 font-mono">
          {profile.displayName || profile.username}
        </p>

        {/* PIN Dots */}
        <div className="flex items-center gap-3 mb-8">
          {Array.from({ length: profile.pin?.length || 4 }).map((_, i) => (
            <motion.div
              key={i}
              animate={error ? { x: [-6, 6, -4, 4, 0] } : {}}
              transition={{ duration: 0.3 }}
              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                error
                  ? 'border-rose-500 bg-rose-500'
                  : i < pin.length
                  ? 'border-white bg-white'
                  : 'border-neutral-700 bg-transparent'
              }`}
            />
          ))}
        </div>

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[240px] mb-6">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
            <motion.button
              key={n}
              whileTap={{ scale: 0.92 }}
              onClick={() => handleKeyPress(n)}
              className="h-12 rounded-2xl bg-neutral-900 border border-neutral-800/80 text-lg font-mono font-medium text-white hover:bg-neutral-800 transition-colors"
            >
              {n}
            </motion.button>
          ))}
          <button
            onClick={() => setPin('')}
            className="h-12 rounded-2xl text-xs font-mono text-neutral-400 hover:text-white"
          >
            Clear
          </button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => handleKeyPress(0)}
            className="h-12 rounded-2xl bg-neutral-900 border border-neutral-800/80 text-lg font-mono font-medium text-white hover:bg-neutral-800 transition-colors"
          >
            0
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={handleDelete}
            className="h-12 rounded-2xl text-sm font-mono text-neutral-400 hover:text-white"
          >
            &larr;
          </motion.button>
        </div>

        <p className="text-[11px] text-neutral-500 font-mono">
          Offline local encryption
        </p>
      </div>
    </div>
  );
};
