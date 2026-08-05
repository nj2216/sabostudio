import { performance } from 'perf_hooks';
import { createSabotageBroadcaster } from './src/sabotage/SabotageDeck.js';
import { ALL_EFFECTS } from './src/sabotage/SabotageEffect.js';

// Setup mock players
const NUM_PLAYERS = 1000;
const players = Array.from({ length: NUM_PLAYERS }, (_, i) => ({ id: `player_${i}`, name: `Player ${i}` }));

// Fix getScores so it isn't O(N)
const staticScores = players.reduce((acc, p) => { acc[p.id] = 1000000; return acc; }, {});
const getScores = () => staticScores;

const setScores = () => {};
const broadcast = () => {};

const { fireSabotage } = createSabotageBroadcaster(broadcast, getScores, setScores, players);

const ITERATIONS = 100000;

const start = performance.now();
for (let i = 0; i < ITERATIONS; i++) {
  const buyerId = `player_${Math.floor(Math.random() * NUM_PLAYERS)}`;
  const targetId = `player_${Math.floor(Math.random() * NUM_PLAYERS)}`;
  fireSabotage(buyerId, 'controlSwap', targetId, 'any');
}
const end = performance.now();

console.log(`Time: ${(end - start).toFixed(2)} ms for ${ITERATIONS} iterations`);
