import React, { useState } from 'react';
import ManagerLayout from '../../components/ManagerLayout';
import Loans from '../Loans';

const LendingManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  const handleSearch = (term: string): void => {
    setSearchTerm(term);
  };

  return (
    <ManagerLayout
      pageName="Lending Management"
      searchPlaceholder="Search loans..."
      onSearch={handleSearch}
    >
      <Loans />
    </ManagerLayout>
  );
};

export default LendingManagement;
