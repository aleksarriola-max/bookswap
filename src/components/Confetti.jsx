import { useEffect, useState } from 'react';

const COLORS = ['#e4a340', '#c8553d', '#2d6a4f', '#8b5cf6', '#1e6091', '#f4a261', '#95d5b2'];
const COUNT = 48;

function rand(a, b) { return a + Math.random() * (b - a); }

export default function Confetti({ onDone }) {
  const [pieces] = useState(() =>
    Array.from({ length: COUNT }, (_, i) => ({
      id: i,
      color: COLORS[i % COLORS.length],
      x: rand(5, 95),
      delay: rand(0, 0.6),
      dur: rand(1.2, 2.2),
      size: rand(6, 12),
      rotate: rand(0, 360),
      shape: i % 3,
    }))
  );

  useEffect(() => {
    const t = setTimeout(onDone, 2800);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      <style>{`
        @keyframes confettiFall {
          0%   { transform: translateY(0) rotate(0deg); opacity: 1; }
          80%  { opacity: 1; }
          100% { transform: translateY(110vh) rotate(720deg); opacity: 0; }
        }
      `}</style>
      {pieces.map((p) => (
        <div key={p.id} style={{
          position: 'absolute',
          left: `${p.x}%`,
          top: '-20px',
          width: p.size,
          height: p.shape === 0 ? p.size : p.size * 1.4,
          borderRadius: p.shape === 0 ? '50%' : '2px',
          backgroundColor: p.color,
          clipPath: p.shape === 2 ? 'polygon(50% 0%, 0% 100%, 100% 100%)' : 'none',
          animation: `confettiFall ${p.dur}s ${p.delay}s ease-in forwards`,
          transform: `rotate(${p.rotate}deg)`,
          opacity: 0.9,
        }} />
      ))}
    </div>
  );
}
