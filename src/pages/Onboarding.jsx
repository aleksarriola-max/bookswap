import { useState } from 'react';
import { BookOpen, MapPin, Loader2 } from 'lucide-react';
import { createUser } from '../store';

export default function Onboarding({ onJoined }) {
  const [name, setName] = useState('');
  const [step, setStep] = useState('name'); // 'name' | 'location' | 'locating'
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
        const user = createUser({
          name: name.trim(),
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
        });
        onJoined(user);
      },
      () => {
        // fallback: Boston area (Hult campus)
        const user = createUser({ name: name.trim(), lat: 42.3601, lng: -71.0589 });
        onJoined(user);
      },
      { timeout: 8000 }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-600 rounded-2xl shadow-lg mb-4">
            <BookOpen className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">BookSwap</h1>
          <p className="text-gray-500 text-sm mt-1">Share books with people nearby</p>
        </div>

        {/* Name step */}
        {(step === 'name') && (
          <form onSubmit={handleName} className="card p-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">Your name</label>
              <input
                className="input"
                placeholder="e.g. Aleks"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
              {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
            </div>
            <button type="submit" className="btn-primary w-full">Continue →</button>
            <p className="text-xs text-center text-gray-400">No account needed. Your name is only shown to people you exchange books with.</p>
          </form>
        )}

        {/* Location step */}
        {step === 'location' && (
          <div className="card p-6 space-y-4 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-full">
              <MapPin className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h2 className="font-semibold text-gray-800">Allow location access</h2>
              <p className="text-sm text-gray-500 mt-1">
                BookSwap uses your location to show you books within <strong>5 km</strong>. We never store your exact address.
              </p>
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
            <button onClick={handleLocation} className="btn-primary w-full flex items-center justify-center gap-2">
              <MapPin className="w-4 h-4" /> Share my location
            </button>
            <button
              className="text-xs text-gray-400 underline"
              onClick={() => {
                const user = createUser({ name: name.trim(), lat: 42.3601, lng: -71.0589 });
                onJoined(user);
              }}
            >
              Skip (use Boston as default)
            </button>
          </div>
        )}

        {/* Locating */}
        {step === 'locating' && (
          <div className="card p-6 flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
            <p className="text-gray-600 text-sm">Getting your location…</p>
          </div>
        )}
      </div>
    </div>
  );
}
