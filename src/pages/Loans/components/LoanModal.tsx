import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { loansAPI, booksAPI, usersAPI } from '../../../services/api';
import { Loan, Book, User, CreateLoanDto } from '../../../types';
import { notify } from '../../../utils/notifications';

interface LoanModalProps {
  loan: Loan | null;
  onClose: () => void;
}

interface LoanFormData {
  bookId: string;
  userId: string;
  borrowDate: string;
  dueDate: string;
}

const LoanModal: React.FC<LoanModalProps> = ({ loan, onClose }) => {
  const [formData, setFormData] = useState<LoanFormData>({
    bookId: '',
    userId: '',
    borrowDate: new Date().toISOString().split('T')[0],
    dueDate: '',
  });
  const [books, setBooks] = useState<Book[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (loan) {
      setFormData({
        bookId: loan.bookId.toString() || '',
        userId: loan.userId.toString() || '',
        borrowDate: loan.borrowDate ? loan.borrowDate.split('T')[0] : new Date().toISOString().split('T')[0],
        dueDate: loan.dueDate ? loan.dueDate.split('T')[0] : '',
      });
    } else {
      // Set default due date to 14 days from borrow date
      const defaultDueDate = new Date();
      defaultDueDate.setDate(defaultDueDate.getDate() + 14);
      setFormData(prev => ({
        ...prev,
        dueDate: defaultDueDate.toISOString().split('T')[0],
      }));
    }
  }, [loan]);

  const fetchData = async (): Promise<void> => {
    try {
      setLoading(true);
      const [booksRes, usersRes] = await Promise.all([
        booksAPI.getAll(),
        usersAPI.getAll(),
      ]);
      setBooks(booksRes.data.filter(book => book.availableCopies > 0));
      setUsers(usersRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      notify.error('Error loading data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    try {
      if (loan) {
        await loansAPI.update(loan.id, {
          returnDate: formData.borrowDate,
        });
      } else {
        const loanData: CreateLoanDto = {
          bookId: formData.bookId,
          userId: formData.userId,
          borrowDate: formData.borrowDate,
          dueDate: formData.dueDate,
        };
        await loansAPI.create(loanData);
      }
      notify.success(loan ? 'Loan updated successfully' : 'Loan created successfully');
      onClose();
    } catch (error: any) {
      console.error('Error saving loan:', error);
      notify.error(error.response?.data?.message || 'Error saving loan');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <h3 className="text-2xl font-bold mb-4">
          {loan ? 'Edit Loan' : 'Create New Loan'}
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Book *</label>
            <select
              name="bookId"
              value={formData.bookId}
              onChange={handleChange}
              required
              disabled={!!loan}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a book</option>
              {books.map((book) => (
                <option key={book.id} value={book.id}>
                  {book.title} by {book.author} ({book.availableCopies} available)
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">User *</label>
            <select
              name="userId"
              value={formData.userId}
              onChange={handleChange}
              required
              disabled={!!loan}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a user</option>
              {users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name} ({user.email})
                </option>
              ))}
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Borrow Date *</label>
            <input
              type="date"
              name="borrowDate"
              value={formData.borrowDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Due Date *</label>
            <input
              type="date"
              name="dueDate"
              value={formData.dueDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {loan ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoanModal;
