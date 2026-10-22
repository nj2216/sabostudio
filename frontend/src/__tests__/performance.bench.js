import { describe, bench } from 'vitest';

describe('Performance optimization benchmark', () => {
  const players = Array.from({ length: 10 }, (_, i) => ({
    id: `player-${i}`,
    name: `Player ${i}`,
    peerId: `peer-${i}`,
  }));

  const targetId = 'player-5';

  bench('baseline: Array.find', () => {
    const player = players.find((p) => p.id === targetId);
    return player ? player.name : null;
  });

  const playersById = new Map(players.map((p) => [p.id, p]));

  bench('optimized: Map.get', () => {
    const player = playersById.get(targetId);
    return player ? player.name : null;
  });
});
