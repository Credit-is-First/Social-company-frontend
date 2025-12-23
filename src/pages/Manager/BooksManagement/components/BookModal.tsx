import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { booksAPI } from '../../../../services/api';
import { Book, CreateBookDto } from '../../../../types';
import { notify } from '../../../../utils/notifications';

interface BookModalProps {
  book: Book | null;
  onClose: () => void;
}

interface BookFormData {
  title: string;
  author: string;
  isbn: string;
  category: string;
  totalCopies: number;
  description: string;
  publishedDate: string;
  isEbook: boolean;
}

const BookModal: React.FC<BookModalProps> = ({ book, onClose }) => {
  const [formData, setFormData] = useState<BookFormData>({
    title: '',
    author: '',
    isbn: '',
    category: '',
    totalCopies: 1,
    description: '',
    publishedDate: '',
    isEbook: false,
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    if (book) {
      setFormData({
        title: book.title || '',
        author: book.author || '',
        isbn: book.isbn || '',
        category: book.category || '',
        totalCopies: book.totalCopies || 1,
        description: book.description || '',
        publishedDate: book.publishedDate ? book.publishedDate.split('T')[0] : '',
        isEbook: book.isEbook || false,
      });
      setSelectedFile(null);
    }
  }, [book]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : (name === 'totalCopies' ? parseInt(value) || 1 : value),
    });
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    
    // Prevent double submission
    if (isSubmitting) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      const bookData: CreateBookDto = {
        title: formData.title,
        author: formData.author,
        isbn: formData.isbn,
        category: formData.category,
        totalCopies: formData.totalCopies,
        description: formData.description || undefined,
        publishedDate: formData.publishedDate || undefined,
        isEbook: formData.isEbook,
      };

      if (book) {
        await booksAPI.update(book.id, bookData, selectedFile || undefined);
      } else {
        await booksAPI.create(bookData, selectedFile || undefined);
      }
      notify.success(book ? 'Book updated successfully' : 'Book created successfully');
      onClose();
    } catch (error: any) {
      console.error('Error saving book:', error);
      notify.error(error.response?.data?.message || 'Error saving book');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-md flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-2xl font-bold">
            {book ? 'Edit Book' : 'Add New Book'}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Title *</label>
            <input
              type="text"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Author *</label>
            <input
              type="text"
              name="author"
              value={formData.author}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">ISBN *</label>
            <input
              type="text"
              name="isbn"
              value={formData.isbn}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Category *</label>
            <input
              type="text"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Total Copies *</label>
            <input
              type="number"
              name="totalCopies"
              value={formData.totalCopies}
              onChange={handleChange}
              min="1"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Published Date</label>
            <input
              type="date"
              name="publishedDate"
              value={formData.publishedDate}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="flex items-center space-x-2">
              <input
                type="checkbox"
                name="isEbook"
                checked={formData.isEbook}
                onChange={handleChange}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm font-medium">E-book</span>
            </label>
          </div>

          {formData.isEbook && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">E-book File (PDF, EPUB, MOBI)</label>
              <input
                type="file"
                accept=".pdf,.epub,.mobi,application/pdf,application/epub+zip,application/x-mobipocket-ebook"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {book?.filePath && !selectedFile && (
                <p className="mt-2 text-sm text-gray-600">
                  Current file: <a href={`http://localhost:3001${book.filePath}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">View current file</a>
                </p>
              )}
            </div>
          )}

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
              disabled={isSubmitting}
              className={`px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 ${
                isSubmitting ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isSubmitting ? (book ? 'Updating...' : 'Creating...') : (book ? 'Update' : 'Create')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BookModal;

