import { useState, useEffect, useCallback, useRef } from "react";
import './App.css';

const CARD_SETS = {
  Easy: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼"],
  Medium: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮"],
  Hard: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐸","🐵","🐔","🐧"],
};

const PAIRS = { Easy: 8, Medium: 12, Hard: 16 };

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function buildDeck(difficulty) {
  const emojis = CARD_SETS[difficulty].slice(0, PAIRS[difficulty]);
  return shuffle([...emojis, ...emojis]).map((symbol, i) => ({
    id: i, symbol, flipped: false, matched: false,
  }));
}

function formatTime(s) {
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
}

function getBestScore(difficulty) {
  try {
    const data = JSON.parse(localStorage.getItem("memoryBest") || "{}");
    return data[difficulty] || null;
  } catch { return null; }
}

function saveBestScore(difficulty, moves, time) {
  try {
    const data = JSON.parse(localStorage.getItem("memoryBest") || "{}");
    const cur = data[difficulty];
    if (!cur || moves < cur.moves || (moves === cur.moves && time < cur.time)) {
      data[difficulty] = { moves, time };
      localStorage.setItem("memoryBest", JSON.stringify(data));
      return true;
    }
  } catch (e) {
    console.error("Failed to save best score:", e);
  }
  return false;
}

export default function App() {
  const [difficulty, setDifficulty] = useState("Easy");
  const [cards, setCards] = useState(() => buildDeck("Easy"));
  const [flipped, setFlipped] = useState([]);
  const [moves, setMoves] = useState(0);
  const [time, setTime] = useState(0);
  const [running, setRunning] = useState(false);
  const [won, setWon] = useState(false);
  const [isNew, setIsNew] = useState(false);
  const [bestScore, setBestScore] = useState(() => getBestScore("Easy"));
  const lockRef = useRef(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (running) {
      timerRef.current = setInterval(() => setTime(t => t + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [running]);

  const startGame = useCallback((diff = difficulty) => {
    clearInterval(timerRef.current);
    setCards(buildDeck(diff));
    setFlipped([]);
    setMoves(0);
    setTime(0);
    setRunning(false);
    setWon(false);
    setIsNew(false);
    lockRef.current = false;
    setBestScore(getBestScore(diff));
  }, [difficulty]);

  const handleDifficulty = (d) => {
    setDifficulty(d);
    startGame(d);
    setBestScore(getBestScore(d));
  };

  const handleCardClick = (id) => {
    if (lockRef.current) return;
    const card = cards.find(c => c.id === id);
    if (!card || card.flipped || card.matched) return;
    if (!running) setRunning(true);

    const newCards = cards.map(c => c.id === id ? { ...c, flipped: true } : c);
    const newFlipped = [...flipped, id];
    setCards(newCards);
    setFlipped(newFlipped);

    if (newFlipped.length === 2) {
      lockRef.current = true;
      setMoves(m => m + 1);
      const [a, b] = newFlipped.map(fid => newCards.find(c => c.id === fid));
      if (a.symbol === b.symbol) {
        const matched = newCards.map(c =>
          c.id === a.id || c.id === b.id ? { ...c, matched: true } : c
        );
        setCards(matched);
        setFlipped([]);
        lockRef.current = false;
        if (matched.every(c => c.matched)) {
          setRunning(false);
          setWon(true);
          const newMoves = moves + 1;
          const nb = saveBestScore(difficulty, newMoves, time);
          setIsNew(nb);
          setBestScore(getBestScore(difficulty));
        }
      } else {
        setTimeout(() => {
          setCards(prev => prev.map(c =>
            c.id === a.id || c.id === b.id ? { ...c, flipped: false } : c
          ));
          setFlipped([]);
          lockRef.current = false;
        }, 900);
      }
    }
  };

  const cols = PAIRS[difficulty] === 8 ? 4 : PAIRS[difficulty] === 12 ? 4 : 4;

  return (
    <div className="app">
      {/* Header */}
      <div className="header">
        <h1>🃏 Memory Match</h1>
        <p>Find all matching pairs!</p>
      </div>

      {/* Difficulty */}
      <div className="difficulty-bar">
        {["Easy", "Medium", "Hard"].map(d => (
          <button key={d} onClick={() => handleDifficulty(d)} className={`diff-btn ${difficulty === d ? "active" : ""}`}>{d}</button>
        ))}
      </div>

      {/* Stats */}
      <div className="stats-bar">
        {[
          { label: "⏱ Time", value: formatTime(time) },
          { label: "🎯 Moves", value: moves },
          { label: "🏆 Best", value: bestScore ? `${bestScore.moves}m ${formatTime(bestScore.time)}` : "—" },
        ].map(({ label, value }) => (
          <div key={label} className="stat-box">
            <div className="stat-label" >{label}</div>
            <div className="stat-value">{value}</div>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="card-grid" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
        {cards.map(card => {
          const show = card.flipped || card.matched;
          return (
            <div key={card.id} onClick={() => handleCardClick(card.id)} className="card">
              <div className="card-inner" style={{ transform: show ? "rotateY(180deg)" : "rotateY(0deg)" }}>
                {/* Back */}
                <div className="card-back">✦</div>
                {/* Front */}
                <div className={`card-front ${card.matched ? "matched" : ""}`}>{card.symbol}</div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Restart */}
      <button onClick={() => startGame()} className="restart-btn" onMouseOver={e => e.target.style.transform = "scale(1.05)"}
         onMouseOut={e => e.target.style.transform = "scale(1)"}>
        🔄 Restart Game
      </button>

      {/* Win Modal */}
      {won && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div style={{ fontSize: 56, marginBottom: 8 }}>🎉</div>
            <h2>Congratulations!</h2>
            <p>You matched all pairs!</p>
            <div className="modal-stats">
              {[{ l: "⏱ Time", v: formatTime(time) }, { l: "🎯 Moves", v: moves }].map(({ l, v }) => (
                <div key={l} className="modal-stat">
                  <div className="stat-label">{l}</div>
                  <div className="stat-value">{v}</div>
                </div>
              ))}
            </div>
            {isNew && (
              <div className="new-best-score">🏆 New Best Score!</div>
            )}
            <button onClick={() => startGame()} className="play-again-btn">🔄 Play Again</button>
          </div>
        </div>
      )}
    </div>
  );
}