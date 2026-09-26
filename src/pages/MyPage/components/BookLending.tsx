import React, { useState, useEffect } from 'react';
import { loansAPI } from '../../../services/api';
import { Loan, LoanStatus } from '../../../types';
import { notify } from '../../../utils/notifications';
import { useAuth } from '../../../contexts/AuthContext';
import { useConfirmDialog } from '../../../utils/confirmDialog';

const BookLending: React.FC = () => {
  const { user } = useAuth();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<'all' | 'active' | 'returned'>('all');
  const { confirm, Dialog } = useConfirmDialog();

  useEffect(() => {
    if (user) {
      fetchMyLoans();
    }
  }, [user]);

  const fetchMyLoans = async (): Promise<void> => {
    try {
      setLoading(true);
      // Use the new endpoint that doesn't require roles
      const response = await loansAPI.getMyLoans();
      setLoans(response.data);
    } catch (error) {
      console.error('Error fetching loans:', error);
      notify.error('Error fetching your loans');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: LoanStatus): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'returned':
        return 'bg-gray-100 text-gray-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'declined':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const isOverdue = (dueDate: string): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDate);
    due.setHours(0, 0, 0, 0);
    return due < today;
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading your loans...</p>
      </div>
    );
  }

  const handleCancelLoan = async (loanId: string): Promise<void> => {
    confirm(
      'Cancel Loan',
      'Are you sure you want to cancel this loan?',
      async () => {
        try {
          await loansAPI.cancelMyLoan(loanId);
          notify.success('Loan cancelled successfully');
          fetchMyLoans();
        } catch (error: any) {
          console.error('Error cancelling loan:', error);
          notify.error(error.response?.data?.message || 'Error cancelling loan');
        }
      }
    );
  };

  const filteredLoans = filter === 'returned' 
    ? loans.filter(loan => loan.status === 'returned' || loan.returnDate)
    : filter === 'active'
    ? loans.filter(loan => loan.status === 'active' && !loan.returnDate)
    : loans;

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Book Lending</h2>
        <p className="text-gray-600">View and manage your book loans</p>
      </div>

      <div className="mb-4 flex space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded transition ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          All Loans
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded transition ${
            filter === 'active'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Active Loans
        </button>
        <button
          onClick={() => setFilter('returned')}
          className={`px-4 py-2 rounded transition ${
            filter === 'returned'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Returned Loans
        </button>
      </div>

      {filteredLoans.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 text-lg">No loans found</p>
          <p className="text-gray-400 text-sm mt-2">
            {filter === 'all' 
              ? 'You haven\'t borrowed any books yet'
              : `No ${filter} loans`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Book</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Borrow Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredLoans.map((loan) => {
                const overdue = isOverdue(loan.dueDate) && loan.status === 'active';
                return (
                  <tr key={loan.id} className={overdue ? 'bg-red-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {loan.book ? loan.book.title : 'N/A'}
                      </div>
                      {loan.book && (
                        <div className="text-sm text-gray-500">
                          by {loan.book.author}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(loan.borrowDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${overdue ? 'text-red-600 font-semibold' : 'text-gray-900'}`}>
                        {new Date(loan.dueDate).toLocaleDateString()}
                      </div>
                      {overdue && (
                        <div className="text-xs text-red-500">Overdue</div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {loan.returnDate
                        ? new Date(loan.returnDate).toLocaleDateString()
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs ${getStatusColor(loan.status)}`}>
                          {overdue ? 'Overdue' : loan.status}
                        </span>
                        {/* Only a request can be withdrawn; an active loan ends when the book is returned. */}
                        {loan.status === 'pending' && (
                          <button
                            onClick={() => handleCancelLoan(loan.id)}
                            className="text-red-600 hover:text-red-800 text-sm font-medium"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <Dialog />
    </div>
  );
};

export default BookLending;
