import { useState } from 'react';
import { MapPin, Loader2 } from 'lucide-react';
import { createUser } from '../store';
import { cloudEnabled, isGuestMode } from '../lib/cloud';

export default function Onboarding({ onJoined, initialName = '' }) {
  const [name, setName] = useState(initialName);
  const [step, setStep] = useState(cloudEnabled && !isGuestMode() ? 'location' : 'name');
  const [error, setError] = useState('');

  const handleName = (e) => {
    e.preventDefault();
    if (!name.trim()) return setError('Please enter your name.');
    setError('');
    setStep('location');
  };

  const handleLocation = () => {
    setStep('locating');
    setError('');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const user = createUser({ name: name.trim(), lat: pos.coords.latitude, lng: pos.coords.longitude });
        onJoined(user);
      },
      () => {
        const user = createUser({ name: name.trim(), lat: 42.3601, lng: -71.0589 });
        onJoined(user);
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 relative overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #fdf6ec 0%, #f5ead6 50%, #ede0ca 100%)' }}
    >
      {/* Decorative background books */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-10">
        {['#c8553d','#2d6a4f','#3a405a','#8b5cf6','#6b4226'].map((c, i) => (
          <div key={i}
            className="absolute rounded-lg shadow-lg"
            style={{
              backgroundColor: c,
              width: 40 + i * 8,
              height: 60 + i * 12,
              top: `${[15, 60, 25, 70, 45][i]}%`,
              left: `${[8, 82, 55, 15, 88][i]}%`,
              transform: `rotate(${[-8, 12, -5, 15, -10][i]}deg)`,
            }}
          />
        ))}
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo / hero */}
        <div className="text-center mb-8">
          <div className="inline-block text-6xl mb-3 drop-shadow-sm">📚</div>
          <h1 className="text-3xl font-bold text-warm-800" style={{ fontFamily: 'Lora, Georgia, serif' }}>
            Ctrl+Us
          </h1>
          <p className="text-warm-600 mt-1.5 text-sm leading-relaxed">
            Share the books you love<br/>with people right around you
          </p>
        </div>

        {step === 'name' && (
          <form onSubmit={handleName} className="card p-6 space-y-4 shadow-lg border-warm-100">
            <div>
              <label className="block text-sm font-semibold text-warm-800 mb-1.5">
                What should we call you?
              </label>
              <input
                className="input text-base"
                placeholder="Your first name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              {error && <p className="text-red-400 text-xs mt-1">{error}</p>}
            </div>
            <button type="submit" className="btn-primary w-full text-base py-3">
              Let's go →
            </button>
            <p className="text-xs text-center text-gray-400">
              {cloudEnabled && !isGuestMode() ? 'Choose your name and neighborhood' : 'No sign-up required · works in your browser'}
            </p>
          </form>
        )}

        {step === 'location' && (
          <div className="card p-6 space-y-5 text-center shadow-lg border-warm-100">
            <div className="inline-flex items-center justify-center w-14 h-14 bg-warm-100 rounded-2xl text-2xl">
              📍
            </div>
            <div>
              <h2 className="font-bold text-warm-800 text-lg" style={{ fontFamily: 'Lora, Georgia, serif' }}>
                Where are you?
              </h2>
              <p className="text-sm text-gray-500 mt-1.5">
                We'll show you books within <strong>5 km</strong>.<br />
                Your exact location is never shared with anyone.
              </p>
            </div>
            <button onClick={handleLocation} className="btn-primary w-full py-3 flex items-center justify-center gap-2">
              <MapPin className="w-4 h-4" /> Use my location
            </button>
            <button
              className="text-xs text-warm-500 underline underline-offset-2"
              onClick={() => { const u = createUser({ name: name.trim(), lat: 42.3601, lng: -71.0589 }); onJoined(u); }}
            >
              Skip — use Boston area
            </button>
          </div>
        )}

        {step === 'locating' && (
          <div className="card p-8 flex flex-col items-center gap-4 shadow-lg">
            <Loader2 className="w-8 h-8 text-warm-500 animate-spin" />
            <p className="text-warm-700 text-sm font-medium">Finding books near you…</p>
          </div>
        )}
      </div>
    </div>
  );
}
