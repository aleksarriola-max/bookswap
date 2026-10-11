import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { getUser } from './store';
import Onboarding from './pages/Onboarding';
import Browse from './pages/Browse';
import BookDetail from './pages/BookDetail';
import PostBook from './pages/PostBook';
import Inbox from './pages/Inbox';
import ChatThread from './pages/ChatThread';
import MyBooks from './pages/MyBooks';
import ReadingShelf from './pages/ReadingShelf';
import Wishlist from './pages/Wishlist';
import BottomNav from './components/BottomNav';
import AccountAccess from './components/AccountAccess';
import Community from './pages/Community';
import Handoff from './pages/Handoff';
import { cloudEnabled, supabase, setCloudIdentity, clearCloudCache, refreshCloud, reportError } from './lib/cloud';

export default function App() {
  const [user, setUser] = useState(() => getUser());
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(!cloudEnabled);
  const [loaded, setLoaded] = useState(!cloudEnabled);
  const [error, setError] = useState('');
  const [recovery, setRecovery] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  useEffect(() => {
    const showError = event => setError(event.detail);
    window.addEventListener('bookswap-error', showError);
    return () => window.removeEventListener('bookswap-error', showError);
  }, []);
  useEffect(() => {
    if (!cloudEnabled) return;
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      if (event === 'PASSWORD_RECOVERY') setRecovery(true);
      setSession(next); setReady(true);
      setCloudIdentity(next?.user.id || null);
      if (!next) { clearCloudCache(); setUser(null); }
      else setUser(previous => previous?.id === next.user.id ? previous : getUser()?.id === next.user.id ? getUser() : null);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!cloudEnabled || !session?.user.id || !user?.id) return;
    let active = true;
    setLoaded(false);
    const refresh = () => refreshCloud().then(() => { if (active) { setLoaded(true); setError(''); } }).catch(error => { if (active) reportError(error); });
    refresh();
    const channel = supabase.channel(`community-${session.user.id}`);
    ['books', 'requests', 'messages', 'wishlist', 'groups', 'group_members', 'blocks', 'reports'].forEach(table => channel.on('postgres_changes', { event: '*', schema: 'public', table }, refresh));
    channel.subscribe();
    const interval = setInterval(refresh, 15000);
    return () => { active = false; clearInterval(interval); supabase.removeChannel(channel); };
  }, [session?.user.id, user?.id]);
  const handleLogout = () => setUser(null);

  if (!ready) return <div className="p-8 text-warm-600">Connecting to Ctrl+Us…</div>;
  if (recovery) return <form className="card m-5 p-5 space-y-3" onSubmit={async event => {
    event.preventDefault();
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setError(error.message); else { setRecovery(false); setError(''); }
  }}><h1 className="font-bold text-warm-800">Choose a new password</h1><input className="input" type="password" aria-label="New password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={event => setNewPassword(event.target.value)} />{error && <p role="alert">{error}</p>}<button className="btn-primary">Save password</button></form>;
  if (cloudEnabled && !session) return <AccountAccess />;
  if (!user) return <Onboarding initialName={session?.user.user_metadata?.name || ''} onJoined={setUser} />;
  if (!loaded) return <div className="p-8 text-warm-600"><p>Loading your community…</p>{error && <p role="alert" className="mt-3">{error}</p>}<button className="btn-secondary mt-4" onClick={() => refreshCloud().then(() => { setLoaded(true); setError(''); }).catch(reportError)}>Retry</button><button className="btn-ghost mt-4" onClick={() => supabase.auth.signOut().then(({ error }) => { if (error) reportError(error); })}>Sign out</button></div>;

  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen max-w-lg mx-auto overflow-hidden" style={{ background: '#fdf6ec' }}>
        {error && <div role="alert" className="bg-red-50 text-red-700 px-4 py-2 text-xs flex items-center gap-2"><span className="flex-1">{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}>×</button></div>}
        {!cloudEnabled && <p className="text-center text-xs text-warm-500 py-1">School demo · data stays in this browser</p>}
        <div className="flex-1 overflow-hidden flex flex-col">
          <Routes>
            <Route path="/" element={<Browse user={user} />} />
            <Route path="/book/:id" element={<BookDetail user={user} />} />
            <Route path="/post" element={<PostBook user={user} />} />
            <Route path="/messages" element={<Inbox user={user} />} />
            <Route path="/messages/:id" element={<ChatThread user={user} />} />
            <Route path="/my-books" element={<MyBooks user={user} onLogout={handleLogout} />} />
            <Route path="/reading" element={<ReadingShelf user={user} />} />
            <Route path="/wishlist" element={<Wishlist user={user} />} />
            <Route path="/community" element={<Community />} />
            <Route path="/handoff/:id" element={<Handoff user={user} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <BottomNav user={user} />
      </div>
    </BrowserRouter>
  );
}
