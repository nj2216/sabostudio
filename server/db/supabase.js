// server/db/supabase.js
// Supabase adapter — used in production.

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ---------------------------------------------------------------------------
// rooms
// ---------------------------------------------------------------------------

async function findRoomByCode(code) {
  const { data, error } = await supabase
    .from('rooms')
    .select('code, host_peer_id, status, created_at, expires_at')
    .eq('code', code)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function createRoom({ code, hostPeerId, status, expiresAt }) {
  const { error } = await supabase.from('rooms').insert({
    code,
    host_peer_id: hostPeerId,
    status,
    expires_at: expiresAt,
  });
  if (error) throw error;
}

async function deleteRoom(code) {
  const { error } = await supabase.from('rooms').delete().eq('code', code);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// players
// ---------------------------------------------------------------------------

async function countPlayersByRoom(roomCode) {
  const { count, error } = await supabase
    .from('players')
    .select('id', { count: 'exact', head: true })
    .eq('room_code', roomCode);
  if (error) throw error;
  return count;
}

async function createPlayer({ id, roomCode, name, isHost, peerId }) {
  const { error } = await supabase.from('players').insert({
    id,
    room_code: roomCode,
    name,
    is_host: isHost,
    peer_id: peerId,
  });
  if (error) throw error;
}

async function findPlayersByRoom(roomCode) {
  const { data, error } = await supabase
    .from('players')
    .select('id, name, is_host, peer_id, joined_at')
    .eq('room_code', roomCode)
    .order('joined_at', { ascending: true });
  if (error) throw error;
  return data;
}

export default {
  rooms: { findByCode: findRoomByCode, create: createRoom, delete: deleteRoom },
  players: {
    countByRoom: countPlayersByRoom,
    create: createPlayer,
    findByRoom: findPlayersByRoom,
  },
};
