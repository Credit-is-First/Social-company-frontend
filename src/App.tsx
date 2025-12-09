import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch, Link, Redirect } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';
import { setToastContext } from './utils/notifications';
import ProtectedRoute from './components/ProtectedRoute';
import UserAvatar from './components/UserAvatar';
import MyPage from './pages/MyPage';
import BrowseBooks from './pages/BrowseBooks';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Setup from './pages/Setup';
import { usersAPI } from './services/api';

const AppContent: React.FC = () => {
  const { isAuthenticated, user, logout, hasRole } = useAuth();
  const { showToast, toasts, removeToast } = useToast();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [checkingSetup, setCheckingSetup] = useState<boolean>(true);

  // Initialize toast context for notify utility
  useEffect(() => {
    setToastContext({ showToast });
  }, [showToast]);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response = await usersAPI.checkSetup();
        setNeedsSetup(response.data.needsSetup);
      } catch (error) {
        console.error('Error checking setup:', error);
        // If there's an error, assume setup is not needed
        setNeedsSetup(false);
      } finally {
        setCheckingSetup(false);
      }
    };

    checkSetup();
  }, []);

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
      {isAuthenticated && (
        <nav className="bg-blue-600 text-white shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              {/* Logo and Site Name */}
              <div className="flex items-center space-x-3">
                <div className="text-3xl">📚</div>
                <Link to="/my-page/personal" className="text-2xl font-bold hover:text-blue-200 transition">
                  Library Management System
                </Link>
              </div>

              {/* Navigation Links and User Avatar */}
              <div className="flex items-center space-x-6">
                <Link to="/my-page/personal" className="hover:text-blue-200 transition font-medium">
                  Homepage
                </Link>
                <Link to="/books" className="hover:text-blue-200 transition font-medium">
                  Books
                </Link>
                <UserAvatar />
              </div>
            </div>
          </div>
        </nav>
      )}

      <main className={isAuthenticated ? '' : 'container mx-auto px-4 py-8'}>
        <Switch>
          <Route exact path="/setup" component={Setup} />
          <Route exact path="/login" component={Login} />
          <Route exact path="/register" component={Register} />
          <Route exact path="/reset-password" component={ResetPassword} />
          <ProtectedRoute exact path="/" component={MyPage} />
          <ProtectedRoute exact path="/books" component={BrowseBooks} />
          <ProtectedRoute path="/my-page" component={MyPage} />
          <Route path="*">
            <Redirect to={isAuthenticated ? '/my-page/personal' : '/login'} />
          </Route>
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

