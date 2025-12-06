import React, { useState, useEffect } from 'react';
import { booksAPI } from '../services/api';
import { Book } from '../types';
import BookModal from './BookModal';

const Books: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);

  useEffect(() => {
    fetchBooks();
  }, [searchTerm]);

  const fetchBooks = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await booksAPI.getAll(searchTerm || undefined);
      setBooks(response.data);
    } catch (error) {
      console.error('Error fetching books:', error);
      alert('Error fetching books');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = (): void => {
    setEditingBook(null);
    setIsModalOpen(true);
  };

  const handleEdit = (book: Book): void => {
    setEditingBook(book);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: number): Promise<void> => {
    if (window.confirm('Are you sure you want to delete this book?')) {
      try {
        await booksAPI.delete(id);
        fetchBooks();
      } catch (error) {
        console.error('Error deleting book:', error);
        alert('Error deleting book');
      }
    }
  };

  const handleModalClose = (): void => {
    setIsModalOpen(false);
    setEditingBook(null);
    fetchBooks();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold">Books</h2>
        <button
          onClick={handleCreate}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
        >
          + Add Book
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search books by title, author, ISBN, or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {books.map((book) => (
            <div key={book.id} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-2">{book.title}</h3>
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
                <div className="space-x-2">
                  <button
                    onClick={() => handleEdit(book)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(book.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
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
    </div>
  );
};

export default Books;

