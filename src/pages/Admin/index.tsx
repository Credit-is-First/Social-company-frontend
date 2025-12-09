import React, { useState, useEffect } from 'react';
import { usersAPI } from '../../services/api';
import { User, UserRole } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { notify } from '../../utils/notifications';
import { useConfirmDialog } from '../../utils/confirmDialog';

const Admin: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const { confirm, Dialog } = useConfirmDialog();

  useEffect(() => {
    fetchUsers();
  }, [searchTerm]);

  const fetchUsers = async (): Promise<void> => {
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
  };

  const handleRoleChange = async (userId: number, newRole: UserRole): Promise<void> => {
    // Prevent admin from changing their own role
    if (userId === currentUser?.id) {
      notify.warning('You cannot change your own role');
      return;
    }

    confirm(
      'Change User Role',
      `Are you sure you want to change this user's role to ${newRole}?`,
      async () => {
        try {
          setUpdatingUserId(userId);
          await usersAPI.update(userId, { role: newRole });
          await fetchUsers();
          notify.success('User role updated successfully');
        } catch (error: any) {
          console.error('Error updating user role:', error);
          notify.error(error.response?.data?.message || 'Error updating user role');
        } finally {
          setUpdatingUserId(null);
        }
      }
    );
  };

  const getRoleBadgeColor = (role: UserRole | undefined): string => {
    switch (role) {
      case UserRole.ADMIN:
        return 'bg-red-100 text-red-800';
      case UserRole.LIBRARIAN:
        return 'bg-blue-100 text-blue-800';
      case UserRole.USER:
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2">User Role Management</h2>
        <p className="text-gray-600">Manage user roles and permissions</p>
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
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Phone
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Role
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Change Role
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                      No users found
                    </td>
                  </tr>
                ) : (
                  users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{user.name}</div>
                        {user.id === currentUser?.id && (
                          <div className="text-xs text-blue-600">(You)</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.email}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{user.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span
                          className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(
                            user.role
                          )}`}
                        >
                          {user.role || 'user'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={user.role || UserRole.USER}
                          onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                          disabled={updatingUserId === user.id || user.id === currentUser?.id}
                          className={`px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                            updatingUserId === user.id || user.id === currentUser?.id
                              ? 'bg-gray-100 cursor-not-allowed'
                              : 'bg-white cursor-pointer'
                          }`}
                        >
                          <option value={UserRole.USER}>User</option>
                          <option value={UserRole.LIBRARIAN}>Librarian</option>
                          <option value={UserRole.ADMIN}>Admin</option>
                        </select>
                        {updatingUserId === user.id && (
                          <span className="ml-2 text-xs text-gray-500">Updating...</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
      <Dialog />
    </div>
  );
};

export default Admin;
