import React, { useState, useEffect, useCallback } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import Personal from './components/Personal';
import Favorite from './components/Favorite';
import BookLending from './components/BookLending';

type TabType = 'personal' | 'favorite' | 'book-lending';

const MyPage: React.FC = () => {
  const history = useHistory();
  const location = useLocation();
  
  // Determine active tab from URL
  const getActiveTab = useCallback((): TabType => {
    const path = location.pathname;
    if (path === '/my-page' || path === '/' || path === '/my-page/personal') return 'personal';
    if (path === '/my-page/favorite') return 'favorite';
    if (path === '/my-page/book-lending') return 'book-lending';
    return 'personal';
  }, [location.pathname]);

  const [activeTab, setActiveTab] = useState<TabType>(getActiveTab());

  // Sync activeTab with URL changes
  useEffect(() => {
    const tab = getActiveTab();
    setActiveTab(tab);
  }, [getActiveTab]);

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
    { id: 'personal' as TabType, label: 'Personal', icon: '👤' },
    { id: 'favorite' as TabType, label: 'Favorite', icon: '⭐' },
    { id: 'book-lending' as TabType, label: 'Book Lending', icon: '📖' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Left Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-4 border-b">
          <h2 className="text-xl font-bold text-gray-800">My Page</h2>
        </div>
        <nav className="mt-4">
          {tabs.map((tab) => (
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
        </div>
      </div>
    </div>
  );
};

export default MyPage;
