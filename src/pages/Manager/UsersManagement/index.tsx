import React, { useState, useEffect, useCallback } from 'react';
import { usersAPI } from '../../../services/api';
import { User } from '../../../types';
import UserModal from './components/UserModal';
import { notify } from '../../../utils/notifications';
import { useConfirmDialog } from '../../../utils/confirmDialog';
import { useAuth } from '../../../contexts/AuthContext';

const UsersManagement: React.FC = () => {
  const { hasRole } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const { confirm, Dialog } = useConfirmDialog();

  const fetchUsers = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await usersAPI.getAll(searchTerm || undefined);
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      notify.error('Error fetching users');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = (): void => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user: User): void => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string): Promise<void> => {
    confirm(
      'Delete User',
      'Are you sure you want to delete this user? This action cannot be undone.',
      async () => {
        try {
          await usersAPI.delete(id);
          notify.success('User deleted successfully');
          fetchUsers();
        } catch (error) {
          console.error('Error deleting user:', error);
          notify.error('Error deleting user');
        }
      },
      { confirmText: 'Delete', confirmColor: 'red' }
    );
  };

  const handleModalClose = (): void => {
    setIsModalOpen(false);
    setEditingUser(null);
    fetchUsers();
  };

  return (
    <div>
      <div className="mb-6 flex justify-between items-center">
        <h2 className="text-3xl font-bold">Users Management</h2>
        {hasRole('user:create') && (
          <button
            onClick={handleCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            + Add User
          </button>
        )}
      </div>

      <div className="mb-4">
        <input
          type="text"
          placeholder="Search users by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {users.map((user) => (
            <div key={user.id} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-2">{user.name}</h3>
              <p className="text-gray-600 mb-1">Email: {user.email}</p>
              <p className="text-gray-600 mb-1">Phone: {user.phone}</p>
              {user.address && (
                <p className="text-gray-600 mb-1">Address: {user.address}</p>
              )}
              <div className="mt-2">
                <div className="mb-2">
                  <p className="text-xs font-medium text-gray-500 mb-1">Groups:</p>
                  <div className="flex flex-wrap gap-2">
                    {user.groups && user.groups.length > 0 ? (
                      user.groups.map((group) => (
                        <span
                          key={group.id}
                          className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800"
                        >
                          {group.name}
                        </span>
                      ))
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        No groups
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Direct Roles:</p>
                  <div className="flex flex-wrap gap-2">
                    {user.roles && user.roles.length > 0 ? (
                      user.roles.map((role) => (
                        <span
                          key={role.id}
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            role.name === 'admin' ? 'bg-red-100 text-red-800' :
                            role.name === 'librarian' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}
                        >
                          {role.name}
                        </span>
                      ))
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">
                        No roles
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                {hasRole('user:update') && (
                  <button
                    onClick={() => handleEdit(user)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Edit
                  </button>
                )}
                {hasRole('user:delete') && (
                  <button
                    onClick={() => handleDelete(user.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <UserModal
          user={editingUser}
          onClose={handleModalClose}
        />
      )}
      <Dialog />
    </div>
  );
};

export default UsersManagement;

