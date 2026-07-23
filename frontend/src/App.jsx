import { useState } from 'react';
import Landing from './pages/Landing.jsx';
import Lobby from './pages/Lobby.jsx';
import Game from './pages/Game.jsx';

/**
 * App — top-level routing between Landing, Lobby, and Game screens.
 *
 * "screen" can be:
 *   'landing' — initial create/join screen
 *   'lobby'   — waiting room after creating or joining
 *   'game'    — active minigame round
 */
function App() {
  const [screen, setScreen] = useState('landing');
  const [lobbyProps, setLobbyProps] = useState(null);
  const [gameProps, setGameProps] = useState(null);

  function handleHostReady({ code, peer, playerId, playerName }) {
    setLobbyProps({ code, peer, playerId, playerName, isHost: true });
    setScreen('lobby');
  }

  function handleGuestReady({ code, hostPeerId, peer, playerId, playerName }) {
    setLobbyProps({ code, peer, playerId, playerName, isHost: false, hostPeerId });
    setScreen('lobby');
  }

  function handleGameStart(props) {
    setGameProps(props);
    setScreen('game');
  }

  function handleGameEnd() {
    setScreen('lobby');
    setGameProps(null);
  }

  if (screen === 'game' && gameProps) {
    return <Game {...gameProps} onGameEnd={handleGameEnd} />;
  }

  if (screen === 'lobby' && lobbyProps) {
    return <Lobby {...lobbyProps} onGameStart={handleGameStart} />;
  }

  return <Landing onHostReady={handleHostReady} onGuestReady={handleGuestReady} />;
}

export default App;
