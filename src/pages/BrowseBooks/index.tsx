import React, { useState, useEffect, useCallback } from 'react';
import { booksAPI, loansAPI } from '../../services/api';
import { Book } from '../../types';
import { notify } from '../../utils/notifications';
import { useConfirmDialog } from '../../utils/confirmDialog';
import { useAuth } from '../../contexts/AuthContext';
import { useUserSearch } from '../../contexts/UserSearchContext';

const BrowseBooks: React.FC = () => {
  const { user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const { searchTerm } = useUserSearch();
  const { confirm, Dialog } = useConfirmDialog();

  console.log("=====BrowseBooks=====");

  const fetchBooks = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await booksAPI.getAll(searchTerm || undefined);
      // Only show approved books
      const approvedBooks = response.data.filter(book => book.isApproved);
      setBooks(approvedBooks);
    } catch (error) {
      console.error('Error fetching books:', error);
      notify.error('Error fetching books');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  const handleBorrow = async (book: Book): Promise<void> => {
    if (!user) {
      notify.error('You must be logged in to borrow books');
      return;
    }

    if (book.availableCopies <= 0) {
      notify.error('No available copies of this book');
      return;
    }

      confirm(
      'Borrow Book',
      `Are you sure you want to borrow "${book.title}"?`,
      async () => {
        try {
          await loansAPI.borrow(book.id);
          notify.success(`Successfully borrowed "${book.title}"`);
          fetchBooks(); // Refresh to update available copies
        } catch (error: any) {
          console.error('Error borrowing book:', error);
          notify.error(error.response?.data?.message || 'Error borrowing book');
        }
      }
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2">Browse Books</h2>
        <p className="text-gray-600">Browse and borrow from our collection of approved books</p>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : books.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          {searchTerm ? 'No books found matching your search' : 'No approved books available'}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <div key={book.id} className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow">
              <h3 className="text-xl font-semibold mb-2">{book.title}</h3>
              <p className="text-gray-600 mb-1">
                <span className="font-medium">Author:</span> {book.author}
              </p>
              <p className="text-gray-600 mb-1">
                <span className="font-medium">ISBN:</span> {book.isbn}
              </p>
              <p className="text-gray-600 mb-1">
                <span className="font-medium">Category:</span> {book.category}
              </p>
              {book.description && (
                <p className="text-gray-600 mb-3 text-sm line-clamp-2">{book.description}</p>
              )}
              <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-200">
                <span className={`px-3 py-1 rounded text-sm font-medium ${
                  book.availableCopies > 0
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {book.availableCopies > 0
                    ? `${book.availableCopies} available`
                    : 'Out of stock'}
                </span>
                <button
                  onClick={() => handleBorrow(book)}
                  disabled={book.availableCopies <= 0}
                  className={`px-4 py-2 rounded font-medium transition ${
                    book.availableCopies > 0
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  {book.availableCopies > 0 ? 'Borrow' : 'Unavailable'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog />
    </div>
  );
};

export default BrowseBooks;
