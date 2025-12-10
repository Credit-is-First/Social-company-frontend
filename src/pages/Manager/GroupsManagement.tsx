import React, { useState, useEffect } from 'react';
import ManagerLayout from '../../components/ManagerLayout';
import Groups from '../Groups';

const GroupsManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  const handleSearch = (term: string): void => {
    setSearchTerm(term);
  };

  return (
    <ManagerLayout
      pageName="Groups Management"
      searchPlaceholder="Search groups..."
      onSearch={handleSearch}
    >
      <Groups />
    </ManagerLayout>
  );
};

export default GroupsManagement;
