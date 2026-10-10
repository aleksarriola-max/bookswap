import { NavLink } from 'react-router-dom';
import { Search, PlusCircle, MessageCircle, BookMarked } from 'lucide-react';
import { useEffect, useState } from 'react';
import { getRequestsForUser } from '../store';

export default function BottomNav({ user }) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const reqs = getRequestsForUser(user.id);
    setUnread(reqs.filter((r) => r.status === 'pending' && r.ownerId === user.id).length);
  }, [user.id]);

  const tabs = [
    { to: '/', label: 'Browse', icon: Search },
    { to: '/post', label: 'Post', icon: PlusCircle },
    { to: '/messages', label: 'Messages', icon: MessageCircle, badge: unread },
    { to: '/my-books', label: 'My Books', icon: BookMarked },
  ];

  return (
    <nav className="bg-white border-t border-gray-100 flex items-stretch h-16 safe-bottom">
      {tabs.map(({ to, label, icon: Icon, badge }) => (
        <NavLink
          key={to}
          to={to}
          end={to === '/'}
          className={({ isActive }) =>
            `flex-1 flex flex-col items-center justify-center gap-0.5 text-xs font-medium transition-colors ${
              isActive ? 'text-brand-600' : 'text-gray-400 hover:text-gray-600'
            }`
          }
        >
          <div className="relative">
            <Icon className="w-5 h-5" />
            {badge > 0 && (
              <span className="absolute -top-1 -right-1.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                {badge}
              </span>
            )}
          </div>
          <span>{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
