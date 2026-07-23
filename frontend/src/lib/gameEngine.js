/**
 * frontend/src/lib/gameEngine.js
 *
 * Core game engine for Sabotage Studio.
 * Runs on the HOST peer and is authoritative for all game state.
 *
 * Responsibilities:
 *  - 2-minute game timer
 *  - Assign mini-tasks to players
 *  - Screen swap every 15-20 seconds
 *  - Track scores and sabotage points
 *  - Trigger Studio Crisis co-op events
 *  - Broadcast game state to all peers
 */

/** Available mini-task types */
export const TASK_TYPES = ['bomb-defuse', 'burger-cook', 'radio-tune', 'traffic-drive'];

/** Available sabotage types */
export const SABOTAGE_TYPES = ['fake-popups', 'invert-controls', 'blindfold', 'grease-screen'];

/** Game duration in milliseconds */
export const GAME_DURATION = 120_000; // 2 minutes

/** Swap interval range in ms */
const SWAP_MIN = 15_000;
const SWAP_MAX = 20_000;

/** Points awarded for completing a task */
const TASK_COMPLETE_POINTS = 100;

/** Sabotage points earned per task completion */
const SABOTAGE_POINTS_PER_TASK = 25;

/** Cost to use a sabotage */
const SABOTAGE_COST = 50;

/** Studio Crisis interval range in ms */
const CRISIS_MIN = 30_000;
const CRISIS_MAX = 50_000;

/** Studio Crisis duration in ms */
export const CRISIS_DURATION = 10_000;

/** Points lost on crisis failure */
const CRISIS_FAIL_PENALTY = 50;

/** Points gained on crisis success */
const CRISIS_SUCCESS_BONUS = 75;

/**
 * Create initial game state for a set of players.
 * @param {Array<{id: string, name: string, peerId: string, isHost: boolean}>} players
 * @returns {object} Initial game state
 */
export function createGameState(players) {
  const playerStates = {};
  players.forEach((p, i) => {
    playerStates[p.peerId] = {
      id: p.id,
      name: p.name,
      peerId: p.peerId,
      isHost: p.isHost,
      score: 0,
      sabotagePoints: 0,
      currentTask: TASK_TYPES[i % TASK_TYPES.length],
      taskProgress: 0, // 0-100
      activeSabotages: [], // Array of { type, expiresAt }
    };
  });

  return {
    phase: 'playing', // 'playing' | 'crisis' | 'finished'
    timeRemaining: GAME_DURATION,
    startedAt: Date.now(),
    players: playerStates,
    swapHistory: [],
    crisisActive: null, // { type, startedAt, targetClicks, clicks: {} }
    nextSwapAt: Date.now() + randomBetween(SWAP_MIN, SWAP_MAX),
    nextCrisisAt: Date.now() + randomBetween(CRISIS_MIN, CRISIS_MAX),
  };
}

/**
 * Process a game tick (called every ~100ms on the host).
 * Returns actions to broadcast.
 * @param {object} state - Mutable game state
 * @returns {Array<{type: string, payload: any}>} Actions to broadcast
 */
export function tick(state) {
  const actions = [];
  const now = Date.now();

  // Update time remaining
  state.timeRemaining = Math.max(0, GAME_DURATION - (now - state.startedAt));

  // Check game over
  if (state.timeRemaining <= 0 && state.phase !== 'finished') {
    state.phase = 'finished';
    actions.push({ type: 'game-over', payload: { players: state.players } });
    return actions;
  }

  // Don't process swaps/crises during crisis or after game ends
  if (state.phase === 'crisis') {
    // Check if crisis duration expired
    if (state.crisisActive && now - state.crisisActive.startedAt >= CRISIS_DURATION) {
      const success = evaluateCrisis(state);
      state.phase = 'playing';
      const crisisResult = { success };

      // Apply crisis results
      const peerIds = Object.keys(state.players);
      peerIds.forEach((peerId) => {
        if (success) {
          state.players[peerId].score += CRISIS_SUCCESS_BONUS;
        } else {
          state.players[peerId].score = Math.max(0, state.players[peerId].score - CRISIS_FAIL_PENALTY);
        }
      });

      state.crisisActive = null;
      state.nextCrisisAt = now + randomBetween(CRISIS_MIN, CRISIS_MAX);
      actions.push({ type: 'crisis-end', payload: crisisResult });
    }
    return actions;
  }

  if (state.phase !== 'playing') return actions;

  // Expire sabotages
  const peerIds = Object.keys(state.players);
  peerIds.forEach((peerId) => {
    const player = state.players[peerId];
    const before = player.activeSabotages.length;
    player.activeSabotages = player.activeSabotages.filter((s) => s.expiresAt > now);
    if (player.activeSabotages.length < before) {
      actions.push({ type: 'sabotage-expired', payload: { targetPeerId: peerId, activeSabotages: player.activeSabotages } });
    }
  });

  // Screen swap
  if (now >= state.nextSwapAt && peerIds.length >= 2) {
    const swaps = performSwap(state);
    state.nextSwapAt = now + randomBetween(SWAP_MIN, SWAP_MAX);
    actions.push({ type: 'screen-swap', payload: { swaps } });
  }

  // Studio Crisis
  if (now >= state.nextCrisisAt && peerIds.length >= 2) {
    const crisis = triggerCrisis(state);
    state.phase = 'crisis';
    actions.push({ type: 'crisis-start', payload: crisis });
  }

  return actions;
}

/**
 * Handle a player completing their task.
 * @param {object} state - Mutable game state
 * @param {string} peerId - The peer who completed
 * @returns {Array<{type: string, payload: any}>} Actions to broadcast
 */
export function handleTaskComplete(state, peerId) {
  const player = state.players[peerId];
  if (!player) return [];

  player.score += TASK_COMPLETE_POINTS;
  player.sabotagePoints += SABOTAGE_POINTS_PER_TASK;
  player.taskProgress = 0;

  // Assign a new random task (different from current)
  const otherTasks = TASK_TYPES.filter((t) => t !== player.currentTask);
  player.currentTask = otherTasks[Math.floor(Math.random() * otherTasks.length)];

  return [
    {
      type: 'task-completed',
      payload: {
        peerId,
        newScore: player.score,
        sabotagePoints: player.sabotagePoints,
        newTask: player.currentTask,
      },
    },
  ];
}

/**
 * Handle task progress update from a player.
 * @param {object} state
 * @param {string} peerId
 * @param {number} progress 0-100
 */
export function handleTaskProgress(state, peerId, progress) {
  const player = state.players[peerId];
  if (!player) return;
  player.taskProgress = Math.min(100, Math.max(0, progress));
}

/**
 * Handle a player using a sabotage on another player.
 * @param {object} state
 * @param {string} fromPeerId
 * @param {string} targetPeerId
 * @param {string} sabotageType
 * @returns {Array<{type: string, payload: any}>}
 */
export function handleSabotage(state, fromPeerId, targetPeerId, sabotageType) {
  const from = state.players[fromPeerId];
  const target = state.players[targetPeerId];
  if (!from || !target) return [];
  if (from.sabotagePoints < SABOTAGE_COST) return [];
  if (!SABOTAGE_TYPES.includes(sabotageType)) return [];
  if (fromPeerId === targetPeerId) return [];

  from.sabotagePoints -= SABOTAGE_COST;

  const duration = sabotageType === 'blindfold' ? 5000 : 8000;
  const sabotage = { type: sabotageType, expiresAt: Date.now() + duration };
  target.activeSabotages.push(sabotage);

  return [
    {
      type: 'sabotage-applied',
      payload: {
        fromPeerId,
        targetPeerId,
        sabotageType,
        duration,
        fromSabotagePoints: from.sabotagePoints,
        targetActiveSabotages: target.activeSabotages,
      },
    },
  ];
}

/**
 * Handle a player's click during a Studio Crisis.
 * @param {object} state
 * @param {string} peerId
 * @returns {Array<{type: string, payload: any}>}
 */
export function handleCrisisClick(state, peerId) {
  if (!state.crisisActive) return [];
  if (!state.crisisActive.clicks) state.crisisActive.clicks = {};
  state.crisisActive.clicks[peerId] = Date.now();

  return [
    {
      type: 'crisis-click',
      payload: { peerId, totalClicks: Object.keys(state.crisisActive.clicks).length },
    },
  ];
}

// ── Internal helpers ────────────────────────────────────────────────────────

function randomBetween(min, max) {
  return min + Math.floor(Math.random() * (max - min));
}

/**
 * Perform a random screen swap between players.
 * Shuffles task assignments.
 */
function performSwap(state) {
  const peerIds = Object.keys(state.players);
  if (peerIds.length < 2) return [];

  // Pick two random players to swap
  const shuffled = [...peerIds].sort(() => Math.random() - 0.5);
  const a = shuffled[0];
  const b = shuffled[1];

  const taskA = state.players[a].currentTask;
  const progressA = state.players[a].taskProgress;
  const taskB = state.players[b].currentTask;
  const progressB = state.players[b].taskProgress;

  state.players[a].currentTask = taskB;
  state.players[a].taskProgress = progressB;
  state.players[b].currentTask = taskA;
  state.players[b].taskProgress = progressA;

  state.swapHistory.push({ a, b, at: Date.now() });

  return [
    { from: a, to: b, task: taskA, progress: progressA },
    { from: b, to: a, task: taskB, progress: progressB },
  ];
}

/**
 * Trigger a Studio Crisis event.
 */
function triggerCrisis(state) {
  const playerCount = Object.keys(state.players).length;
  state.crisisActive = {
    type: 'big-red-button',
    startedAt: Date.now(),
    targetClicks: playerCount, // Everyone must click
    clicks: {},
  };
  return {
    type: 'big-red-button',
    duration: CRISIS_DURATION,
    targetClicks: playerCount,
  };
}

/**
 * Evaluate whether a crisis was successful.
 * Success: all players clicked within the crisis duration.
 */
function evaluateCrisis(state) {
  if (!state.crisisActive) return false;
  const playerCount = Object.keys(state.players).length;
  const clickCount = Object.keys(state.crisisActive.clicks || {}).length;
  return clickCount >= playerCount;
}
