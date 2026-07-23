import { useState } from 'react';
import Landing from './pages/Landing.jsx';
import Lobby from './pages/Lobby.jsx';

/**
 * App — top-level routing between Landing and Lobby screens.
 *
 * "screen" can be:
 *   'landing' — initial create/join screen
 *   'lobby'   — waiting room after creating or joining
 */
function App() {
  const [screen, setScreen] = useState('landing');
  const [lobbyProps, setLobbyProps] = useState(null);

  function handleHostReady({ code, peer, playerId, playerName }) {
    setLobbyProps({ code, peer, playerId, playerName, isHost: true });
    setScreen('lobby');
  }

  function handleGuestReady({ code, hostPeerId, peer, playerId, playerName }) {
    setLobbyProps({ code, peer, playerId, playerName, isHost: false, hostPeerId });
    setScreen('lobby');
  }

  if (screen === 'lobby' && lobbyProps) {
    return <Lobby {...lobbyProps} />;
  }

  return <Landing onHostReady={handleHostReady} onGuestReady={handleGuestReady} />;
}

export default App;
