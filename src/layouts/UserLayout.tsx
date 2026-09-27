import React from 'react';
import { Link } from 'react-router-dom';
import UserAvatar from '../components/UserAvatar';
import NotificationBell from '../components/NotificationBell';
import { useUserSearch } from '../contexts/UserSearchContext';

interface UserLayoutProps {
  children: React.ReactNode;
}

const UserLayout: React.FC<UserLayoutProps> = ({
  children,
}) => {
  const { searchTerm, setSearchTerm } = useUserSearch();

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Navigation Bar */}
        <nav className="bg-blue-600 text-white shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Logo and Site Name */}
              <div className="flex items-center space-x-3">
                <div className="text-3xl">📚</div>
                <Link to="/" className="text-2xl font-bold hover:text-blue-200 transition">
                  E-Library
                </Link>
              </div>

              {/* Search Input */}
              <div className="flex-1 max-w-xs mx-8">
                <input
                  type="text"
                  placeholder="Search approved books..."
                  value={searchTerm}
                  onChange={handleSearch}
                  className="w-full px-4 py-2 bg-transparent border border-white border-opacity-30 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 text-white placeholder-white placeholder-opacity-70"
                />
              </div>
              
              {/* Navigation Links and User Avatar */}
              <div className="flex items-center space-x-6">
                <Link to="/" className="hover:text-blue-200 transition font-medium">
                  Home
                </Link>
                <Link to="/books" className="hover:text-blue-200 transition font-medium">
                  Books
                </Link>
                <NotificationBell buttonClassName="hover:text-blue-200" />
                <UserAvatar />
              </div>
            </div>
          </div>
        </nav>

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

export default UserLayout;

