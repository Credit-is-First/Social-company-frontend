import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';
import { dashboardAPI, DashboardStats } from '../../services/api';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats>({
    totalBooks: 0,
    totalUsers: 0,
    activeLoans: 0,
    overdueLoans: 0,
    pendingLoans: 0,
    totalLoans: 0,
    returnedLoans: 0,
    availableBooks: 0,
    borrowedBooks: 0,
    booksByCategory: {},
    loansOverTime: [],
    recentLoans: [],
  });
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async (): Promise<void> => {
    try {
      const statsRes = await dashboardAPI.getStats();
      const statsData = statsRes.data;

      setStats({
        ...statsData,
      });
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Prepare data for charts
  const categoryChartData = Object.entries(stats.booksByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 8);

  // Counts come straight from the API now — the dashboard no longer downloads
  // the whole loan table to count it in the browser.
  const loanStatusData = [
    { name: 'Active', value: stats.activeLoans, color: '#3B82F6' },
    { name: 'Returned', value: stats.returnedLoans, color: '#10B981' },
    { name: 'Overdue', value: stats.overdueLoans, color: '#EF4444' },
  ];

  const bookAvailabilityData = [
    { name: 'Available', value: stats.availableBooks, color: '#10B981' },
    { name: 'Borrowed', value: stats.borrowedBooks, color: '#6366F1' },
  ];

  // The API already buckets the last 7 days; we only relabel for display.
  const loansOverTimeData = stats.loansOverTime.map(({ date, loans }) => {
    const [year, month, day] = date.split('-').map(Number);
    return {
      date: new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      loans,
    };
  });

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  return (
    <div className="container mx-auto px-6 py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-800 mb-2">Dashboard</h1>
        <p className="text-gray-600">Overview of your library management system</p>
      </div>
      
      {/* Main Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">Total Books</h3>
          <p className="text-3xl font-bold text-blue-600">{stats.totalBooks}</p>
            </div>
            <div className="text-4xl">📚</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">Available Books</h3>
          <p className="text-3xl font-bold text-green-600">{stats.availableBooks}</p>
            </div>
            <div className="text-4xl">✅</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">Total Users</h3>
          <p className="text-3xl font-bold text-purple-600">{stats.totalUsers}</p>
            </div>
            <div className="text-4xl">👥</div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-gray-600 text-sm font-medium mb-1">Active Loans</h3>
          <p className="text-3xl font-bold text-orange-600">{stats.activeLoans}</p>
        </div>
            <div className="text-4xl">📖</div>
          </div>
        </div>
      </div>

      {/* Secondary Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Borrowed Books</h3>
          <p className="text-2xl font-bold text-indigo-600">{stats.borrowedBooks}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Overdue Loans</h3>
          <p className="text-2xl font-bold text-red-600">{stats.overdueLoans}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Total Loans</h3>
          <p className="text-2xl font-bold text-gray-700">{stats.totalLoans}</p>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-gray-600 text-sm font-medium mb-2">Returned Loans</h3>
          <p className="text-2xl font-bold text-teal-600">{stats.returnedLoans}</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Books by Category Pie Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Books by Category</h3>
          {categoryChartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }: { name: string; percent: number }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No categories available</p>
          )}
        </div>

        {/* Loan Status Distribution Bar Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Loan Status Distribution</h3>
          {loanStatusData.some(item => item.value > 0) ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={loanStatusData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#3B82F6">
                  {loanStatusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No loan data available</p>
          )}
        </div>
      </div>

      {/* Second Row of Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Book Availability Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Book Availability</h3>
          {stats.totalBooks > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={bookAvailabilityData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={100} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#8884d8">
                  {bookAvailabilityData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No book data available</p>
          )}
        </div>

        {/* Loans Over Time Line Chart */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-xl font-semibold mb-4 text-gray-800">Loans Over Time (Last 7 Days)</h3>
          {loansOverTimeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={loansOverTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="loans" stroke="#3B82F6" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 text-center py-8">No loan history available</p>
          )}
        </div>
      </div>

      {/* Recent Loans List */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">Recent Loans</h3>
        {stats.recentLoans.length > 0 ? (
          <div className="space-y-3">
            {stats.recentLoans.map((loan) => (
              <div key={loan.id} className="border-b border-gray-200 pb-3 last:border-0">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">
                      {loan.bookTitle}
                    </p>
                    <p className="text-sm text-gray-600">
                      {loan.userName}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      loan.status === 'returned' ? 'bg-green-100 text-green-800' :
                      loan.status === 'overdue' ? 'bg-red-100 text-red-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {loan.status}
                    </span>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(loan.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500">No recent loans</p>
        )}
      </div>

      {/* System Status */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-xl font-semibold mb-4 text-gray-800">System Status</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${stats.overdueLoans > 0 ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <span className="text-gray-700">
              {stats.overdueLoans > 0 ? `${stats.overdueLoans} Overdue Loans` : 'All Loans Current'}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className={`w-3 h-3 rounded-full ${stats.availableBooks > 0 ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
            <span className="text-gray-700">
              {stats.availableBooks > 0 ? `${stats.availableBooks} Books Available` : 'No Books Available'}
            </span>
          </div>
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 rounded-full bg-blue-500"></div>
            <span className="text-gray-700">
              {stats.totalUsers} Registered Users
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
