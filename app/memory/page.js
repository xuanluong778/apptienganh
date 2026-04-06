"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

const COLS = 4;

const LEVELS = {
  1: { rows: 2, pairs: 4, label: "Cấp 1 — 2 hàng" },
  2: { rows: 4, pairs: 8, label: "Cấp 2 — 4 hàng" },
  3: { rows: 6, pairs: 12, label: "Cấp 3 — 6 hàng" },
};

/** Pool lớn: mỗi ván chọn ngẫu nhiên đủ số cặp theo cấp độ */
const CARD_POOL = [
  { id: "apple", emoji: "🍎", label: "Apple" },
  { id: "cat", emoji: "🐱", label: "Cat" },
  { id: "book", emoji: "📚", label: "Book" },
  { id: "ball", emoji: "⚽", label: "Ball" },
  { id: "star", emoji: "⭐", label: "Star" },
  { id: "sun", emoji: "☀️", label: "Sun" },
  { id: "moon", emoji: "🌙", label: "Moon" },
  { id: "tree", emoji: "🌳", label: "Tree" },
  { id: "car", emoji: "🚗", label: "Car" },
  { id: "dog", emoji: "🐶", label: "Dog" },
  { id: "fish", emoji: "🐟", label: "Fish" },
  { id: "heart", emoji: "❤️", label: "Heart" },
  { id: "gift", emoji: "🎁", label: "Gift" },
  { id: "cake", emoji: "🎂", label: "Cake" },
  { id: "rocket", emoji: "🚀", label: "Rocket" },
  { id: "rainbow", emoji: "🌈", label: "Rainbow" },
  { id: "bee", emoji: "🐝", label: "Bee" },
  { id: "lion", emoji: "🦁", label: "Lion" },
];

function shuffle(list) {
  const copy = [...list];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

function pickRandomPairs(pairCount) {
  if (pairCount > CARD_POOL.length) {
    throw new Error("CARD_POOL too small");
  }
  return shuffle(CARD_POOL).slice(0, pairCount);
}

function buildDeck(levelKey) {
  const { pairs } = LEVELS[levelKey];
  const picked = pickRandomPairs(pairs);
  const cards = picked.flatMap((card) => [
    { ...card, uid: `${card.id}-a` },
    { ...card, uid: `${card.id}-b` },
  ]);
  return shuffle(cards);
}

export default function MemoryPage() {
  const [level, setLevel] = useState(1);
  const [deck, setDeck] = useState(() => buildDeck(1));
  const [flipped, setFlipped] = useState([]);
  const [matchedIds, setMatchedIds] = useState([]);
  const [moves, setMoves] = useState(0);
  const [busy, setBusy] = useState(false);
  const [bestScore, setBestScore] = useState(null);
  const [round, setRound] = useState(1);

  const totalPairs = LEVELS[level].pairs;
  const allMatched = matchedIds.length === totalPairs;
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

  const resetGame = useCallback((nextLevel = level) => {
    setDeck(buildDeck(nextLevel));
    setFlipped([]);
    setMatchedIds([]);
    setMoves(0);
    setBusy(false);
    setRound((r) => r + 1);
  }, [level]);

  const changeLevel = (k) => {
    const key = Number(k);
    if (!LEVELS[key]) return;
    setLevel(key);
    setDeck(buildDeck(key));
    setFlipped([]);
    setMatchedIds([]);
    setMoves(0);
    setBusy(false);
    setRound(1);
  };

  /** Thắng ván → sau 2s tự xáo bài mới (cùng cấp), random cặp mới */
  useEffect(() => {
    if (!allMatched) return;
    const finalMoves = moves;
    const finalScore = Math.max(0, 100 - finalMoves * 5 + totalPairs * 10);
    setBestScore((prevBest) => (prevBest === null ? finalScore : Math.max(prevBest, finalScore)));

    const t = window.setTimeout(() => {
      setDeck(buildDeck(level));
      setFlipped([]);
      setMatchedIds([]);
      setMoves(0);
      setBusy(false);
      setRound((r) => r + 1);
    }, 2000);
    return () => window.clearTimeout(t);
  }, [allMatched, level, moves, totalPairs]);

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
        setMatchedIds((prev) => [...prev, firstCard.id]);
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
        <p className="subtitle">Lật hai thẻ giống nhau — bài xáo ngẫu nhiên mỗi ván!</p>

        <div className="levelRow">
          {(Object.keys(LEVELS)).map((k) => (
            <button
              key={k}
              type="button"
              className={`levelBtn ${level === Number(k) ? "active" : ""}`}
              onClick={() => changeLevel(Number(k))}
            >
              {LEVELS[k].label}
            </button>
          ))}
        </div>

        <div className="stats">
          <div className="pill">Ván: {round}</div>
          <div className="pill">Lượt: {moves}</div>
          <div className="pill">
            Cặp: {matchedIds.length}/{totalPairs}
          </div>
          <div className="pill">Điểm: {score}</div>
          <div className="pill">Kỷ lục: {bestScore ?? "-"}</div>
        </div>

        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
        >
          {cardState.map((card) => (
            <button
              key={`${card.uid}-r${round}`}
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

        {allMatched && (
          <p className="win">
            🎉 Hoàn thành! Ván mới (bài random) sau 2 giây…
          </p>
        )}

        <div className="footerActions">
          <button type="button" className="resetBtn" onClick={() => resetGame(level)}>
            Xáo bài ngay
          </button>
        </div>
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
          font-family: "Fredoka", system-ui, sans-serif;
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

        .levelRow {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          justify-content: center;
          margin-bottom: 0.75rem;
        }

        .levelBtn {
          border: 2px solid #c9d7ff;
          border-radius: 999px;
          padding: 0.4rem 0.75rem;
          font: inherit;
          font-weight: 700;
          font-size: 0.82rem;
          cursor: pointer;
          background: #f0f5ff;
          color: #3d5a9a;
        }

        .levelBtn.active {
          background: linear-gradient(180deg, #6fd9ff, #4f8cff);
          color: #fff;
          border-color: #fff;
          box-shadow: 0 4px 0 rgba(0, 0, 0, 0.12);
        }

        .stats {
          display: grid;
          grid-template-columns: repeat(5, 1fr);
          gap: 0.45rem;
          margin-bottom: 0.8rem;
        }

        .pill {
          background: #eef3ff;
          border: 2px dashed #c9d7ff;
          border-radius: 999px;
          padding: 0.3rem 0.35rem;
          color: #4a67a0;
          font-weight: 700;
          font-size: 0.78rem;
        }

        .grid {
          display: grid;
          gap: 0.45rem;
        }

        .memoryCard {
          position: relative;
          aspect-ratio: 1;
          min-height: 0;
          max-height: 100px;
          border: 3px solid #fff;
          border-radius: 14px;
          box-shadow: 0 8px 0 rgba(0, 0, 0, 0.14);
          cursor: pointer;
          transform-style: preserve-3d;
          transition: transform 0.35s ease;
          background: linear-gradient(180deg, #6fd9ff, #4f8cff);
          color: #fff;
          font-size: clamp(1.35rem, 5vw, 2rem);
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
          font-family: "Fredoka", system-ui, sans-serif;
        }

        .back {
          transform: rotateY(180deg);
        }

        .win {
          margin: 0.85rem 0 0.5rem;
          color: #2f8d5f;
          font-family: "Fredoka", system-ui, sans-serif;
          font-size: 1.15rem;
          font-weight: 700;
          animation: pulse 1s infinite;
        }

        .footerActions {
          margin-top: 0.65rem;
        }

        .resetBtn {
          border: 3px solid #fff;
          border-radius: 14px;
          padding: 0.45rem 1rem;
          color: #fff;
          font-family: "Fredoka", system-ui, sans-serif;
          font-size: 1.05rem;
          background: linear-gradient(180deg, #6f9dff, #4f8cff);
          box-shadow: 0 7px 0 rgba(0, 0, 0, 0.15);
          cursor: pointer;
        }

        @media (max-width: 680px) {
          .stats {
            grid-template-columns: repeat(2, 1fr);
          }

          .memoryCard {
            max-height: none;
            min-height: 64px;
            font-size: 1.35rem;
          }
        }

        @keyframes pulse {
          0%,
          100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.03);
          }
        }
      `}</style>
    </main>
  );
}
