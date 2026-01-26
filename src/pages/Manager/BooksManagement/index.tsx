import React, { useState, useEffect, useCallback, useRef } from 'react';
import { booksAPI } from '../../../services/api';
import { Book } from '../../../types';
import BookModal from './components/BookModal';
import BooksTable from './components/BooksTable';
import { notify } from '../../../utils/notifications';
import { useConfirmDialog } from '../../../utils/confirmDialog';
import { useAuth } from '../../../contexts/AuthContext';
import { SortingState } from '@tanstack/react-table';

type TabType = 'working' | 'reviewing' | 'approved' | 'declined' | 'deprecated';

const BooksManagement: React.FC = () => {
  const { hasRole } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [pageIndex, setPageIndex] = useState<number>(0);
  const [pageSize, setPageSize] = useState<number>(10);
  const [total, setTotal] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);
  const [activeTab, setActiveTab] = useState<TabType>('working');
  const [globalSearch, setGlobalSearch] = useState<string>('');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<Record<string, string>>({});
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [isDeclineModalOpen, setIsDeclineModalOpen] = useState<boolean>(false);
  const [decliningBookId, setDecliningBookId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState<string>('');
  const [isDeprecateModalOpen, setIsDeprecateModalOpen] = useState<boolean>(false);
  const [deprecatingBookId, setDeprecatingBookId] = useState<string | null>(null);
  const [deprecationReason, setDeprecationReason] = useState<string>('');
  const [isImportModalOpen, setIsImportModalOpen] = useState<boolean>(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResults, setImportResults] = useState<{
    success: number;
    errors: number;
    results: Array<{ row: number; book: string; status: 'success' | 'error'; message?: string }>;
  } | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const { confirm, Dialog } = useConfirmDialog();
  const scrollPositionRef = useRef<number>(0);

  const fetchBooks = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      
      // Map tab to status
      const statusMap: Record<TabType, string> = {
        working: 'working',
        reviewing: 'reviewing',
        approved: 'approved',
        declined: 'declined',
        deprecated: 'deprecated',
      };
      
      // Build query parameters
      const params: any = {
        page: pageIndex + 1,
        limit: pageSize,
        status: statusMap[activeTab],
      };

      // Add global search
      if (globalSearch) {
        params.search = globalSearch;
      }

      // Add sorting
      if (sorting.length > 0) {
        const sort = sorting[0];
        params.sortBy = sort.id;
        params.sortOrder = sort.desc ? 'DESC' : 'ASC';
      }

      // Add column filters
      Object.entries(columnFilters).forEach(([key, value]) => {
        if (value) {
          params[key] = value;
        }
      });

      const response = await booksAPI.getPaginated(params);
      setBooks(response.data.data);
      setTotal(response.data.total);
      setTotalPages(response.data.totalPages);
    } catch (error) {
      console.error('Error fetching books:', error);
      notify.error('Error fetching books');
    } finally {
      setLoading(false);
    }
  }, [pageIndex, pageSize, activeTab, globalSearch, sorting, columnFilters]);

  useEffect(() => {
    fetchBooks();
  }, [fetchBooks]);

  // Reset to first page when filters change
  useEffect(() => {
    setPageIndex(0);
  }, [activeTab, globalSearch, sorting, columnFilters]);

  // Disable body scroll when any modal is open
  useEffect(() => {
    const isAnyModalOpen = isModalOpen || isDeclineModalOpen || isDeprecateModalOpen || isImportModalOpen;
    
    if (isAnyModalOpen) {
      // Save current scroll position
      scrollPositionRef.current = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollPositionRef.current}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    } else {
      // Restore scroll position
      const scrollY = scrollPositionRef.current;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      document.body.style.overflow = '';
      window.scrollTo(0, scrollY);
    }

    // Cleanup function
    return () => {
      if (!isAnyModalOpen) {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
      }
    };
  }, [isModalOpen, isDeclineModalOpen, isDeprecateModalOpen, isImportModalOpen]);

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

  const handleDeclineClick = (id: string): void => {
    setDecliningBookId(id);
    setRejectionReason('');
    setIsDeclineModalOpen(true);
  };

  const handleDeclineConfirm = async (): Promise<void> => {
    if (!decliningBookId) return;
    
    try {
      await booksAPI.decline(decliningBookId, rejectionReason.trim() || undefined);
      notify.success('Book declined successfully');
      setIsDeclineModalOpen(false);
      setDecliningBookId(null);
      setRejectionReason('');
      fetchBooks();
    } catch (error: any) {
      console.error('Error declining book:', error);
      notify.error(error.response?.data?.message || 'Error declining book');
    }
  };

  const handleDeclineCancel = (): void => {
    setIsDeclineModalOpen(false);
    setDecliningBookId(null);
    setRejectionReason('');
  };

  const handleDeprecateClick = (id: string): void => {
    setDeprecatingBookId(id);
    setDeprecationReason('');
    setIsDeprecateModalOpen(true);
  };

  const handleDeprecateConfirm = async (): Promise<void> => {
    if (!deprecatingBookId) return;
    
    try {
      await booksAPI.deprecate(deprecatingBookId, deprecationReason.trim() || undefined);
      notify.success('Book deprecated successfully');
      setIsDeprecateModalOpen(false);
      setDeprecatingBookId(null);
      setDeprecationReason('');
      fetchBooks();
    } catch (error: any) {
      console.error('Error deprecating book:', error);
      notify.error(error.response?.data?.message || 'Error deprecating book');
    }
  };

  const handleDeprecateCancel = (): void => {
    setIsDeprecateModalOpen(false);
    setDeprecatingBookId(null);
    setDeprecationReason('');
  };

  const handleRequestReview = async (id: string): Promise<void> => {
    confirm(
      'Request Review',
      'This will change the book status to reviewing for review. Are you sure?',
      async () => {
        try {
          // Send update with requestReview flag (no actual data changes needed)
          await booksAPI.update(id, { requestReview: true } as any);
          notify.success('Review requested. Book status changed to reviewing.');
          fetchBooks();
        } catch (error: any) {
          console.error('Error requesting review:', error);
          notify.error(error.response?.data?.message || 'Error requesting review');
        }
      }
    );
  };

  const handlePaginationChange = (newPageIndex: number, newPageSize: number): void => {
    setPageIndex(newPageIndex);
    setPageSize(newPageSize);
  };

  const handleSortingChange = (newSorting: SortingState): void => {
    setSorting(newSorting);
  };

  const handleGlobalFilterChange = (value: string): void => {
    setGlobalSearch(value);
  };

  const handleColumnFilterChange = (columnId: string, value: string): void => {
    setColumnFilters((prev) => ({
      ...prev,
      [columnId]: value,
    }));
  };

  const handleExportCSV = async (): Promise<void> => {
    try {
      // Build filters from current state
      const statusMap: Record<TabType, string> = {
        working: 'working',
        reviewing: 'reviewing',
        approved: 'approved',
        declined: 'declined',
        deprecated: 'deprecated',
      };

      const filters: any = {
        status: statusMap[activeTab],
      };

      // Add global search if present
      if (globalSearch) {
        filters.search = globalSearch;
      }

      // Add column filters
      Object.entries(columnFilters).forEach(([key, value]) => {
        if (value) {
          filters[key] = value;
        }
      });

      await booksAPI.exportToCSV(filters);
      notify.success('Books exported to CSV successfully');
    } catch (error: any) {
      console.error('Error exporting books:', error);
      notify.error(error.response?.data?.message || 'Error exporting books to CSV');
    }
  };

  const handleImportCSVClick = (): void => {
    setIsImportModalOpen(true);
    setImportFile(null);
    setImportResults(null);
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.name.toLowerCase().endsWith('.csv')) {
        notify.error('Please select a CSV file');
        return;
      }
      setImportFile(file);
      setImportResults(null);
    }
  };

  const handleImportConfirm = async (): Promise<void> => {
    if (!importFile) {
      notify.error('Please select a CSV file');
      return;
    }

    try {
      setIsImporting(true);
      const results = await booksAPI.importFromCSV(importFile);
      setImportResults(results);
      
      if (results.errors === 0) {
        notify.success(`Successfully imported ${results.success} book(s)`);
      } else if (results.success > 0) {
        notify.warning(`Imported ${results.success} book(s) with ${results.errors} error(s)`);
      } else {
        notify.error(`Failed to import books. ${results.errors} error(s)`);
      }

      // Refresh book list if any books were successfully imported
      if (results.success > 0) {
        fetchBooks();
      }
    } catch (error: any) {
      console.error('Error importing books:', error);
      notify.error(error.response?.data?.message || 'Error importing books from CSV');
    } finally {
      setIsImporting(false);
    }
  };

  const handleImportCancel = (): void => {
    setIsImportModalOpen(false);
    setImportFile(null);
    setImportResults(null);
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Books Management</h2>
      </div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex gap-3">
          {hasRole('book:read') && (
            <button
              onClick={handleExportCSV}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              Export CSV
            </button>
          )}
          {hasRole('book:create') && (
            <button
              onClick={handleImportCSVClick}
              className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 transition flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Import CSV
            </button>
          )}
        </div>
        {hasRole('book:create') && (
          <button
            onClick={handleCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            + Add Book
          </button>
        )}
      </div>

      <div className="mb-4">
        {hasRole('book:read') && (
          <div className="flex space-x-1 mb-4 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('working')}
              className={`px-4 py-2 font-medium text-sm transition-colors focus:outline-none ${
                activeTab === 'working'
                  ? 'border-b-2 border-purple-600 text-purple-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Working
            </button>
            <button
              onClick={() => setActiveTab('reviewing')}
              className={`px-4 py-2 font-medium text-sm transition-colors focus:outline-none ${
                activeTab === 'reviewing'
                  ? 'border-b-2 border-yellow-600 text-yellow-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Reviewing
            </button>
            <button
              onClick={() => setActiveTab('approved')}
              className={`px-4 py-2 font-medium text-sm transition-colors focus:outline-none ${
                activeTab === 'approved'
                  ? 'border-b-2 border-blue-600 text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Approved
            </button>
            <button
              onClick={() => setActiveTab('declined')}
              className={`px-4 py-2 font-medium text-sm transition-colors focus:outline-none ${
                activeTab === 'declined'
                  ? 'border-b-2 border-red-600 text-red-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Declined
            </button>
            {hasRole('book:approve') && (
              <button
                onClick={() => setActiveTab('deprecated')}
                className={`px-4 py-2 font-medium text-sm transition-colors focus:outline-none ${
                  activeTab === 'deprecated'
                    ? 'border-b-2 border-gray-600 text-gray-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Deprecated
              </button>
            )}
          </div>
        )}
      </div>

      <BooksTable
        data={books}
        loading={loading}
        pageCount={totalPages}
        pageIndex={pageIndex}
        pageSize={pageSize}
        total={total}
        onPaginationChange={handlePaginationChange}
        onSortingChange={handleSortingChange}
        onGlobalFilterChange={handleGlobalFilterChange}
        onColumnFilterChange={handleColumnFilterChange}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onApprove={handleApprove}
        onDecline={handleDeclineClick}
        onDeprecate={handleDeprecateClick}
        onRequestReview={handleRequestReview}
        hasUpdateRole={hasRole('book:update')}
        hasDeleteRole={hasRole('book:delete')}
        hasApproveRole={hasRole('book:approve')}
      />

      {isModalOpen && (
        <BookModal
          book={editingBook}
          onClose={handleModalClose}
        />
      )}

      {isDeclineModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold">Decline Book</h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Rejection Reason (Optional)
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Enter the reason for declining this book..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleDeclineCancel}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeclineConfirm}
                  className="px-4 py-2 text-white bg-red-600 rounded hover:bg-red-700 transition"
                >
                  Decline Book
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isDeprecateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-md">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold">Deprecate Book</h3>
            </div>
            <div className="p-6">
              <div className="mb-4">
                <p className="text-sm text-gray-600 mb-4">
                  This book will be hidden from normal listings and only shown in the deprecated tab.
                </p>
                <label className="block text-sm font-medium mb-2">
                  Deprecation Reason (Optional)
                </label>
                <textarea
                  value={deprecationReason}
                  onChange={(e) => setDeprecationReason(e.target.value)}
                  placeholder="Enter the reason for deprecating this book..."
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-500 resize-none"
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleDeprecateCancel}
                  className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeprecateConfirm}
                  className="px-4 py-2 text-white bg-gray-600 rounded hover:bg-gray-700 transition"
                >
                  Deprecate Book
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {isImportModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-screen-90 overflow-hidden flex flex-col">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-2xl font-bold">Import Books from CSV</h3>
              <p className="text-sm text-gray-600 mt-2">
                Upload a CSV file to import books. The file should have columns: Title, Author, ISBN, Category, Total Copies, Available Copies, Status, Is Ebook, Published Date, Description.
              </p>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              {!importResults ? (
                <div>
                  <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">
                      Select CSV File
                    </label>
                    <input
                      type="file"
                      accept=".csv"
                      onChange={handleFileSelect}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                      disabled={isImporting}
                    />
                    {importFile && (
                      <p className="mt-2 text-sm text-gray-600">
                        Selected: {importFile.name} ({(importFile.size / 1024).toFixed(2)} KB)
                      </p>
                    )}
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                    <h4 className="font-semibold text-blue-900 mb-2">CSV Format Requirements:</h4>
                    <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                      <li>First row must contain headers</li>
                      <li>Required columns: Title, Author, ISBN, Category, Total Copies</li>
                      <li>Optional columns: Available Copies, Status, Is Ebook, Published Date, Description</li>
                      <li>Status values: working, reviewing, approved, declined, deprecated</li>
                      <li>Is Ebook: Yes/No or true/false</li>
                    </ul>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col h-full">
                  <div className="mb-4 flex-shrink-0">
                    <h4 className="font-semibold text-lg mb-2">Import Results</h4>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <p className="text-sm text-green-700">Success</p>
                        <p className="text-2xl font-bold text-green-900">{importResults.success}</p>
                      </div>
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <p className="text-sm text-red-700">Errors</p>
                        <p className="text-2xl font-bold text-red-900">{importResults.errors}</p>
                      </div>
                    </div>
                  </div>
                  {importResults.results.length > 0 && (
                    <div className="flex-1 min-h-0 border border-gray-200 rounded-lg overflow-hidden">
                      <div className="h-full overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 sticky top-0 z-10">
                            <tr>
                              <th className="px-3 py-2 text-left">Row</th>
                              <th className="px-3 py-2 text-left">Book</th>
                              <th className="px-3 py-2 text-left">Status</th>
                              <th className="px-3 py-2 text-left">Message</th>
                            </tr>
                          </thead>
                          <tbody>
                            {importResults.results.map((result, index) => (
                              <tr key={index} className={result.status === 'error' ? 'bg-red-50' : 'bg-green-50'}>
                                <td className="px-3 py-2">{result.row}</td>
                                <td className="px-3 py-2">{result.book}</td>
                                <td className="px-3 py-2">
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                                    result.status === 'success' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-red-100 text-red-800'
                                  }`}>
                                    {result.status}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-xs">{result.message || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
              {!importResults ? (
                <>
                  <button
                    onClick={handleImportCancel}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded hover:bg-gray-300 transition"
                    disabled={isImporting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportConfirm}
                    className="px-4 py-2 text-white bg-purple-600 rounded hover:bg-purple-700 transition disabled:bg-gray-400 disabled:cursor-not-allowed"
                    disabled={!importFile || isImporting}
                  >
                    {isImporting ? 'Importing...' : 'Import Books'}
                  </button>
                </>
              ) : (
                <button
                  onClick={handleImportCancel}
                  className="px-4 py-2 text-white bg-purple-600 rounded hover:bg-purple-700 transition"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <Dialog />
    </div>
  );
};

export default BooksManagement;
