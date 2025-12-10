import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch, Link, Redirect } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import ToastContainer from './components/ToastContainer';
import { setToastContext } from './utils/notifications';
import ProtectedRoute from './components/ProtectedRoute';
import UserAvatar from './components/UserAvatar';
import MyPage from './pages/MyPage';
import Dashboard from './pages/Dashboard';
import BrowseBooks from './pages/BrowseBooks';
import Login from './pages/Login';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Setup from './pages/Setup';
import NotFound from './pages/NotFound';

const AppContent: React.FC = () => {
  const { isAuthenticated, needsSetup, checkingSetup } = useAuth();
  const { showToast, toasts, removeToast } = useToast();

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
      {isAuthenticated && (
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
                  Dashboard
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
          <Route exact path="/setup">
            {needsSetup ? <Setup /> : <Redirect to="/login" />}
          </Route>
          <Route exact path="/login" component={Login} />
          <Route exact path="/register" component={Register} />
          <Route exact path="/reset-password" component={ResetPassword} />
          <ProtectedRoute exact path="/" component={Dashboard} />
          <ProtectedRoute exact path="/books" component={BrowseBooks} />
          <ProtectedRoute path="/my-page" component={MyPage} />
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

