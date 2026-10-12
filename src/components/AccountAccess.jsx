import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { supabase } from '../lib/cloud';

export default function AccountAccess() {
  const [signup, setSignup] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [status, setStatus] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(event) {
    event.preventDefault(); setBusy(true); setStatus('');
    try {
      const credentials = { email: email.trim(), password };
      const result = signup ? await supabase.auth.signUp({ ...credentials, options: { data: { name: name.trim() } } }) : await supabase.auth.signInWithPassword(credentials);
      if (result.error) throw result.error;
      if (signup && !result.data.session) setStatus('Check your email to confirm your account, then sign in here.');
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  }
  async function resetPassword() {
    if (!email.trim()) return setStatus('Enter your email address first.');
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
      if (error) throw error;
      setStatus('Check your email for a password reset link.');
    } catch (error) { setStatus(error.message); }
    finally { setBusy(false); }
  }
  return <div className="min-h-screen bg-cream flex items-center justify-center p-5">
    <form onSubmit={submit} className="card p-6 space-y-4 w-full max-w-sm">
      <h1 className="text-2xl font-bold text-warm-800">Ctrl+Us 📚</h1>
      <p className="text-sm text-warm-600">{signup ? 'Join your neighborhood book exchange.' : 'Sign in to your book community.'}</p>
      {signup && <input className="input" aria-label="Name" placeholder="Your first name" required maxLength={60} value={name} onChange={e => setName(e.target.value)} />}
      <input className="input" type="email" aria-label="Email" placeholder="Email" autoComplete="email" required value={email} onChange={e => setEmail(e.target.value)} />
      <div className="relative">
        <input className="input pr-12" type={showPassword ? 'text' : 'password'} aria-label="Password" placeholder="Password (at least 8 characters)" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={8} value={password} onChange={e => setPassword(e.target.value)} />
        <button
          type="button"
          className="absolute inset-y-0 right-0 flex items-center px-3 text-warm-500 hover:text-warm-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-warm-500 rounded-r-lg"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          onClick={() => setShowPassword(visible => !visible)}
        >
          {showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </button>
      </div>
      {status && <p role="status" className="text-sm text-warm-700">{status}</p>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : signup ? 'Create account' : 'Sign in'}</button>
      <button type="button" className="text-xs text-warm-600 underline w-full" disabled={busy} onClick={() => { setSignup(!signup); setStatus(''); }}>{signup ? 'Already have an account? Sign in' : 'New here? Create an account'}</button>
      {!signup && <button type="button" className="text-xs text-warm-500 underline w-full" disabled={busy} onClick={resetPassword}>Forgot password?</button>}
    </form>
  </div>;
}
