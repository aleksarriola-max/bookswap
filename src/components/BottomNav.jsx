import { useStoreVersion } from '../lib/cloud';
import { NavLink } from 'react-router-dom';
import { Search, PlusCircle, MessageCircle, BookMarked, BookHeart } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getRequestsForUser, getMyWishes } from '../store';

export default function BottomNav({ user }) {
  const dataVersion = useStoreVersion();
  const [unread, setUnread] = useState(0);
  const [wishCount, setWishCount] = useState(0);

  useEffect(() => {
    setUnread(getRequestsForUser(user.id).filter((r) => r.status === 'pending' && r.ownerId === user.id).length);
    setWishCount(getMyWishes(user.id).length);
  }, [user.id, dataVersion]);

  const tabs = [
    { to: '/',          label: 'Browse',   icon: Search },
    { to: '/post',      label: 'Post',     icon: PlusCircle },
    { to: '/messages',  label: 'Messages', icon: MessageCircle, badge: unread },
    { to: '/wishlist',  label: 'Wishlist', icon: BookHeart, badge: wishCount > 0 ? wishCount : 0 },
    { to: '/my-books',  label: 'My Books', icon: BookMarked },
  ];

  return (
    <nav className="flex items-stretch h-16 border-t border-warm-100" style={{ background: '#fdf6ec' }}>
      {tabs.map(({ to, label, icon: Icon, badge }) => (
        <NavLink key={to} to={to} end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors relative ${
              isActive ? 'text-warm-700' : 'text-warm-400 hover:text-warm-600'
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-warm-600 rounded-full" />}
              <div className="relative">
                <Icon className="w-5 h-5" />
                {badge > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] ${isActive ? 'font-semibold' : ''}`}>{label}</span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}
