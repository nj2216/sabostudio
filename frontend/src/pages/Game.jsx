/**
 * frontend/src/pages/Game.jsx
 *
 * Main game screen — runs during the 2-minute round.
 *
 * Host:
 *  - Runs the game engine (tick loop), broadcasts state to all guests.
 *  - Processes game events (task completions, sabotages, crises).
 *
 * Guest:
 *  - Receives state updates from host and renders accordingly.
 *  - Sends actions (task progress, sabotage usage, crisis clicks) to host.
 */

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  createGameState,
  tick,
  handleTaskComplete,
  handleTaskProgress,
  handleSabotage,
  handleCrisisClick,
  GAME_DURATION,
} from '../lib/gameEngine.js';
import BombDefuse from '../components/tasks/BombDefuse.jsx';
import BurgerCook from '../components/tasks/BurgerCook.jsx';
import RadioTune from '../components/tasks/RadioTune.jsx';
import TrafficDrive from '../components/tasks/TrafficDrive.jsx';
import SabotageOverlay from '../components/SabotageOverlay.jsx';
import SabotagePanel from '../components/SabotagePanel.jsx';
import StudioCrisis from '../components/StudioCrisis.jsx';

const TASK_COMPONENTS = {
  'bomb-defuse': BombDefuse,
  'burger-cook': BurgerCook,
  'radio-tune': RadioTune,
  'traffic-drive': TrafficDrive,
};

/**
 * @param {{
 *   peer: import('peerjs').Peer,
 *   players: Array,
 *   isHost: boolean,
 *   broadcast: Function|null,
 *   hostConn: import('peerjs').DataConnection|null,
 *   myPeerId: string,
 *   onGameEnd: Function,
 * }} props
 */
export default function Game({ peer, players, isHost, broadcast, hostConn, myPeerId, onGameEnd }) {
  // ── State ──────────────────────────────────────────────────────────────────
  const [myTask, setMyTask] = useState(null);
  const [myProgress, setMyProgress] = useState(0);
  const [myScore, setMyScore] = useState(0);
  const [mySabotagePoints, setMySabotagePoints] = useState(0);
  const [activeSabotages, setActiveSabotages] = useState([]);
  const [timeRemaining, setTimeRemaining] = useState(GAME_DURATION);
  const [crisisActive, setCrisisActive] = useState(null);
  const [crisisClickCount, setCrisisClickCount] = useState(0);
  const [swapNotification, setSwapNotification] = useState(null);
  const [allPlayers, setAllPlayers] = useState(players);
  const [gameOver, setGameOver] = useState(false);
  const [finalScores, setFinalScores] = useState(null);

  // Host-only state
  const gameStateRef = useRef(null);
  const tickIntervalRef = useRef(null);
  const broadcastRef = useRef(broadcast);
  const myPeerIdRef = useRef(myPeerId);

  // Keep refs in sync
  useEffect(() => { broadcastRef.current = broadcast; }, [broadcast]);
  useEffect(() => { myPeerIdRef.current = myPeerId; }, [myPeerId]);

  // ── Host: Initialize game engine ──────────────────────────────────────────
  useEffect(() => {
    if (!isHost) return;

    const state = createGameState(players);
    gameStateRef.current = state;

    // Set initial task for host
    const myState = state.players[myPeerIdRef.current];
    if (myState) {
      setMyTask(myState.currentTask);
      setMyProgress(0);
    }

    // Broadcast initial state to all guests
    if (broadcastRef.current) {
      broadcastRef.current({ type: 'game-init', payload: { players: state.players } });
    }

    // Start tick loop
    tickIntervalRef.current = setInterval(() => {
      const actions = tick(state);
      actions.forEach((action) => {
        handleHostAction(action);
        if (broadcastRef.current) {
          broadcastRef.current({ type: 'game-action', payload: action });
        }
      });

      if (broadcastRef.current) {
        broadcastRef.current({
          type: 'game-time',
          payload: { timeRemaining: state.timeRemaining },
        });
      }
      setTimeRemaining(state.timeRemaining);
    }, 100);

    return () => {
      if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isHost]);

  // ── Guest: Listen for messages from host ──────────────────────────────────
  useEffect(() => {
    if (isHost) return;
    if (!hostConn) return;

    function handleMessage(raw) {
      let msg;
      try {
        msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        return;
      }

      if (msg.type === 'game-init') {
        const myState = msg.payload.players[myPeerId];
        if (myState) {
          setMyTask(myState.currentTask);
          setMyProgress(myState.taskProgress);
          setMyScore(myState.score);
          setMySabotagePoints(myState.sabotagePoints);
          setActiveSabotages(myState.activeSabotages || []);
        }
        setAllPlayers(Object.values(msg.payload.players));
      }

      if (msg.type === 'game-time') {
        setTimeRemaining(msg.payload.timeRemaining);
      }

      if (msg.type === 'game-action') {
        handleGuestAction(msg.payload);
      }
    }

    hostConn.on('data', handleMessage);
    return () => {
      hostConn.off('data', handleMessage);
    };
  }, [isHost, hostConn, myPeerId]);

  // ── Host: Listen for messages from guests ─────────────────────────────────
  useEffect(() => {
    if (!isHost) return;

    function handleGuestMessage(conn, raw) {
      let msg;
      try {
        msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        return;
      }

      const state = gameStateRef.current;
      if (!state) return;

      if (msg.type === 'task-progress') {
        handleTaskProgress(state, conn.peer, msg.payload.progress);
      }

      if (msg.type === 'task-complete') {
        const actions = handleTaskComplete(state, conn.peer);
        actions.forEach((a) => {
          broadcast?.({ type: 'game-action', payload: a });
          handleHostAction(a);
        });
      }

      if (msg.type === 'use-sabotage') {
        const actions = handleSabotage(state, conn.peer, msg.payload.targetPeerId, msg.payload.sabotageType);
        actions.forEach((a) => {
          broadcast?.({ type: 'game-action', payload: a });
          handleHostAction(a);
        });
      }

      if (msg.type === 'crisis-click') {
        const actions = handleCrisisClick(state, conn.peer);
        actions.forEach((a) => {
          broadcast?.({ type: 'game-action', payload: a });
          handleHostAction(a);
        });
      }
    }

    function onConnection(conn) {
      conn.on('data', (raw) => handleGuestMessage(conn, raw));
    }

    peer.on('connection', onConnection);
    return () => {
      peer.off('connection', onConnection);
    };
  }, [isHost, peer, broadcast]);

  // ── Handle action (both host and guest) ───────────────────────────────────
  function handleHostAction(action) {
   switch (action.type) {
     case 'screen-swap': {
       // Host reads directly from authoritative game state
       const state = gameStateRef.current;
       if (state) {
         const myState = state.players[myPeerId];
         if (myState) {
           setMyTask(myState.currentTask);
           setMyProgress(myState.taskProgress);
         }
       }
       setSwapNotification('🔀 SCREEN SWAP!');
       setTimeout(() => setSwapNotification(null), 2000);
        break;
      }

      case 'task-completed': {
        if (action.payload.peerId === myPeerId) {
          setMyScore(action.payload.newScore);
          setMySabotagePoints(action.payload.sabotagePoints);
          setMyTask(action.payload.newTask);
          setMyProgress(0);
        }
        break;
      }

      case 'sabotage-applied': {
        if (action.payload.targetPeerId === myPeerId) {
          setActiveSabotages([...action.payload.targetActiveSabotages]);
        }
        if (action.payload.fromPeerId === myPeerId) {
          setMySabotagePoints(action.payload.fromSabotagePoints);
        }
        break;
      }

      case 'sabotage-expired': {
        if (action.payload.targetPeerId === myPeerId) {
          setActiveSabotages([...action.payload.activeSabotages]);
        }
        break;
      }

      case 'crisis-start': {
        setCrisisActive(action.payload);
        setCrisisClickCount(0);
        break;
      }

      case 'crisis-click': {
        setCrisisClickCount(action.payload.totalClicks);
        break;
      }

      case 'crisis-end': {
        setCrisisActive(null);
        setCrisisClickCount(0);
        break;
      }

      case 'game-over': {
        setGameOver(true);
        setFinalScores(action.payload.players);
        if (tickIntervalRef.current) clearInterval(tickIntervalRef.current);
        break;
      }
    }
  }

  // Guest version of action handling
  function handleGuestAction(action) {
    switch (action.type) {
      case 'screen-swap': {
        // Swaps are pairs: [{from, to, task, progress}, {from, to, task, progress}]
        // Each entry means: "from" player's old task (task/progress) was given to "to" player.
        // So if I'm listed as "to", I receive that task.
        const { swaps } = action.payload;
        const myNewTask = swaps.find((s) => s.to === myPeerId);
        if (myNewTask) {
          setMyTask(myNewTask.task);
          setMyProgress(myNewTask.progress);
        }
        setSwapNotification('🔀 SCREEN SWAP!');
        setTimeout(() => setSwapNotification(null), 2000);
        break;
      }

      case 'task-completed':
        if (action.payload.peerId === myPeerId) {
          setMyScore(action.payload.newScore);
          setMySabotagePoints(action.payload.sabotagePoints);
          setMyTask(action.payload.newTask);
          setMyProgress(0);
        }
        break;

      case 'sabotage-applied':
        if (action.payload.targetPeerId === myPeerId) {
          setActiveSabotages([...action.payload.targetActiveSabotages]);
        }
        if (action.payload.fromPeerId === myPeerId) {
          setMySabotagePoints(action.payload.fromSabotagePoints);
        }
        break;

      case 'sabotage-expired':
        if (action.payload.targetPeerId === myPeerId) {
          setActiveSabotages([...action.payload.activeSabotages]);
        }
        break;

      case 'crisis-start':
        setCrisisActive(action.payload);
        setCrisisClickCount(0);
        break;

      case 'crisis-click':
        setCrisisClickCount(action.payload.totalClicks);
        break;

      case 'crisis-end':
        setCrisisActive(null);
        setCrisisClickCount(0);
        break;

      case 'game-over':
        setGameOver(true);
        setFinalScores(action.payload.players);
        break;
    }
  }

  // ── Task callbacks ────────────────────────────────────────────────────────
  const handleProgress = useCallback(
    (progress) => {
      setMyProgress(progress);
      if (isHost) {
        handleTaskProgress(gameStateRef.current, myPeerId, progress);
      } else if (hostConn?.open) {
        hostConn.send(JSON.stringify({ type: 'task-progress', payload: { progress } }));
      }
    },
    [isHost, myPeerId, hostConn]
  );

  const handleComplete = useCallback(() => {
    if (isHost) {
      const actions = handleTaskComplete(gameStateRef.current, myPeerId);
      actions.forEach((a) => {
        broadcast?.({ type: 'game-action', payload: a });
        handleHostAction(a);
      });
    } else if (hostConn?.open) {
      hostConn.send(JSON.stringify({ type: 'task-complete', payload: {} }));
    }
  }, [isHost, myPeerId, hostConn, broadcast]);

  const handleUseSabotage = useCallback(
    (targetPeerId, sabotageType) => {
      if (isHost) {
        const actions = handleSabotage(gameStateRef.current, myPeerId, targetPeerId, sabotageType);
        actions.forEach((a) => {
          broadcast?.({ type: 'game-action', payload: a });
          handleHostAction(a);
        });
      } else if (hostConn?.open) {
        hostConn.send(JSON.stringify({ type: 'use-sabotage', payload: { targetPeerId, sabotageType } }));
      }
    },
    [isHost, myPeerId, hostConn, broadcast]
  );

  const handleMyCrisisClick = useCallback(() => {
    if (isHost) {
      const actions = handleCrisisClick(gameStateRef.current, myPeerId);
      actions.forEach((a) => {
        broadcast?.({ type: 'game-action', payload: a });
        handleHostAction(a);
      });
    } else if (hostConn?.open) {
      hostConn.send(JSON.stringify({ type: 'crisis-click', payload: {} }));
    }
  }, [isHost, myPeerId, hostConn, broadcast]);

  // ── Game Over Screen ──────────────────────────────────────────────────────
  if (gameOver && finalScores) {
    const sorted = Object.values(finalScores).sort((a, b) => b.score - a.score);
    return (
      <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
        <h1 className="text-5xl font-extrabold text-yellow-400 mb-2">🏆 Game Over!</h1>
        <p className="text-gray-400 mb-8">Final Scores</p>

        <div className="w-full max-w-md space-y-3">
          {sorted.map((player, i) => (
            <div
              key={player.peerId}
              className={`flex items-center gap-4 p-4 rounded-xl border ${
                i === 0
                  ? 'bg-yellow-900/30 border-yellow-600'
                  : i === 1
                  ? 'bg-gray-800 border-gray-600'
                  : 'bg-gray-900 border-gray-700'
              }`}
            >
              <span className="text-2xl font-bold text-gray-400 w-8">
                {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
              </span>
              <span className="flex-1 font-bold text-white">{player.name}</span>
              <span className="text-xl font-mono font-bold text-purple-400">{player.score}</span>
            </div>
          ))}
        </div>

        <button
          onClick={() => onGameEnd?.()}
          className="mt-8 px-8 py-3 bg-purple-600 hover:bg-purple-500 rounded-xl font-bold text-white transition-colors"
        >
          Back to Lobby
        </button>
      </div>
    );
  }

  // ── Render Game ───────────────────────────────────────────────────────────
  const TaskComponent = myTask ? TASK_COMPONENTS[myTask] : null;
  const hasInvert = activeSabotages.some((s) => s.type === 'invert-controls');
  const hasGrease = activeSabotages.some((s) => s.type === 'grease-screen');

  const gameAreaStyle = {};
  if (hasInvert) {
    gameAreaStyle.transform = 'scaleY(-1)';
  }

  return (
    <div
      className={`min-h-screen bg-gray-950 text-white flex flex-col items-center p-4 relative ${
        hasGrease ? 'cursor-grease' : ''
      }`}
      style={gameAreaStyle}
    >
      {/* HUD */}
      <div className="w-full max-w-lg flex items-center justify-between mb-4">
        <div className="text-sm">
          <span className="text-purple-400 font-bold">Score: {myScore}</span>
        </div>
        <div className="text-center">
          <span
            className={`text-2xl font-mono font-bold ${
              timeRemaining < 30000 ? 'text-red-400 animate-pulse' : 'text-white'
            }`}
          >
            {Math.floor(timeRemaining / 60000)}:{String(Math.floor((timeRemaining % 60000) / 1000)).padStart(2, '0')}
          </span>
        </div>
        <div className="text-sm">
          <span className="text-yellow-400 font-bold">⚡ {mySabotagePoints}</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full max-w-lg mb-6">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-200 rounded-full"
            style={{ width: `${myProgress}%` }}
          />
        </div>
      </div>

      {/* Swap notification */}
      {swapNotification && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 bg-purple-900/90 px-8 py-4 rounded-2xl border-2 border-purple-400 animate-bounce">
          <p className="text-3xl font-extrabold text-white">{swapNotification}</p>
        </div>
      )}

      {/* Task area */}
      <div className="flex-1 flex items-center justify-center w-full max-w-lg">
        {TaskComponent ? (
          <TaskComponent
            onProgress={handleProgress}
            onComplete={handleComplete}
            progress={myProgress}
          />
        ) : (
          <p className="text-gray-500">Loading task...</p>
        )}
      </div>

      {/* Sabotage overlays */}
      <SabotageOverlay
        activeSabotages={activeSabotages}
        onPopupsClosed={() => {
          setActiveSabotages((prev) => prev.filter((s) => s.type !== 'fake-popups'));
        }}
      />

      {/* Studio Crisis overlay */}
      {crisisActive && (
        <StudioCrisis
          onCrisisClick={handleMyCrisisClick}
          totalPlayers={allPlayers.length || players.length}
          clickCount={crisisClickCount}
        />
      )}

      {/* Sabotage panel */}
      <SabotagePanel
        sabotagePoints={mySabotagePoints}
        players={allPlayers.length > 0 ? allPlayers : players}
        myPeerId={myPeerId}
        onUseSabotage={handleUseSabotage}
      />
    </div>
  );
}
