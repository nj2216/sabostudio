/**
 * frontend/src/lib/peer.js
 *
 * Thin wrapper around PeerJS for Sabotage Studio.
 *
 * Responsibilities:
 *  - Create a Peer instance (host or guest).
 *  - Host: accept incoming data connections and broadcast messages to all peers.
 *  - Guest: connect to the host peer and send/receive messages.
 *
 * Message format (all JSON):
 *   { type: string, payload: any }
 *
 * Known message types:
 *   'player-joined'       — guest -> host, payload: { name, peerId }
 *   'player-list-update'  — host -> all guests, payload: { players: [...] }
 *   'game-start'          — host -> all guests, payload: {}
 *   'station-swap'        — host -> all guests, payload: { mapping, swapAt, nextSwapIn }
 *   'player-move'         — guest -> host, payload: { x, y }
 *   'position-update'     — host -> all guests, payload: { positions: { [playerId]: { x, y } } }
 *   'sabotage-apply'      — host -> all guests, payload: { effectId, targetPlayerId, stationId, durationMs }
 *   'sabotage-clear'      — host -> all guests, payload: { effectId, targetPlayerId }
 *   'studio-crisis'       — host -> all guests, payload: { type }
 *   'ping'/'pong'         — heartbeat
 *
 * TODO (follow-up PRs):
 *   - Host migration when the host disconnects.
 *   - Reliable ordered delivery for game-critical messages.
 *   - Reconnection logic for dropped guests.
 */

import Peer from 'peerjs';

/**
 * Create and open a new Peer instance.
 * @param {string} [peerId]  Optional peer ID to request from the broker.
 *                           If omitted PeerJS generates a random one.
 * @returns {Promise<Peer>}  Resolves once the peer is open and has an ID.
 */
export function createPeer(peerId) {
  return new Promise((resolve, reject) => {
    const peer = peerId ? new Peer(peerId) : new Peer();

    peer.on('open', () => resolve(peer));
    peer.on('error', (err) => reject(err));
  });
}

/**
 * Host-side: listen for incoming guest connections.
 * Maintains a map of connected data connections and broadcasts updates.
 *
 * @param {Peer}     peer           The host's Peer instance.
 * @param {Function} onPlayerJoined Called with `{ name, peerId }` when a guest announces themselves.
 * @returns {{ broadcast: Function, connections: Map }}
 */
export function setupHost(peer, onPlayerJoined) {
  /** @type {Map<string, import('peerjs').DataConnection>} */
  const connections = new Map();

  peer.on('connection', (conn) => {
    conn.on('open', () => {
      connections.set(conn.peer, conn);
    });

    conn.on('data', (raw) => {
      let msg;
      try {
        msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        console.warn('[SaboHost] Received non-JSON data from', conn.peer);
        return;
      }

      if (msg.type === 'player-joined') {
        onPlayerJoined({ peerId: conn.peer, ...msg.payload });
      }
    });

    conn.on('close', () => {
      connections.delete(conn.peer);
    });

    conn.on('error', (err) => {
      console.error('[SaboHost] Connection error with', conn.peer, err);
      connections.delete(conn.peer);
    });
  });

  /**
   * Broadcast a message to all connected guests.
   * @param {{ type: string, payload: any }} msg
   */
  function broadcast(msg) {
    const data = JSON.stringify(msg);
    connections.forEach((conn) => {
      if (conn.open) {
        conn.send(data);
      }
    });
  }

  return { broadcast, connections };
}

/**
 * Guest-side: connect to the host peer.
 *
 * @param {Peer}     peer          The guest's Peer instance.
 * @param {string}   hostPeerId    The host's Peer ID (returned by api/rooms/join).
 * @param {Function} onMessage     Called with a parsed message object on every incoming message.
 * @returns {Promise<import('peerjs').DataConnection>}
 */
export function connectToHost(peer, hostPeerId, onMessage) {
  return new Promise((resolve, reject) => {
    const conn = peer.connect(hostPeerId, { reliable: true });

    conn.on('open', () => {
      clearTimeout(timeout);
      resolve(conn);
    });

    conn.on('data', (raw) => {
      let msg;
      try {
        msg = typeof raw === 'string' ? JSON.parse(raw) : raw;
      } catch {
        console.warn('[SaboGuest] Received non-JSON data from host');
        return;
      }
      onMessage(msg);
    });

    conn.on('error', (err) => reject(err));

    // Timeout if the connection never opens (e.g. host is offline).
    const timeout = setTimeout(() => {
      if (!conn.open) {
        conn.close();
        reject(new Error('Timed out connecting to host peer'));
      }
    }, 10_000);
  });
}

/**
 * Send a typed message over a DataConnection.
 * @param {import('peerjs').DataConnection} conn
 * @param {string} type
 * @param {any}    payload
 */
export function sendMessage(conn, type, payload = {}) {
  conn.send(JSON.stringify({ type, payload }));
}
