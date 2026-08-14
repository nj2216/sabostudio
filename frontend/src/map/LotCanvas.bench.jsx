import { bench, describe } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import LotCanvas from './LotCanvas';

const mockPlayers = Array.from({ length: 100 }, (_, i) => ({
  id: `player-${i}`,
  name: `Player ${i}`
}));

const mockPositions = mockPlayers.reduce((acc, p, i) => {
  acc[p.id] = { x: i * 10, y: i * 10 };
  return acc;
}, {});

describe('LotCanvas Render Performance', () => {
  bench('render with 100 players', () => {
    render(
      <LotCanvas
        players={mockPlayers}
        allPositions={mockPositions}
        localPlayerId="player-0"
        directorId="player-1"
        completedStationIds={new Set()}
        openExitGates={new Set()}
      />
    );
  }, { time: 1000 });
});
