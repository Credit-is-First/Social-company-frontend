import React, { createContext, useContext, useState, ReactNode } from 'react';

interface UserSearchContextType {
  searchTerm: string;
  setSearchTerm: (term: string) => void;
}

const UserSearchContext = createContext<UserSearchContextType | undefined>(undefined);

export const useUserSearch = () => {
  const context = useContext(UserSearchContext);
  if (!context) {
    throw new Error('useUserSearch must be used within a UserSearchProvider');
  }
  return context;
};

interface UserSearchProviderProps {
  children: ReactNode;
}

export const UserSearchProvider: React.FC<UserSearchProviderProps> = ({ 
  children 
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');

  return (
    <UserSearchContext.Provider 
      value={{ 
        searchTerm, 
        setSearchTerm
      }}
    >
      {children}
    </UserSearchContext.Provider>
  );
};

