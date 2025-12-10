import React, { useState, useEffect } from 'react';
import { booksAPI } from '../../../services/api';
import { Book } from '../../../types';
import { notify } from '../../../utils/notifications';

const Favorite: React.FC = () => {
  const [favoriteBooks, setFavoriteBooks] = useState<Book[]>([]);
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchBooks();
    loadFavorites();
  }, []);

  const fetchBooks = async (): Promise<void> => {
    try {
      const response = await booksAPI.getAll();
      setAllBooks(response.data);
    } catch (error) {
      console.error('Error fetching books:', error);
      notify.error('Error fetching books');
    }
  };

  const loadFavorites = (): void => {
    const favorites = localStorage.getItem('favoriteBooks');
    if (favorites) {
      const favoriteIds = JSON.parse(favorites);
      const favoriteBooksList = allBooks.filter(book => favoriteIds.includes(book.id));
      setFavoriteBooks(favoriteBooksList);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (allBooks.length > 0) {
      loadFavorites();
    }
  }, [allBooks]);

  const toggleFavorite = (bookId: string): void => {
    const favorites = localStorage.getItem('favoriteBooks');
    let favoriteIds: string[] = favorites ? JSON.parse(favorites) : [];
    
    if (favoriteIds.includes(bookId)) {
      favoriteIds = favoriteIds.filter(id => id !== bookId);
      notify.success('Removed from favorites');
    } else {
      favoriteIds.push(bookId);
      notify.success('Added to favorites');
    }
    
    localStorage.setItem('favoriteBooks', JSON.stringify(favoriteIds));
    const favoriteBooksList = allBooks.filter(book => favoriteIds.includes(book.id));
    setFavoriteBooks(favoriteBooksList);
  };

  const isFavorite = (bookId: string): boolean => {
    const favorites = localStorage.getItem('favoriteBooks');
    if (!favorites) return false;
    const favoriteIds = JSON.parse(favorites);
    return favoriteIds.includes(bookId);
  };

  if (loading) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading favorites...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Favorite Books</h2>
        <p className="text-gray-600">Manage your favorite books</p>
      </div>

      {favoriteBooks.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-500 text-lg">No favorite books yet</p>
          <p className="text-gray-400 text-sm mt-2">Browse books and add them to your favorites</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {favoriteBooks.map((book) => (
            <div key={book.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-xl font-semibold flex-1">{book.title}</h3>
                <button
                  onClick={() => toggleFavorite(book.id)}
                  className="text-yellow-500 hover:text-yellow-600 text-2xl"
                >
                  ⭐
                </button>
              </div>
              <p className="text-gray-600 mb-1">Author: {book.author}</p>
              <p className="text-gray-600 mb-1">ISBN: {book.isbn}</p>
              <p className="text-gray-600 mb-1">Category: {book.category}</p>
              <div className="mt-4">
                <span className={`px-3 py-1 rounded text-sm ${
                  book.availableCopies > 0
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {book.availableCopies} / {book.totalCopies} available
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Favorite;
