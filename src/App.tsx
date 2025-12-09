import React from 'react';
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

const AppContent: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();

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
          <Route exact path="/login" component={Login} />
          <Route exact path="/register" component={Register} />
          <Route exact path="/reset-password" component={ResetPassword} />
          <ProtectedRoute exact path="/" component={Dashboard} />
          <ProtectedRoute path="/books" component={Books} />
          <ProtectedRoute path="/users" component={Users} roles={['admin', 'librarian']} />
          <ProtectedRoute path="/loans" component={Loans} roles={['admin', 'librarian']} />
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

