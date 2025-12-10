import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch, Link, Redirect, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';
import { setToastContext } from './utils/notifications';
import ProtectedRoute from './components/ProtectedRoute';
import PermissionProtectedRoute from './components/PermissionProtectedRoute';
import UserAvatar from './components/UserAvatar';
import MyPage from './pages/MyPage';
import Dashboard from './pages/Dashboard';
import BrowseBooks from './pages/BrowseBooks';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Setup from './pages/Setup';
import NotFound from './pages/NotFound';
import Manager from './pages/Manager';
import RolesManagement from './pages/Manager/RolesManagement';
import GroupsManagement from './pages/Manager/GroupsManagement';
import UsersManagement from './pages/Manager/UsersManagement';
import BooksManagement from './pages/Manager/BooksManagement';
import LendingManagement from './pages/Manager/LendingManagement';

const AppContent: React.FC = () => {
  const { isAuthenticated, needsSetup, checkingSetup } = useAuth();
  const { showToast, toasts, removeToast } = useToast();
  const location = useLocation();
  const isManagerPage = location.pathname.startsWith('/manager');

  // Initialize toast context for notify utility
  useEffect(() => {
    setToastContext({ showToast });
  }, [showToast]);

  // Show loading while checking setup
  if (checkingSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If setup is needed, show setup page for all routes except /setup itself
  if (needsSetup) {
    return (
      <div className="min-h-screen bg-gray-100">
        <Switch>
          <Route exact path="/setup" component={Setup} />
          <Route path="*">
            <Redirect to="/setup" />
          </Route>
        </Switch>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {isAuthenticated && !isManagerPage && (
        <nav className="bg-blue-600 text-white shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Logo and Site Name */}
              <div className="flex items-center space-x-3">
                <div className="text-3xl">📚</div>
                <Link to="/" className="text-2xl font-bold hover:text-blue-200 transition">
                  Library Management System
                </Link>
              </div>

              {/* Navigation Links and User Avatar */}
              <div className="flex items-center space-x-6">
                <Link to="/" className="hover:text-blue-200 transition font-medium">
                  Home
                </Link>
                <Link to="/books" className="hover:text-blue-200 transition font-medium">
                  Books
                </Link>
                <button className="hover:text-blue-200 transition p-2 relative">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {/* Badge for notifications - can be enhanced later */}
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-red-500"></span>
                </button>
                <UserAvatar />
              </div>
            </div>
          </div>
        </nav>
      )}

      <main className={isAuthenticated && !isManagerPage ? '' : 'container mx-auto px-4 py-8'}>
        <Switch>
          <Route exact path="/setup">
            {needsSetup ? <Setup /> : <Redirect to="/login" />}
          </Route>
          <Route exact path="/login" component={Login} />
          <Route exact path="/register" component={Register} />
          <Route exact path="/reset-password" component={ResetPassword} />
          <ProtectedRoute exact path="/" component={Dashboard} />
          <ProtectedRoute exact path="/books" component={BrowseBooks} />
          <ProtectedRoute path="/my-page" component={MyPage} />
          <ProtectedRoute exact path="/manager" component={Manager} />
          <PermissionProtectedRoute exact path="/manager/roles" permission="role:read" component={RolesManagement} />
          <PermissionProtectedRoute exact path="/manager/groups" permission="group:read" component={GroupsManagement} />
          <PermissionProtectedRoute exact path="/manager/users" permission="user:read" component={UsersManagement} />
          <PermissionProtectedRoute exact path="/manager/books" permission="book:read" component={BooksManagement} />
          <PermissionProtectedRoute exact path="/manager/lending" permission="book_lending:read" component={LendingManagement} />
          <Route path="*" component={NotFound} />
        </Switch>
      </main>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <ToastProvider>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ToastProvider>
    </Router>
  );
};

export default App;

