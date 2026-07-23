/**
 * SabotagePanel — shows available sabotage cards a player can use.
 * Appears as a collapsible panel at the bottom of the game screen.
 */

import { useState } from 'react';

const SABOTAGE_INFO = {
  'fake-popups': { emoji: '🪟', label: 'Pop-ups', description: 'Cover their screen with 90s ads' },
  'invert-controls': { emoji: '🔄', label: 'Invert', description: 'Flip their controls upside down' },
  'blindfold': { emoji: '🙈', label: 'Blindfold', description: 'Black out their screen for 5s' },
  'grease-screen': { emoji: '🧈', label: 'Grease', description: 'Make their cursor slide on ice' },
};

const SABOTAGE_COST = 50;

export default function SabotagePanel({ sabotagePoints, players, myPeerId, onUseSabotage }) {
  const [expanded, setExpanded] = useState(false);
  const [selectedTarget, setSelectedTarget] = useState(null);

  const otherPlayers = players.filter((p) => p.peerId !== myPeerId);
  const canAfford = sabotagePoints >= SABOTAGE_COST;

  function handleUseSabotage(type) {
    if (!selectedTarget || !canAfford) return;
    onUseSabotage(selectedTarget, type);
    setSelectedTarget(null);
    setExpanded(false);
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 z-20">
      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mx-auto block px-4 py-2 bg-purple-900/90 border border-purple-600 rounded-t-xl text-purple-300 text-sm font-bold backdrop-blur-sm"
      >
        {expanded ? '▼' : '▲'} Sabotage ({sabotagePoints} pts)
      </button>

      {/* Panel */}
      {expanded && (
        <div className="bg-gray-900/95 border-t border-purple-600 p-4 backdrop-blur-sm">
          {/* Target selection */}
          <div className="mb-3">
            <p className="text-gray-400 text-xs mb-2">Select target:</p>
            <div className="flex gap-2 flex-wrap">
              {otherPlayers.map((p) => (
                <button
                  key={p.peerId}
                  onClick={() => setSelectedTarget(p.peerId)}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    selectedTarget === p.peerId
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          {/* Sabotage cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(SABOTAGE_INFO).map(([type, info]) => (
              <button
                key={type}
                onClick={() => handleUseSabotage(type)}
                disabled={!canAfford || !selectedTarget}
                className="flex flex-col items-center gap-1 p-3 bg-gray-800 hover:bg-gray-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl border border-gray-600 transition-colors"
              >
                <span className="text-2xl">{info.emoji}</span>
                <span className="text-white text-xs font-bold">{info.label}</span>
                <span className="text-gray-500 text-[10px]">{SABOTAGE_COST} pts</span>
              </button>
            ))}
          </div>

          {!canAfford && (
            <p className="text-red-400 text-xs text-center mt-2">
              Need {SABOTAGE_COST} points to sabotage (complete tasks to earn!)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
