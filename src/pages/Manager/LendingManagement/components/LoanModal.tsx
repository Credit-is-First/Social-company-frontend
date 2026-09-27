import React, { useState, useEffect, useCallback, ChangeEvent, FormEvent } from 'react';
import { loansAPI, booksAPI, usersAPI } from '../../../../services/api';
import { Book, User, CreateLoanDto } from '../../../../types';
import { notify } from '../../../../utils/notifications';
import { dateOnlyFromToday, todayDateOnly } from '../../../../utils/dates';

interface LoanModalProps {
  onClose: () => void;
}

interface LoanFormData {
  bookId: string;
  userId: string;
  borrowDate: string;
  dueDate: string;
}

const BOOK_PICKER_LIMIT = 100;

// Local calendar dates: toISOString() would give tomorrow's date every evening west of UTC.
const todayISO = (): string => todayDateOnly();

const defaultDueDateISO = (): string => dateOnlyFromToday(14);

const LoanModal: React.FC<LoanModalProps> = ({ onClose }) => {
  const [formData, setFormData] = useState<LoanFormData>({
    bookId: '',
    userId: '',
    borrowDate: todayISO(),
    dueDate: defaultDueDateISO(),
  });
  const [books, setBooks] = useState<Book[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [bookSearch, setBookSearch] = useState<string>('');
  const [usersError, setUsersError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Only approved titles can be lent, and the server enforces the same rule.
  const fetchBooks = useCallback(async (): Promise<void> => {
    try {
      const response = await booksAPI.getPaginated({
        status: 'approved',
        limit: BOOK_PICKER_LIMIT,
        search: bookSearch || undefined,
      });
      setBooks(response.data.data.filter(book => book.availableCopies > 0));
    } catch (error) {
      console.error('Error fetching books:', error);
      notify.error('Error loading books');
    }
  }, [bookSearch]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  useEffect(() => {
    const fetchUsers = async (): Promise<void> => {
      try {
        const response = await usersAPI.getAll();
        setUsers(response.data);
      } catch (error: any) {
        console.error('Error fetching users:', error);
        // Creating a loan needs the user list, which is gated behind user:read.
        // Say so instead of failing with an empty dropdown.
        setUsersError(
          error.response?.status === 403
            ? 'You need the user:read permission to look up borrowers.'
            : 'Error loading users.'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    if (formData.dueDate < formData.borrowDate) {
      notify.error('Due date cannot be earlier than the borrow date');
      return;
    }

    try {
      setIsSubmitting(true);
      const loanData: CreateLoanDto = {
        bookId: formData.bookId,
        userId: formData.userId,
        borrowDate: formData.borrowDate,
        dueDate: formData.dueDate,
      };
      await loansAPI.create(loanData);
      notify.success('Loan created successfully');
      onClose();
    } catch (error: any) {
      console.error('Error saving loan:', error);
      notify.error(error.response?.data?.message || 'Error saving loan');
    } finally {
      setIsSubmitting(false);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-2xl font-bold">Create New Loan</h3>
          <p className="text-sm text-gray-600 mt-1">
            The book is issued immediately and one copy is reserved.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Find a book</label>
              <input
                type="text"
                value={bookSearch}
                onChange={(e) => setBookSearch(e.target.value)}
                placeholder="Search by title, author, ISBN or category..."
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Book *</label>
              <select
                name="bookId"
                value={formData.bookId}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a book</option>
                {books.map((book) => (
                  <option key={book.id} value={book.id}>
                    {book.title} by {book.author} ({book.availableCopies} available)
                  </option>
                ))}
              </select>
              {books.length === BOOK_PICKER_LIMIT && (
                <p className="mt-1 text-xs text-gray-500">
                  Showing the first {BOOK_PICKER_LIMIT} matches — refine your search to narrow it down.
                </p>
              )}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">User *</label>
              <select
                name="userId"
                value={formData.userId}
                onChange={handleChange}
                required
                disabled={!!usersError}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              >
                <option value="">Select a user</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.email})
                  </option>
                ))}
              </select>
              {usersError && <p className="mt-1 text-sm text-red-600">{usersError}</p>}
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
                min={formData.borrowDate}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !!usersError}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoanModal;
