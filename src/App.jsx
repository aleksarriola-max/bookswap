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
import BottomNav from './components/BottomNav';

export default function App() {
  const [user, setUser] = useState(() => getUser());

  const handleLogout = () => setUser(null);

  if (!user) {
    return <Onboarding onJoined={setUser} />;
  }

  return (
    <BrowserRouter>
      <div className="flex flex-col h-screen max-w-lg mx-auto bg-gray-50 overflow-hidden">
        {/* Main content area */}
        <div className="flex-1 overflow-hidden flex flex-col">
          <Routes>
            <Route path="/" element={<Browse user={user} />} />
            <Route path="/book/:id" element={<BookDetail user={user} />} />
            <Route path="/post" element={<PostBook user={user} />} />
            <Route path="/messages" element={<Inbox user={user} />} />
            <Route path="/messages/:id" element={<ChatThread user={user} />} />
            <Route path="/my-books" element={<MyBooks user={user} onLogout={handleLogout} />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>

        {/* Bottom navigation */}
        <BottomNav user={user} />
      </div>
    </BrowserRouter>
  );
}
