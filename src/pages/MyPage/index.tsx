import React, { useState, useEffect } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Personal from './components/Personal';
import Favorite from './components/Favorite';
import BookLending from './components/BookLending';
import Books from '../Books';
import Users from '../Users';
import Admin from '../Admin';
import Loans from '../Loans';
import Groups from '../Groups';

type TabType = 'personal' | 'favorite' | 'book-lending' | 'books' | 'users' | 'roles' | 'groups' | 'loans';

const MyPage: React.FC = () => {
  const { hasRole } = useAuth();
  const history = useHistory();
  const location = useLocation();
  
  // Determine active tab from URL
  const getActiveTab = (): TabType => {
    const path = location.pathname;
    if (path === '/my-page' || path === '/' || path === '/my-page/personal') return 'personal';
    if (path === '/my-page/favorite') return 'favorite';
    if (path === '/my-page/book-lending') return 'book-lending';
    if (path === '/my-page/users') return 'users';
    if (path === '/my-page/roles') return 'roles';
    if (path === '/my-page/groups') return 'groups';
    if (path === '/my-page/books') return 'books';
    if (path === '/my-page/loans') return 'loans';
    return 'personal';
  };

  const [activeTab, setActiveTab] = useState<TabType>(getActiveTab());

  // Sync activeTab with URL changes
  useEffect(() => {
    const tab = getActiveTab();
    setActiveTab(tab);
  }, [location.pathname]);

  // Redirect to personal tab if on /my-page without sub-route
  useEffect(() => {
    if (location.pathname === '/my-page' || location.pathname === '/') {
      history.replace('/my-page/personal');
    }
  }, [location.pathname, history]);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    history.push(`/my-page/${tab}`);
  };

  const tabs = [
    { id: 'personal' as TabType, label: 'Personal', icon: '👤', show: true },
    { id: 'favorite' as TabType, label: 'Favorite', icon: '⭐', show: true },
    { id: 'book-lending' as TabType, label: 'Book Lending', icon: '📖', show: true },
    { id: 'books' as TabType, label: 'Books', icon: '📚', show: true },
    { id: 'users' as TabType, label: 'Users', icon: '👥', show: hasRole('admin') || hasRole('librarian') },
    { id: 'roles' as TabType, label: 'Roles', icon: '🔐', show: hasRole('admin') },
    { id: 'groups' as TabType, label: 'Groups', icon: '👥', show: hasRole('admin') },
    { id: 'loans' as TabType, label: 'Loans', icon: '📖', show: hasRole('admin') || hasRole('librarian') },
  ];

  const visibleTabs = tabs.filter(tab => tab.show);

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Left Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">My Page</h2>
        </div>
        <nav className="mt-4">
          {visibleTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`w-full text-left px-4 py-3 flex items-center space-x-3 transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 text-blue-600 border-r-4 border-blue-600'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-xl">{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <div className="container mx-auto px-6 py-8">
          {activeTab === 'personal' && <Personal />}
          {activeTab === 'favorite' && <Favorite />}
          {activeTab === 'book-lending' && <BookLending />}
          {activeTab === 'books' && <Books />}
          {activeTab === 'users' && <Users />}
          {activeTab === 'roles' && <Admin />}
          {activeTab === 'groups' && <Groups />}
          {activeTab === 'loans' && <Loans />}
        </div>
      </div>
    </div>
  );
};

export default MyPage;
