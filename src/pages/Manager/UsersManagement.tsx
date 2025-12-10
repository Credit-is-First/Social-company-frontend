import React, { useState } from 'react';
import ManagerLayout from '../../components/ManagerLayout';
import Users from '../Users';

const UsersManagement: React.FC = () => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  const handleSearch = (term: string): void => {
    setSearchTerm(term);
  };

  return (
    <ManagerLayout
      pageName="Users Management"
      searchPlaceholder="Search users by name, email, or phone..."
      onSearch={handleSearch}
    >
      <Users />
    </ManagerLayout>
  );
};

export default UsersManagement;
