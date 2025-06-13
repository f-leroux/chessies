import React, { useState } from 'react';
import './App.css';
import Chess from './chess';

const unicodePieces = {
  'P': '\u2659',
  'R': '\u2656',
  'N': '\u2658',
  'B': '\u2657',
  'Q': '\u2655',
  'K': '\u2654',
  'p': '\u265F',
  'r': '\u265C',
  'n': '\u265E',
  'b': '\u265D',
  'q': '\u265B',
  'k': '\u265A',
};

function App() {
  const [game, setGame] = useState(() => new Chess());
  const [board, setBoard] = useState(game.board.map(r => r.slice()));
  const [history, setHistory] = useState([]);
  const [selected, setSelected] = useState(null);
  const [moves, setMoves] = useState([]);

  const handleDragStart = (r, c) => {
    const legal = game.legalMovesForPiece(r, c);
    setSelected({ r, c });
    setMoves(legal);
  };

  const handleDrop = (r, c) => {
    if (selected) {
      const move = moves.find(m => m.r === r && m.c === c);
      if (move) {
        game.move(selected, move);
        setBoard(game.board.map(row => row.slice()));
        setHistory([...game.history]);
      }
    }
    setSelected(null);
    setMoves([]);
  };

  const restart = () => {
    const ng = new Chess();
    setGame(ng);
    setBoard(ng.board.map(r => r.slice()));
    setHistory([]);
    setSelected(null);
    setMoves([]);
  };

  return (
    <div className="App">
      <h1>Chessies</h1>
      <button onClick={restart}>Restart</button>
      <div id="board">
        {board.map((row, r) => (
          <div className="board-row" key={r}>
            {row.map((piece, c) => {
              const highlight = moves.some(m => m.r === r && m.c === c);
              return (
                <div
                  key={c}
                  className={`square ${(r + c) % 2 === 0 ? 'light' : 'dark'} ${highlight ? 'highlight' : ''}`}
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDrop(r, c)}
                >
                  {piece && (
                    <span
                      draggable
                      onDragStart={() => handleDragStart(r, c)}
                    >
                      {unicodePieces[piece]}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
      <div id="history">
        <h2>Move History</h2>
        <ul>
          {history.map((move, idx) => (
            <li key={idx}>{move}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default App;
