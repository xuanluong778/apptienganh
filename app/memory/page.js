"use client";

import { useMemo, useState } from "react";

const BASE_CARDS = [
  { id: "apple", emoji: "🍎", label: "Apple" },
  { id: "cat", emoji: "🐱", label: "Cat" },
  { id: "book", emoji: "📚", label: "Book" },
  { id: "ball", emoji: "⚽", label: "Ball" },
];

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function buildDeck() {
  const cards = BASE_CARDS.flatMap((card) => [
    { ...card, uid: `${card.id}-a` },
    { ...card, uid: `${card.id}-b` },
  ]);
  return shuffle(cards);
}

export default function MemoryPage() {
  const [deck, setDeck] = useState(() => buildDeck());
  const [flipped, setFlipped] = useState([]);
  const [matchedIds, setMatchedIds] = useState([]);
  const [moves, setMoves] = useState(0);
  const [busy, setBusy] = useState(false);
  const [bestScore, setBestScore] = useState(null);

  const allMatched = matchedIds.length === BASE_CARDS.length;
  const score = Math.max(0, 100 - moves * 5 + matchedIds.length * 10);

  const cardState = useMemo(() => {
    const flippedSet = new Set(flipped);
    const matchedSet = new Set(matchedIds);
    return deck.map((card) => ({
      ...card,
      isFlipped: flippedSet.has(card.uid) || matchedSet.has(card.id),
      isMatched: matchedSet.has(card.id),
    }));
  }, [deck, flipped, matchedIds]);

  const resetGame = () => {
    setDeck(buildDeck());
    setFlipped([]);
    setMatchedIds([]);
    setMoves(0);
    setBusy(false);
  };

  const handleFlip = (card) => {
    if (busy || flipped.includes(card.uid) || matchedIds.includes(card.id)) {
      return;
    }

    const nextFlipped = [...flipped, card.uid];
    setFlipped(nextFlipped);

    if (nextFlipped.length < 2) {
      return;
    }

    setMoves((prev) => prev + 1);
    setBusy(true);

    const [firstUid, secondUid] = nextFlipped;
    const firstCard = deck.find((item) => item.uid === firstUid);
    const secondCard = deck.find((item) => item.uid === secondUid);

    if (firstCard && secondCard && firstCard.id === secondCard.id) {
      setTimeout(() => {
        setMatchedIds((prev) => {
          const next = [...prev, firstCard.id];
          if (next.length === BASE_CARDS.length) {
            const finalMoves = moves + 1;
            const finalScore = Math.max(0, 100 - finalMoves * 5 + next.length * 10);
            setBestScore((prevBest) =>
              prevBest === null ? finalScore : Math.max(prevBest, finalScore)
            );
          }
          return next;
        });
        setFlipped([]);
        setBusy(false);
      }, 500);
    } else {
      setTimeout(() => {
        setFlipped([]);
        setBusy(false);
      }, 850);
    }
  };

  return (
    <main className="page">
      <section className="card">
        <h1>Memory Match</h1>
        <p className="subtitle">Flip two cards and find matching pairs!</p>

        <div className="stats">
          <div className="pill">Moves: {moves}</div>
          <div className="pill">Matches: {matchedIds.length}/{BASE_CARDS.length}</div>
          <div className="pill">Score: {score}</div>
          <div className="pill">Best: {bestScore ?? "-"}</div>
        </div>

        <div className="grid">
          {cardState.map((card) => (
            <button
              key={card.uid}
              type="button"
              className={`memoryCard ${card.isFlipped ? "flipped" : ""} ${card.isMatched ? "matched" : ""}`}
              onClick={() => handleFlip(card)}
            >
              <span className="front">?</span>
              <span className="back" aria-hidden={!card.isFlipped}>
                {card.emoji}
              </span>
            </button>
          ))}
        </div>

        {allMatched && <p className="win">🎉 Great job! You matched all pairs!</p>}

        <button type="button" className="resetBtn" onClick={resetGame}>
          Play Again
        </button>
      </section>

      <style jsx>{`
        .page {
          min-height: 100vh;
          display: grid;
          place-items: center;
          padding: 1rem;
          background: linear-gradient(180deg, #9de8ff 0%, #87d9ff 55%, #79d877 100%);
          font-family: "Fredoka", sans-serif;
        }

        .card {
          width: min(760px, 96vw);
          background: #fff;
          border: 4px solid #fff;
          border-radius: 26px;
          box-shadow: 0 14px 0 rgba(35, 51, 104, 0.16);
          padding: 1rem;
          text-align: center;
        }

        h1 {
          margin: 0;
          font-size: clamp(2rem, 5vw, 3rem);
          font-family: "Baloo 2", cursive;
          color: #fff;
          background: linear-gradient(90deg, #4f8cff, #ff7eb6);
          border-radius: 16px;
          text-shadow: 0 4px 0 #2e68ca;
        }

        .subtitle {
          margin: 0.7rem 0;
          color: #2f4f88;
          font-weight: 600;
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.45rem;
          margin-bottom: 0.8rem;
        }

        .pill {
          background: #eef3ff;
          border: 2px dashed #c9d7ff;
          border-radius: 999px;
          padding: 0.3rem 0.45rem;
          color: #4a67a0;
          font-weight: 700;
          font-size: 0.9rem;
        }

        .grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 0.55rem;
        }

        .memoryCard {
          position: relative;
          min-height: 95px;
          border: 3px solid #fff;
          border-radius: 14px;
          box-shadow: 0 8px 0 rgba(0, 0, 0, 0.14);
          cursor: pointer;
          transform-style: preserve-3d;
          transition: transform 0.35s ease;
          background: linear-gradient(180deg, #6fd9ff, #4f8cff);
          color: #fff;
          font-size: 2rem;
        }

        .memoryCard.flipped {
          transform: rotateY(180deg);
          background: linear-gradient(180deg, #ffb86a, #ff9f3a);
        }

        .memoryCard.matched {
          background: linear-gradient(180deg, #82de95, #63cb7f);
          animation: pulse 0.8s ease;
        }

        .front,
        .back {
          position: absolute;
          inset: 0;
          display: grid;
          place-items: center;
          backface-visibility: hidden;
          font-family: "Baloo 2", cursive;
        }

        .back {
          transform: rotateY(180deg);
        }

        .win {
          margin: 0.85rem 0 0.5rem;
          color: #2f8d5f;
          font-family: "Baloo 2", cursive;
          font-size: 1.4rem;
          animation: pulse 1s infinite;
        }

        .resetBtn {
          border: 3px solid #fff;
          border-radius: 14px;
          padding: 0.45rem 1rem;
          color: #fff;
          font-family: "Baloo 2", cursive;
          font-size: 1.1rem;
          background: linear-gradient(180deg, #6f9dff, #4f8cff);
          box-shadow: 0 7px 0 rgba(0, 0, 0, 0.15);
          cursor: pointer;
        }

        @media (max-width: 680px) {
          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.03); }
        }
      `}</style>
    </main>
  );
}
