import React, { useState } from 'react';
import './App.css';

function App() {
  const [history, setHistory] = useState([]);

  return (
    <div className="App">
      <h1>Chessies</h1>
      <div id="board">Board will go here.</div>
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
