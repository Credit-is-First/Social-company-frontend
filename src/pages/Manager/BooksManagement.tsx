import React, { useState } from 'react';
import ManagerLayout from '../../components/ManagerLayout';
import Books from '../Books';

const BooksManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  const handleSearch = (term: string): void => {
    setSearchTerm(term);
  };

  return (
    <ManagerLayout
      pageName="Books Management"
      searchPlaceholder="Search books by title, author, ISBN, or category..."
      onSearch={handleSearch}
    >
      <Books />
    </ManagerLayout>
  );
};

export default BooksManagement;
