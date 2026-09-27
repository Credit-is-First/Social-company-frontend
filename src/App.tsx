import React, { useEffect } from 'react';
import { BrowserRouter as Router, Route, Switch, Redirect } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ToastProvider, useToast } from './contexts/ToastContext';
import { UserSearchProvider } from './contexts/UserSearchContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ToastContainer from './components/ToastContainer';
import { setToastContext } from './utils/notifications';
import AuthRoute from './components/AuthRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';
import UserLayout from './layouts/UserLayout';
import ManagerLayout from './layouts/ManagerLayout';
import MyPage from './pages/MyPage';
import Dashboard from './pages/Dashboard';
import BrowseBooks from './pages/BrowseBooks';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import ResetPassword from './pages/Auth/ResetPassword';
import Setup from './pages/Auth/Setup';
import NotFound from './pages/NotFound';
import Manager from './pages/Manager';
import RolesManagement from './pages/Manager/RolesManagement';
import GroupsManagement from './pages/Manager/GroupsManagement';
import UsersManagement from './pages/Manager/UsersManagement';
import BooksManagement from './pages/Manager/BooksManagement';
import LendingManagement from './pages/Manager/LendingManagement';


const AppContent: React.FC = () => {
  const { needsSetup, checkingSetup } = useAuth();
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
        <Switch>
        {/* Auth routes - no layout */}
          <Route exact path="/setup">
            {needsSetup ? <Setup /> : <Redirect to="/login" />}
          </Route>
          <Route exact path="/login" component={Login} />
          <Route exact path="/register" component={Register} />
          <Route exact path="/reset-password" component={ResetPassword} />
        
        {/* Manager routes - nested under ManagerLayout */}
        <AuthRoute path="/manager">
          <ManagerLayout>
            <Switch>
              <Route exact path="/manager" component={Manager} />
              <RoleProtectedRoute exact path="/manager/roles" role="role:read" component={RolesManagement} />
              <RoleProtectedRoute exact path="/manager/groups" role="group:read" component={GroupsManagement} />
              <RoleProtectedRoute exact path="/manager/users" role="user:read" component={UsersManagement} />
              <RoleProtectedRoute exact path="/manager/books" role="book:read" component={BooksManagement} />
              <RoleProtectedRoute exact path="/manager/lending" role="book_lending:read" component={LendingManagement} />
            </Switch>
          </ManagerLayout>
        </AuthRoute>
        
        {/* User routes - nested under UserLayout */}
        <AuthRoute path={['/', '/books', '/my-page']}>
          <UserSearchProvider>
            <UserLayout>
              <Switch>
                <Route exact path="/" component={Dashboard} />
                <Route exact path="/books" component={BrowseBooks} />
                <Route path="/my-page" component={MyPage} />
              </Switch>
            </UserLayout>
          </UserSearchProvider>
        </AuthRoute>
        
        {/* 404 */}
          <Route path="*" component={NotFound} />
        </Switch>
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <ToastProvider>
        <AuthProvider>
          <NotificationProvider>
            <AppContent />
          </NotificationProvider>
        </AuthProvider>
      </ToastProvider>
    </Router>
  );
};

export default App;

