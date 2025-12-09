import React, { useState, useEffect } from 'react';
import { booksAPI, usersAPI, loansAPI } from '../../services/api';
import { Book, User, Loan } from '../../types';

interface Stats {
  totalBooks: number;
  totalUsers: number;
  activeLoans: number;
  availableBooks: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<Stats>({
    totalBooks: 0,
    totalUsers: 0,
    activeLoans: 0,
    availableBooks: 0,
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async (): Promise<void> => {
    try {
      const [booksRes, usersRes, loansRes] = await Promise.all([
        booksAPI.getAll(),
        usersAPI.getAll(),
        loansAPI.getActive(),
      ]);

      const totalBooks = booksRes.data.length;
      const totalUsers = usersRes.data.length;
      const activeLoans = loansRes.data.length;
      const availableBooks = booksRes.data.reduce(
        (sum: number, book: Book) => sum + book.availableCopies,
        0
      );

      setStats({
        totalBooks,
        totalUsers,
        activeLoans,
        availableBooks,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  return (
    <div>
      <h2 className="text-3xl font-bold mb-6">Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Books</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.totalBooks}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Available Books</h3>
          <p className="text-3xl font-bold text-green-600">{stats.availableBooks}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Users</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.totalUsers}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Active Loans</h3>
          <p className="text-3xl font-bold text-orange-600">{stats.activeLoans}</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-xl font-semibold mb-4">Welcome to Library Management System</h3>
        <p className="text-gray-600">
          Manage your electronic library efficiently. Add books, register users, and track loans all in one place.
        </p>
      </div>
    </div>
  );
};

export default Dashboard;
