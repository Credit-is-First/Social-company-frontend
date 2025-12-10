import React, { useState, useEffect } from 'react';
import { booksAPI } from '../../services/api';
import { Book } from '../../types';
import BookModal from './components/BookModal';
import { notify } from '../../utils/notifications';
import { useConfirmDialog } from '../../utils/confirmDialog';
import { useAuth } from '../../contexts/AuthContext';

const Books: React.FC = () => {
  const { hasRole, user } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [showPendingOnly, setShowPendingOnly] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const { confirm, Dialog } = useConfirmDialog();

  const fetchBooks = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await booksAPI.getAll(searchTerm || undefined);
      setAllBooks(response.data);
      
      // Filter books based on user role
      if (hasRole('admin') || hasRole('librarian')) {
        // Admins and librarians see all books
        if (showPendingOnly) {
          setBooks(response.data.filter(book => !book.isApproved));
        } else {
          setBooks(response.data);
        }
      } else {
        // Regular users only see approved books
        setBooks(response.data.filter(book => book.isApproved));
      }
    } catch (error) {
      console.error('Error fetching books:', error);
      notify.error('Error fetching books');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBooks();
  }, [searchTerm, showPendingOnly]);

  const handleCreate = (): void => {
    setEditingBook(null);
    setIsModalOpen(true);
  };

  const handleEdit = (book: Book): void => {
    setEditingBook(book);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string): Promise<void> => {
    confirm(
      'Delete Book',
      'Are you sure you want to delete this book? This action cannot be undone.',
      async () => {
        try {
          await booksAPI.delete(id);
          notify.success('Book deleted successfully');
          fetchBooks();
        } catch (error) {
          console.error('Error deleting book:', error);
          notify.error('Error deleting book');
        }
      },
      { confirmText: 'Delete', confirmColor: 'red' }
    );
  };

  const handleModalClose = (): void => {
    setIsModalOpen(false);
    setEditingBook(null);
    fetchBooks();
  };

  const handleApprove = async (id: string): Promise<void> => {
    confirm(
      'Approve Book',
      'Are you sure you want to approve this book?',
      async () => {
        try {
          await booksAPI.approve(id);
          notify.success('Book approved successfully');
          fetchBooks();
        } catch (error: any) {
          console.error('Error approving book:', error);
          notify.error(error.response?.data?.message || 'Error approving book');
        }
      }
    );
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Manage Books</h2>
        <p className="text-gray-600">Add, edit, delete, and approve books in the library</p>
      </div>
      <div className="flex justify-between items-center mb-6">
        <div></div>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          + Add Book
        </button>
      </div>

      <div className="mb-4 flex space-x-2">
        <input
          type="text"
          placeholder="Search books by title, author, ISBN, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {(hasRole('admin') || hasRole('librarian')) && (
          <button
            onClick={() => setShowPendingOnly(!showPendingOnly)}
            className={`px-4 py-2 rounded transition ${
              showPendingOnly
                ? 'bg-yellow-600 text-white hover:bg-yellow-700'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {showPendingOnly ? 'Show All' : 'Show Pending'}
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <div key={book.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-semibold">{book.title}</h3>
                {!book.isApproved && (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                    Pending Approval
                  </span>
                )}
                {book.isApproved && (
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    Approved
                  </span>
                )}
              </div>
              <p className="text-gray-600 mb-1">Author: {book.author}</p>
              <p className="text-gray-600 mb-1">ISBN: {book.isbn}</p>
              <p className="text-gray-600 mb-1">Category: {book.category}</p>
              <div className="flex justify-between items-center mt-4">
                <span className={`px-3 py-1 rounded text-sm ${
                  book.availableCopies > 0
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {book.availableCopies} / {book.totalCopies} available
                </span>
                <div className="flex flex-col items-end space-y-1">
                  <div className="space-x-2">
                    {(hasRole('admin') || hasRole('librarian')) && (
                      <button
                        onClick={() => handleEdit(book)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Edit
                      </button>
                    )}
                    {(hasRole('admin') || hasRole('librarian')) && (
                      <button
                        onClick={() => handleDelete(book.id)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                  {!book.isApproved && hasRole('librarian') && (
                    <button
                      onClick={() => handleApprove(book.id)}
                      className="text-green-600 hover:text-green-800 text-sm font-medium"
                    >
                      ✓ Approve
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <BookModal
          book={editingBook}
          onClose={handleModalClose}
        />
      )}
      <Dialog />
    </div>
  );
};

export default Books;
