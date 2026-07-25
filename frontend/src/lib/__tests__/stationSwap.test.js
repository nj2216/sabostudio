import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateSwapMapping } from '../stationSwap';

describe('generateSwapMapping', () => {
  beforeEach(() => {
    // Mock Math.random to return a predictable sequence.
    // .sort(() => Math.random() - 0.5) behavior depends on the JS engine,
    // so returning 0.1 for random makes Math.random() - 0.5 negative,
    // which effectively leaves the array sorted in its original order
    // or reverse depending on sort implementation. We just want it consistent.
    vi.spyOn(Math, 'random').mockReturnValue(0.1);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns empty object when playerIds is empty', () => {
    expect(generateSwapMapping([], ['station1'])).toEqual({});
  });

  it('returns empty object when stationIds is empty', () => {
    expect(generateSwapMapping(['player1'], [])).toEqual({});
  });

  it('handles single station case (viewing and controlling the same station)', () => {
    const players = ['player1', 'player2'];
    const stations = ['station1'];

    const mapping = generateSwapMapping(players, stations);

    expect(mapping).toEqual({
      player1: {
        viewingStationId: 'station1',
        controllingStationId: 'station1',
      },
      player2: {
        viewingStationId: 'station1',
        controllingStationId: 'station1',
      },
    });
  });

  it('handles standard case where number of players equals number of stations', () => {
    const players = ['p1', 'p2', 'p3'];
    const stations = ['s1', 's2', 's3'];

    const mapping = generateSwapMapping(players, stations);

    // We expect every player to have view !== control
    // And control is rotated by 1 relative to view in the shuffled array
    for (const pid of players) {
      expect(mapping[pid]).toBeDefined();
      expect(mapping[pid].viewingStationId).not.toEqual(mapping[pid].controllingStationId);
      expect(stations.includes(mapping[pid].viewingStationId)).toBe(true);
      expect(stations.includes(mapping[pid].controllingStationId)).toBe(true);
    }
  });

  it('handles more players than stations (wrap-around logic)', () => {
    const players = ['p1', 'p2', 'p3', 'p4', 'p5'];
    const stations = ['s1', 's2', 's3']; // 5 players, 3 stations

    const mapping = generateSwapMapping(players, stations);

    expect(Object.keys(mapping)).toHaveLength(5);

    for (const pid of players) {
      expect(mapping[pid]).toBeDefined();
      expect(mapping[pid].viewingStationId).not.toEqual(mapping[pid].controllingStationId);
    }

    // Since there are 5 players and 3 stations, some stations will have multiple viewers/controllers
    // Check specific logic: viewIdx = i % n, controlIdx = (i + 1) % n
    // Assuming the shuffled array retains the same items (regardless of exact order due to mock):
    const shuffledStations = [...stations].sort(() => 0.1 - 0.5);

    players.forEach((pid, i) => {
      const viewIdx = i % shuffledStations.length;
      const controlIdx = (i + 1) % shuffledStations.length;

      expect(mapping[pid].viewingStationId).toEqual(shuffledStations[viewIdx]);
      expect(mapping[pid].controllingStationId).toEqual(shuffledStations[controlIdx]);
    });
  });

  it('ensures each assigned station is actually from the provided station list', () => {
    const players = ['playerA', 'playerB'];
    const stations = ['stationX', 'stationY'];

    const mapping = generateSwapMapping(players, stations);

    for (const pid of players) {
      expect(stations).toContain(mapping[pid].viewingStationId);
      expect(stations).toContain(mapping[pid].controllingStationId);
    }
  });

  it('guarantees view != control when multiple stations exist', () => {
    // Generate a random-ish set of inputs to be sure
    const players = Array.from({ length: 10 }, (_, i) => `p${i}`);
    const stations = Array.from({ length: 4 }, (_, i) => `s${i}`);

    // Restore random so it's a real shuffle for this test
    vi.restoreAllMocks();

    const mapping = generateSwapMapping(players, stations);

    for (const pid of players) {
      expect(mapping[pid].viewingStationId).not.toEqual(mapping[pid].controllingStationId);
    }
  });
});
