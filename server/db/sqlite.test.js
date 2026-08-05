import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';

const { default: db } = await import('./sqlite.js');

describe('SQLite Adapter', () => {
  describe('rooms', () => {
    test('findRoomByCode should return null for non-existent room', async () => {
      const room = await db.rooms.findByCode('NONEXISTENT');
      assert.strictEqual(room, null);
    });

    test('createRoom should create a room and findRoomByCode should find it', async () => {
      const roomData = {
        code: 'TESTROOM1',
        hostPeerId: 'peer123',
        status: 'waiting',
        expiresAt: new Date(Date.now() + 10000).toISOString(),
      };

      await db.rooms.create(roomData);

      const room = await db.rooms.findByCode('TESTROOM1');
      assert.notStrictEqual(room, null);
      assert.strictEqual(room.code, 'TESTROOM1');
      assert.strictEqual(room.host_peer_id, 'peer123');
      assert.strictEqual(room.status, 'waiting');
      assert.strictEqual(room.expires_at, roomData.expiresAt);
      assert.ok(room.created_at);
    });

    test('deleteRoom should remove an existing room', async () => {
      const roomData = {
        code: 'TESTROOM2',
        hostPeerId: 'peer456',
        status: 'playing',
        expiresAt: new Date(Date.now() + 10000).toISOString(),
      };

      await db.rooms.create(roomData);
      let room = await db.rooms.findByCode('TESTROOM2');
      assert.notStrictEqual(room, null);

      await db.rooms.delete('TESTROOM2');
      room = await db.rooms.findByCode('TESTROOM2');
      assert.strictEqual(room, null);
    });
  });

  describe('players', () => {
    test('createPlayer should add a player and findPlayersByRoom should return them', async () => {
      // First create a room for the player
      const roomData = {
        code: 'TESTROOM3',
        hostPeerId: 'peer789',
        status: 'waiting',
        expiresAt: new Date(Date.now() + 10000).toISOString(),
      };
      await db.rooms.create(roomData);

      const playerData1 = {
        id: 'player1',
        roomCode: 'TESTROOM3',
        name: 'Alice',
        isHost: true,
        peerId: 'alicepeer',
      };

      const playerData2 = {
        id: 'player2',
        roomCode: 'TESTROOM3',
        name: 'Bob',
        isHost: false,
        peerId: 'bobpeer',
      };

      await db.players.create(playerData1);
      await db.players.create(playerData2);

      const players = await db.players.findByRoom('TESTROOM3');

      assert.strictEqual(players.length, 2);

      // Verify first player (Alice)
      const alice = players.find(p => p.id === 'player1');
      assert.notStrictEqual(alice, undefined);
      assert.strictEqual(alice.name, 'Alice');
      assert.strictEqual(alice.is_host, true);
      assert.strictEqual(alice.peer_id, 'alicepeer');
      assert.ok(alice.joined_at);

      // Verify second player (Bob)
      const bob = players.find(p => p.id === 'player2');
      assert.notStrictEqual(bob, undefined);
      assert.strictEqual(bob.name, 'Bob');
      assert.strictEqual(bob.is_host, false);
      assert.strictEqual(bob.peer_id, 'bobpeer');
      assert.ok(bob.joined_at);
    });

    test('countPlayersByRoom should return correct count', async () => {
      // First create a room for the player
      const roomData = {
        code: 'TESTROOM4',
        hostPeerId: 'peer999',
        status: 'waiting',
        expiresAt: new Date(Date.now() + 10000).toISOString(),
      };
      await db.rooms.create(roomData);

      let count = await db.players.countByRoom('TESTROOM4');
      assert.strictEqual(count, 0);

      const playerData = {
        id: 'player3',
        roomCode: 'TESTROOM4',
        name: 'Charlie',
        isHost: true,
        peerId: 'charliepeer',
      };
      await db.players.create(playerData);

      count = await db.players.countByRoom('TESTROOM4');
      assert.strictEqual(count, 1);

      const playerData2 = {
        id: 'player4',
        roomCode: 'TESTROOM4',
        name: 'Dave',
        isHost: false,
        peerId: 'davepeer',
      };
      await db.players.create(playerData2);

      count = await db.players.countByRoom('TESTROOM4');
      assert.strictEqual(count, 2);
    });

    test('players should be cascade deleted when room is deleted', async () => {
      const roomData = {
        code: 'TESTROOM5',
        hostPeerId: 'peerABC',
        status: 'waiting',
        expiresAt: new Date(Date.now() + 10000).toISOString(),
      };
      await db.rooms.create(roomData);

      const playerData = {
        id: 'player5',
        roomCode: 'TESTROOM5',
        name: 'Eve',
        isHost: true,
        peerId: 'evepeer',
      };
      await db.players.create(playerData);

      let count = await db.players.countByRoom('TESTROOM5');
      assert.strictEqual(count, 1);

      // Cascade delete should remove players
      await db.rooms.delete('TESTROOM5');

      count = await db.players.countByRoom('TESTROOM5');
      assert.strictEqual(count, 0);
    });
  });
});
