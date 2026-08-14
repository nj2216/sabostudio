import { Bench } from 'tinybench';
import React from 'react';
import { renderToString } from 'react-dom/server';
import LotCanvas from './LotCanvas.jsx';

const mockPlayers = Array.from({ length: 100 }, (_, i) => ({
  id: `player-${i}`,
  name: `Player ${i}`
}));

const mockPositions = mockPlayers.reduce((acc, p, i) => {
  acc[p.id] = { x: i * 10, y: i * 10 };
  return acc;
}, {});

const bench = new Bench({ time: 1000 });

bench.add('render with 100 players', () => {
  renderToString(
    React.createElement(LotCanvas, {
      players: mockPlayers,
      allPositions: mockPositions,
      localPlayerId: "player-0",
      directorId: "player-1",
      completedStationIds: new Set(),
      openExitGates: new Set()
    })
  );
});

async function runBench() {
  await bench.run();
  console.table(bench.table());
}

runBench();
