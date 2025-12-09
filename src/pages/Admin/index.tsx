import React, { useState, useEffect } from 'react';
import { usersAPI, rolesAPI } from '../../services/api';
import { User, Role } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { notify } from '../../utils/notifications';
import { useConfirmDialog } from '../../utils/confirmDialog';

const Admin: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [updatingUserId, setUpdatingUserId] = useState<number | null>(null);
  const { confirm, Dialog } = useConfirmDialog();

  useEffect(() => {
    fetchData();
  }, [searchTerm]);

  const fetchData = async (): Promise<void> => {
    try {
      setLoading(true);
      const [usersRes, rolesRes] = await Promise.all([
        usersAPI.getAll(searchTerm || undefined),
        rolesAPI.getAll(),
      ]);
      setUsers(usersRes.data);
      setRoles(rolesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      notify.error('Error fetching data');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleToggle = async (userId: number, roleId: number, isChecked: boolean): Promise<void> => {
    if (userId === currentUser?.id) {
      notify.warning('You cannot change your own roles');
      return;
    }

    const user = users.find(u => u.id === userId);
    if (!user) return;

    const currentRoleIds = user.roles?.map(r => r.id) || [];
    let newRoleIds: number[];

    if (isChecked) {
      newRoleIds = [...currentRoleIds, roleId];
    } else {
      newRoleIds = currentRoleIds.filter(id => id !== roleId);
    }

    confirm(
      'Update User Roles',
      `Are you sure you want to ${isChecked ? 'add' : 'remove'} this role?`,
      async () => {
        try {
          setUpdatingUserId(userId);
          await usersAPI.updateRoles(userId, newRoleIds);
          await fetchData();
          notify.success('User roles updated successfully');
        } catch (error: any) {
          console.error('Error updating user roles:', error);
          notify.error(error.response?.data?.message || 'Error updating user roles');
        } finally {
          setUpdatingUserId(null);
        }
      }
    );
  };

  const getRoleBadgeColor = (roleName: string): string => {
    switch (roleName) {
      case 'admin':
        return 'bg-red-100 text-red-800';
      case 'librarian':
        return 'bg-blue-100 text-blue-800';
      case 'user':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const userHasRole = (user: User, roleId: number): boolean => {
    return user.roles?.some(role => role.id === roleId) || false;
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold mb-2">User Role Management</h2>
        <p className="text-gray-600">Manage user roles and permissions. Users can have multiple roles.</p>
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
                    Current Roles
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Manage Roles
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">
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
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-2">
                          {user.roles && user.roles.length > 0 ? (
                            user.roles.map((role) => (
                              <span
                                key={role.id}
                                className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(
                                  role.name
                                )}`}
                              >
                                {role.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">No roles assigned</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col space-y-2">
                          {roles.map((role) => (
                            <label
                              key={role.id}
                              className={`flex items-center space-x-2 ${
                                updatingUserId === user.id || user.id === currentUser?.id
                                  ? 'opacity-50 cursor-not-allowed'
                                  : 'cursor-pointer'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={userHasRole(user, role.id)}
                                onChange={(e) => handleRoleToggle(user.id, role.id, e.target.checked)}
                                disabled={updatingUserId === user.id || user.id === currentUser?.id}
                                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-700">{role.name}</span>
                            </label>
                          ))}
                        </div>
                        {updatingUserId === user.id && (
                          <span className="text-xs text-gray-500 mt-2 block">Updating...</span>
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
