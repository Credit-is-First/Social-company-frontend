import React, { useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  ColumnDef,
  flexRender,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { Book } from '../../../../types';

interface BooksTableProps {
  data: Book[];
  loading: boolean;
  pageCount: number;
  pageIndex: number;
  pageSize: number;
  total: number;
  onPaginationChange: (pageIndex: number, pageSize: number) => void;
  onSortingChange: (sorting: SortingState) => void;
  onGlobalFilterChange: (value: string) => void;
  onColumnFilterChange: (columnId: string, value: string) => void;
  onEdit: (book: Book) => void;
  onDelete: (id: string) => void;
  onApprove: (id: string) => void;
  onDecline: (id: string) => void;
  onDeprecate: (id: string) => void;
  onRequestReview?: (id: string) => void;
  hasUpdateRole: boolean;
  hasDeleteRole: boolean;
  hasApproveRole: boolean;
}

const BooksTable: React.FC<BooksTableProps> = ({
  data,
  loading,
  pageCount,
  pageIndex,
  pageSize,
  total,
  onPaginationChange,
  onSortingChange,
  onGlobalFilterChange,
  onColumnFilterChange,
  onEdit,
  onDelete,
  onApprove,
  onDecline,
  onDeprecate,
  onRequestReview,
  hasUpdateRole,
  hasDeleteRole,
  hasApproveRole,
}) => {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = React.useState('');
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);

  const columns = useMemo<ColumnDef<Book>[]>(
    () => [
      {
        accessorKey: 'title',
        header: 'Title',
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: 'author',
        header: 'Author',
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: 'isbn',
        header: 'ISBN',
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: 'category',
        header: 'Category',
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: (info) => {
          const book = info.row.original;
          const status = info.getValue() as string;
          const statusColors: Record<string, string> = {
            working: 'bg-purple-100 text-purple-800',
            reviewing: 'bg-yellow-100 text-yellow-800',
            approved: 'bg-green-100 text-green-800',
            declined: 'bg-red-100 text-red-800',
            deprecated: 'bg-gray-100 text-gray-800',
          };
          const statusLabels: Record<string, string> = {
            working: 'Working',
            reviewing: 'Reviewing',
            approved: 'Approved',
            declined: 'Declined',
            deprecated: 'Deprecated',
          };
          const statusBadge = (
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusColors[status] || 'bg-gray-100 text-gray-800'}`}>
              {statusLabels[status] || status}
            </span>
          );
          
          // Show deprecation reason for deprecated books
          if (status === 'deprecated' && book.deprecationReason) {
            return (
              <div className="flex flex-col">
                {statusBadge}
                <span className="text-xs text-gray-500 mt-1" title={book.deprecationReason}>
                  {book.deprecationReason.length > 50 
                    ? `${book.deprecationReason.substring(0, 50)}...` 
                    : book.deprecationReason}
                </span>
              </div>
            );
          }
          
          // Show rejection reason for rejected books
          if (status === 'rejected' && book.rejectionReason) {
            return (
              <div className="flex flex-col">
                {statusBadge}
                <span className="text-xs text-red-500 mt-1" title={book.rejectionReason}>
                  {book.rejectionReason.length > 50 
                    ? `${book.rejectionReason.substring(0, 50)}...` 
                    : book.rejectionReason}
                </span>
              </div>
            );
          }
          
          return statusBadge;
        },
      },
      {
        accessorKey: 'totalCopies',
        header: 'Total Copies',
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: 'availableCopies',
        header: 'Available',
        cell: (info) => {
          const available = info.getValue() as number;
          return (
            <span className={available > 0 ? 'text-green-600' : 'text-red-600'}>
              {available}
            </span>
          );
        },
      },
      {
        id: 'actions',
        header: 'Actions',
        cell: (info) => {
          const book = info.row.original;
          return (
            <div className="flex space-x-2">
              {/* Show edit for working, deprecated, and declined books (not approved or reviewing) */}
              {hasUpdateRole && (book.status === 'working' || book.status === 'deprecated' || book.status === 'declined') && (
                <button
                  onClick={() => onEdit(book)}
                  className="text-blue-600 hover:text-blue-800 text-sm focus:outline-none"
                >
                  Edit
                </button>
              )}
              {/* Show delete for working, deprecated, and declined books (not approved or reviewing) */}
              {hasDeleteRole && (book.status === 'working' || book.status === 'deprecated' || book.status === 'declined') && (
                <button
                  onClick={() => onDelete(book.id)}
                  className="text-red-600 hover:text-red-800 text-sm focus:outline-none"
                >
                  Delete
                </button>
              )}
              {hasApproveRole && book.status === 'reviewing' && (
                <>
                  <button
                    onClick={() => onApprove(book.id)}
                    className="text-green-600 hover:text-green-800 text-sm focus:outline-none"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onDecline(book.id)}
                    className="text-red-600 hover:text-red-800 text-sm focus:outline-none"
                  >
                    Decline
                  </button>
                </>
              )}
              {hasUpdateRole && book.status === 'declined' && (
                <button
                  onClick={() => onRequestReview && onRequestReview(book.id)}
                  className="text-yellow-600 hover:text-yellow-800 text-sm focus:outline-none"
                >
                  Request Review
                </button>
              )}
              {hasApproveRole && book.status === 'approved' && (
                <button
                  onClick={() => onDeprecate(book.id)}
                  className="text-gray-600 hover:text-gray-800 text-sm focus:outline-none"
                >
                  Deprecate
                </button>
              )}
              {hasUpdateRole && book.status === 'deprecated' && (
                <button
                  onClick={() => onRequestReview && onRequestReview(book.id)}
                  className="text-yellow-600 hover:text-yellow-800 text-sm focus:outline-none"
                >
                  Request Review
                </button>
              )}
              {hasUpdateRole && book.status === 'working' && (
                <button
                  onClick={() => onRequestReview && onRequestReview(book.id)}
                  className="text-yellow-600 hover:text-yellow-800 text-sm focus:outline-none"
                >
                  Request Review
                </button>
              )}
            </div>
          );
        },
      },
    ],
    [hasUpdateRole, hasDeleteRole, hasApproveRole, onEdit, onDelete, onApprove, onDecline, onDeprecate, onRequestReview]
  );

  const table = useReactTable({
    data,
    columns,
    pageCount,
    state: {
      sorting,
      globalFilter,
      columnFilters,
      pagination: {
        pageIndex,
        pageSize,
      },
    },
    onSortingChange: (updater) => {
      const newSorting = typeof updater === 'function' ? updater(sorting) : updater;
      setSorting(newSorting);
      onSortingChange(newSorting);
    },
    onGlobalFilterChange: (value) => {
      setGlobalFilter(value);
      onGlobalFilterChange(value);
    },
    onColumnFiltersChange: (updater) => {
      const newFilters = typeof updater === 'function' ? updater(columnFilters) : updater;
      setColumnFilters(newFilters);
      newFilters.forEach((filter) => {
        onColumnFilterChange(filter.id, filter.value as string);
      });
    },
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  return (
    <div className="space-y-4">
      {/* Global Search */}
      <div className="flex items-center space-x-4">
        <input
          type="text"
          placeholder="Search all columns..."
          value={globalFilter}
          onChange={(e) => {
            setGlobalFilter(e.target.value);
            onGlobalFilterChange(e.target.value);
          }}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Column Filters */}
      <div className="grid grid-cols-4 gap-4">
        <input
          type="text"
          placeholder="Filter by title..."
          value={(columnFilters.find((f) => f.id === 'title')?.value as string) || ''}
          onChange={(e) => {
            const newFilters = columnFilters.filter((f) => f.id !== 'title');
            if (e.target.value) {
              newFilters.push({ id: 'title', value: e.target.value });
            }
            setColumnFilters(newFilters);
            onColumnFilterChange('title', e.target.value);
          }}
          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Filter by author..."
          value={(columnFilters.find((f) => f.id === 'author')?.value as string) || ''}
          onChange={(e) => {
            const newFilters = columnFilters.filter((f) => f.id !== 'author');
            if (e.target.value) {
              newFilters.push({ id: 'author', value: e.target.value });
            }
            setColumnFilters(newFilters);
            onColumnFilterChange('author', e.target.value);
          }}
          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Filter by ISBN..."
          value={(columnFilters.find((f) => f.id === 'isbn')?.value as string) || ''}
          onChange={(e) => {
            const newFilters = columnFilters.filter((f) => f.id !== 'isbn');
            if (e.target.value) {
              newFilters.push({ id: 'isbn', value: e.target.value });
            }
            setColumnFilters(newFilters);
            onColumnFilterChange('isbn', e.target.value);
          }}
          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Filter by category..."
          value={(columnFilters.find((f) => f.id === 'category')?.value as string) || ''}
          onChange={(e) => {
            const newFilters = columnFilters.filter((f) => f.id !== 'category');
            if (e.target.value) {
              newFilters.push({ id: 'category', value: e.target.value });
            }
            setColumnFilters(newFilters);
            onColumnFilterChange('category', e.target.value);
          }}
          className="px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200"
                  >
                    {header.isPlaceholder ? null : (
                      <div
                        className={header.column.getCanSort() ? 'cursor-pointer select-none flex items-center space-x-1' : ''}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                        {header.column.getCanSort() && (
                          <span className="text-gray-400 ml-1 inline-flex flex-col">
                            {header.column.getIsSorted() === 'asc' ? (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                              </svg>
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            ) : (
                              <span className="inline-flex flex-col -space-y-1">
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                </svg>
                                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                </svg>
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {loading ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-4 text-center">
                  Loading...
                </td>
              </tr>
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-6 py-4 text-center text-gray-500">
                  No books found
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Showing {pageIndex * pageSize + 1} to {Math.min((pageIndex + 1) * pageSize, total)} of {total} results
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPaginationChange(0, pageSize)}
            disabled={pageIndex === 0}
            className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            First
          </button>
          <button
            onClick={() => onPaginationChange(pageIndex - 1, pageSize)}
            disabled={pageIndex === 0}
            className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="px-3 py-1">
            Page {pageIndex + 1} of {pageCount}
          </span>
          <button
            onClick={() => onPaginationChange(pageIndex + 1, pageSize)}
            disabled={pageIndex >= pageCount - 1}
            className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
          <button
            onClick={() => onPaginationChange(pageCount - 1, pageSize)}
            disabled={pageIndex >= pageCount - 1}
            className="px-3 py-1 border border-gray-300 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Last
          </button>
          <select
            value={pageSize}
            onChange={(e) => onPaginationChange(0, Number(e.target.value))}
            className="px-3 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[10, 20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default BooksTable;

