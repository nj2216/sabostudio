/**
 * SabotageOverlay — renders active sabotage effects on top of the game.
 *
 * Effects:
 *  - fake-popups: Renders 90s-style popup ads the player must click away
 *  - invert-controls: Shows a visual indicator (actual inversion is in CSS)
 *  - blindfold: Blacks out the screen
 *  - grease-screen: Shows a visual indicator (actual grease is in CSS)
 */

import { useState, useEffect } from 'react';

const POPUP_MESSAGES = [
  '🎉 YOU WON $1,000,000!!!',
  '⚠️ YOUR PC HAS 47 VIRUSES',
  '💊 DOCTORS HATE THIS TRICK',
  '🔥 HOT SINGLES IN YOUR AREA',
  '📦 CLAIM YOUR FREE iPHONE',
  '🎰 SPIN TO WIN NOW!!!',
  '⭐ CONGRATULATIONS!!!',
  '🏆 YOU ARE THE 1,000,000th VISITOR',
  '💰 WORK FROM HOME $$$',
  '🚨 ALERT: UPDATE REQUIRED',
];

export default function SabotageOverlay({ activeSabotages, onPopupsClosed }) {
  const hasFakePopups = activeSabotages.some((s) => s.type === 'fake-popups');
  const hasBlindFold = activeSabotages.some((s) => s.type === 'blindfold');
  const hasInvert = activeSabotages.some((s) => s.type === 'invert-controls');
  const hasGrease = activeSabotages.some((s) => s.type === 'grease-screen');

  return (
    <>
      {hasBlindFold && <BlindFoldOverlay />}
      {hasFakePopups && <FakePopups onAllClosed={onPopupsClosed} />}
      {hasInvert && <InvertIndicator />}
      {hasGrease && <GreaseIndicator />}
    </>
  );
}

function BlindFoldOverlay() {
  return (
    <div className="fixed inset-0 bg-black z-50 flex items-center justify-center">
      <p className="text-white text-2xl font-bold animate-pulse">
        🙈 BLINDFOLDED! Ask a friend for help!
      </p>
    </div>
  );
}

function FakePopups({ onAllClosed }) {
  const [popups, setPopups] = useState([]);

  useEffect(() => {
    // Generate random popups
    const count = 8 + Math.floor(Math.random() * 5);
    const generated = Array.from({ length: count }, (_, i) => ({
      id: i,
      message: POPUP_MESSAGES[Math.floor(Math.random() * POPUP_MESSAGES.length)],
      x: 5 + Math.random() * 60,
      y: 5 + Math.random() * 60,
      width: 180 + Math.random() * 100,
    }));
    setPopups(generated);
  }, []);

  function closePopup(id) {
    setPopups((prev) => {
      const next = prev.filter((p) => p.id !== id);
      if (next.length === 0) onAllClosed?.();
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-40 pointer-events-none">
      {popups.map((popup) => (
        <div
          key={popup.id}
          className="absolute pointer-events-auto bg-gray-200 border-2 border-gray-500 rounded shadow-xl"
          style={{
            left: `${popup.x}%`,
            top: `${popup.y}%`,
            width: `${popup.width}px`,
          }}
        >
          {/* Title bar */}
          <div className="flex items-center justify-between bg-gradient-to-r from-blue-800 to-blue-600 px-2 py-1">
            <span className="text-white text-xs font-bold truncate">
              ⚠️ Important!
            </span>
            <button
              onClick={() => closePopup(popup.id)}
              className="w-5 h-5 bg-red-500 hover:bg-red-400 text-white text-xs font-bold rounded-sm flex items-center justify-center"
            >
              ✕
            </button>
          </div>
          {/* Content */}
          <div className="p-3 text-center">
            <p className="text-black text-sm font-bold">{popup.message}</p>
            <button
              onClick={() => closePopup(popup.id)}
              className="mt-2 px-3 py-1 bg-gray-300 hover:bg-gray-400 border border-gray-500 text-xs text-black rounded"
            >
              OK
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

function InvertIndicator() {
  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-30 bg-purple-900/80 px-4 py-2 rounded-full border border-purple-500">
      <p className="text-purple-300 text-sm font-bold">🔄 CONTROLS INVERTED!</p>
    </div>
  );
}

function GreaseIndicator() {
  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-30 bg-yellow-900/80 px-4 py-2 rounded-full border border-yellow-500">
      <p className="text-yellow-300 text-sm font-bold">🧈 GREASED SCREEN!</p>
    </div>
  );
}
