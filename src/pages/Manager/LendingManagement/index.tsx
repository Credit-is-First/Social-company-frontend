import React, { useState, useEffect } from 'react';
import { loansAPI } from '../../../services/api';
import { Loan, LoanStatus } from '../../../types';
import LoanModal from './components/LoanModal';
import { notify } from '../../../utils/notifications';
import { useConfirmDialog } from '../../../utils/confirmDialog';

type FilterType = 'all' | 'active';

const LendingManagement: React.FC = () => {
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const { confirm, Dialog } = useConfirmDialog();

  useEffect(() => {
    fetchLoans();
  }, [filter]);

  const fetchLoans = async (): Promise<void> => {
    try {
      setLoading(true);
      let response;
      if (filter === 'active') {
        response = await loansAPI.getActive();
      } else {
        response = await loansAPI.getAll();
      }
      setLoans(response.data);
    } catch (error) {
      console.error('Error fetching loans:', error);
      notify.error('Error fetching loans');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = (): void => {
    setEditingLoan(null);
    setIsModalOpen(true);
  };

  const handleReturn = async (loan: Loan): Promise<void> => {
    confirm(
      'Return Loan',
      'Mark this loan as returned?',
      async () => {
        try {
          await loansAPI.update(loan.id, {
            returnDate: new Date().toISOString().split('T')[0],
            status: 'returned' as LoanStatus,
          });
          notify.success('Loan marked as returned');
          fetchLoans();
        } catch (error) {
          console.error('Error returning loan:', error);
          notify.error('Error returning loan');
        }
      }
    );
  };

  const handleDelete = async (id: string): Promise<void> => {
    confirm(
      'Delete Loan',
      'Are you sure you want to delete this loan? This action cannot be undone.',
      async () => {
        try {
          await loansAPI.delete(id);
          notify.success('Loan deleted successfully');
          fetchLoans();
        } catch (error) {
          console.error('Error deleting loan:', error);
          notify.error('Error deleting loan');
        }
      },
      { confirmText: 'Delete', confirmColor: 'red' }
    );
  };

  const handleModalClose = (): void => {
    setIsModalOpen(false);
    setEditingLoan(null);
    fetchLoans();
  };

  const getStatusColor = (status: LoanStatus): string => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'returned':
        return 'bg-gray-100 text-gray-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Lending Management</h2>
      </div>
      <div className="flex justify-between items-center mb-6">
        <div></div>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          + New Loan
        </button>
      </div>

      <div className="mb-4 flex space-x-2">
        <button
          onClick={() => setFilter('all')}
          className={`px-4 py-2 rounded ${
            filter === 'all'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          All Loans
        </button>
        <button
          onClick={() => setFilter('active')}
          className={`px-4 py-2 rounded ${
            filter === 'active'
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          Active Loans
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Book</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Borrow Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Return Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loans.map((loan) => (
                <tr key={loan.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {loan.book ? loan.book.title : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {loan.user ? loan.user.name : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(loan.borrowDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {new Date(loan.dueDate).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {loan.returnDate
                      ? new Date(loan.returnDate).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded text-xs ${getStatusColor(loan.status)}`}>
                      {loan.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm space-x-2">
                    {loan.status === 'active' && (
                      <button
                        onClick={() => handleReturn(loan)}
                        className="text-green-600 hover:text-green-800"
                      >
                        Return
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(loan.id)}
                      className="text-red-600 hover:text-red-800"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {loans.length === 0 && (
            <div className="text-center py-8 text-gray-500">No loans found</div>
          )}
        </div>
      )}

      {isModalOpen && (
        <LoanModal
          loan={editingLoan}
          onClose={handleModalClose}
        />
      )}
      <Dialog />
    </div>
  );
};

export default LendingManagement;

