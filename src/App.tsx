import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch, Link, Redirect } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Books from './components/Books';
import Users from './components/Users';
import Loans from './components/Loans';
import Dashboard from './components/Dashboard';
import Login from './components/Login';
import Register from './components/Register';
import ResetPassword from './components/ResetPassword';
import ProtectedRoute from './components/ProtectedRoute';
import Admin from './components/Admin';
import Setup from './components/Setup';
import { usersAPI } from './services/api';

const AppContent: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [checkingSetup, setCheckingSetup] = useState<boolean>(true);

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
              <h1 className="text-2xl font-bold">📚 Library Management System</h1>
              <div className="flex items-center space-x-4">
                <Link to="/" className="hover:text-blue-200 transition">Dashboard</Link>
                <Link to="/books" className="hover:text-blue-200 transition">Books</Link>
                {(user?.role === 'admin' || user?.role === 'librarian') && (
                  <>
                    <Link to="/users" className="hover:text-blue-200 transition">Users</Link>
                    <Link to="/loans" className="hover:text-blue-200 transition">Loans</Link>
                  </>
                )}
                {user?.role === 'admin' && (
                  <Link to="/admin" className="hover:text-blue-200 transition">Admin</Link>
                )}
                <div className="flex items-center space-x-2">
                  <span className="text-sm">Welcome, {user?.name}</span>
                  <span className="text-xs bg-blue-500 px-2 py-1 rounded">{user?.role}</span>
                </div>
                <button
                  onClick={logout}
                  className="bg-blue-700 hover:bg-blue-800 px-4 py-2 rounded transition"
                >
                  Logout
                </button>
              </div>
            </div>
          </div>
        </nav>
      )}

      <main className={isAuthenticated ? 'container mx-auto px-4 py-8' : ''}>
        <Switch>
          <Route exact path="/setup" component={Setup} />
          <Route exact path="/login" component={Login} />
          <Route exact path="/register" component={Register} />
          <Route exact path="/reset-password" component={ResetPassword} />
          <ProtectedRoute exact path="/" component={Dashboard} />
          <ProtectedRoute path="/books" component={Books} />
          <ProtectedRoute path="/users" component={Users} roles={['admin', 'librarian']} />
          <ProtectedRoute path="/loans" component={Loans} roles={['admin', 'librarian']} />
          <ProtectedRoute path="/admin" component={Admin} roles={['admin']} />
          <Route path="*">
            <Redirect to={isAuthenticated ? '/' : '/login'} />
          </Route>
        </Switch>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
};

export default App;

