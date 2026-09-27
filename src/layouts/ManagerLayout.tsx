import React, { useRef, useEffect, useState } from 'react';
import { Link, useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from '../components/NotificationBell';

interface ManagerLayoutProps {
  children: React.ReactNode;
}

const ManagerLayout: React.FC<ManagerLayoutProps> = ({
  children,
}) => {
  const { user, logout, hasRole } = useAuth();
  const history = useHistory();
  const location = useLocation();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleUserPage = () => {
    setIsDropdownOpen(false);
    history.push('/my-page/personal');
  };

  const handleLogout = () => {
    setIsDropdownOpen(false);
    logout();
    history.push('/login');
  };

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Manager menu items with role checks
  const menuItems = [
    {
      path: '/manager/roles',
      label: 'Roles Management',
      icon: '🔐',
      role: 'role:read',
    },
    {
      path: '/manager/groups',
      label: 'Groups Management',
      icon: '👥',
      role: 'group:read',
    },
    {
      path: '/manager/users',
      label: 'Users Management',
      icon: '👤',
      role: 'user:read',
    },
    {
      path: '/manager/books',
      label: 'Books Management',
      icon: '📚',
      role: 'book:read',
    },
    {
      path: '/manager/lending',
      label: 'Lending Management',
      icon: '📖',
      role: 'book_lending:read',
    },
  ].filter(item => hasRole(item.role));

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg border-r">
        <div className="p-4 border-b">
          <div className="flex items-center space-x-3">
            <div className="text-3xl">📚</div>
            <Link to="/" className="text-xl font-bold text-gray-800 hover:text-blue-600 transition">
              Library System
            </Link>
          </div>
        </div>
        <nav className="mt-4">
          {menuItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`w-full flex items-center space-x-3 px-4 py-3 transition-colors ${
                  isActive
                    ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600'
                    : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <span className="text-xl">{item.icon}</span>
                <span className="font-medium">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="px-6 py-4">
            <div className="flex items-center justify-end">
              <div className="flex items-center space-x-4">
                <NotificationBell />
                {/* Avatar with Dropdown */}
                {user && (
                  <div className="relative" ref={dropdownRef}>
                    <button
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-300"
                    >
                      <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white font-semibold">
                        {getInitials(user.name || 'U')}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      </div>
                      <svg
                        className={`w-4 h-4 transition-transform ${isDropdownOpen ? 'transform rotate-180' : ''}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isDropdownOpen && (
                      <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 z-50 border border-gray-200">
                        <button
                          onClick={handleUserPage}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center space-x-2"
                        >
                          <span>👤</span>
                          <span>User Page</span>
                        </button>
                        <button
                          onClick={handleLogout}
                          className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center space-x-2"
                        >
                          <span>🚪</span>
                          <span>Logout</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto">
          <div className="container mx-auto px-6 py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default ManagerLayout;

