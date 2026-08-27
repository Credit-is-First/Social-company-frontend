import React, { useState, useEffect, useCallback } from 'react';
import { booksAPI } from '../../../services/api';
import { Book } from '../../../types';
import { notify } from '../../../utils/notifications';

const FAVORITES_KEY = 'favoriteBooks';

const readFavoriteIds = (): string[] => {
  try {
    const stored = localStorage.getItem(FAVORITES_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.filter((id: any) => typeof id === 'string') : [];
  } catch (error) {
    console.error('Could not read favorites from storage:', error);
    return [];
  }
};

const Favorite: React.FC = () => {
  const [favoriteBooks, setFavoriteBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch exactly the favourited books instead of downloading the whole
  // catalogue and intersecting it in the browser.
  const loadFavorites = useCallback(async (): Promise<void> => {
    const favoriteIds = readFavoriteIds();

    if (favoriteIds.length === 0) {
      setFavoriteBooks([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const responses = await Promise.all(
        favoriteIds.map(id =>
          booksAPI
            .getById(id)
            // A favourite may have been deleted or unpublished since it was saved.
            .then(response => response.data)
            .catch(() => null)
        )
      );

      const found = responses.filter((book): book is Book => book !== null);
      setFavoriteBooks(found);

      // Drop dangling ids so the list stops shrinking on every visit.
      if (found.length !== favoriteIds.length) {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify(found.map(book => book.id)));
      }
    } catch (error) {
      console.error('Error fetching favorite books:', error);
      notify.error('Error fetching your favorite books');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const toggleFavorite = (bookId: string): void => {
    let favoriteIds = readFavoriteIds();

    if (favoriteIds.indexOf(bookId) !== -1) {
      favoriteIds = favoriteIds.filter(id => id !== bookId);
      notify.success('Removed from favorites');
    } else {
      favoriteIds = favoriteIds.concat(bookId);
      notify.success('Added to favorites');
    }

    localStorage.setItem(FAVORITES_KEY, JSON.stringify(favoriteIds));
    setFavoriteBooks(current => current.filter(book => favoriteIds.indexOf(book.id) !== -1));
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
