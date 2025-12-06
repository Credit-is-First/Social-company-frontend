import React from 'react';
import { BrowserRouter as Router, Route, Switch, Link } from 'react-router-dom';
import Books from './components/Books';
import Users from './components/Users';
import Loans from './components/Loans';
import Dashboard from './components/Dashboard';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-blue-600 text-white shadow-lg">
          <div className="container mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <h1 className="text-2xl font-bold">📚 Library Management System</h1>
              <div className="flex space-x-4">
                <Link to="/" className="hover:text-blue-200 transition">Dashboard</Link>
                <Link to="/books" className="hover:text-blue-200 transition">Books</Link>
                <Link to="/users" className="hover:text-blue-200 transition">Users</Link>
                <Link to="/loans" className="hover:text-blue-200 transition">Loans</Link>
              </div>
            </div>
          </div>
        </nav>

        <main className="container mx-auto px-4 py-8">
          <Switch>
            <Route exact path="/" component={Dashboard} />
            <Route path="/books" component={Books} />
            <Route path="/users" component={Users} />
            <Route path="/loans" component={Loans} />
          </Switch>
        </main>
      </div>
    </Router>
  );
};

export default App;

