import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { usersAPI, rolesAPI, groupsAPI } from '../../../../services/api';
import { User, CreateUserDto, Role, Group } from '../../../../types';
import { notify } from '../../../../utils/notifications';

interface UserModalProps {
  user: User | null;
  onClose: () => void;
}

interface UserFormData {
  name: string;
  email: string;
  phone: string;
  address: string;
  roleIds: string[];
  groupIds: string[];
}

const UserModal: React.FC<UserModalProps> = ({ user, onClose }) => {
  const [formData, setFormData] = useState<UserFormData>({
    name: '',
    email: '',
    phone: '',
    address: '',
    roleIds: [],
    groupIds: [],
  });
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [rolesRes, groupsRes] = await Promise.all([
          rolesAPI.getAll(),
          groupsAPI.getAll(),
        ]);
        setRoles(rolesRes.data);
        setGroups(groupsRes.data);
      } catch (error) {
        console.error('Error fetching roles/groups:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        roleIds: user.roles?.map(r => r.id) || [],
        groupIds: user.groups?.map(g => g.id) || [],
      });
    }
  }, [user]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleRoleToggle = (roleId: string): void => {
    setFormData({
      ...formData,
      roleIds: formData.roleIds.includes(roleId)
        ? formData.roleIds.filter(id => id !== roleId)
        : [...formData.roleIds, roleId],
    });
  };

  const handleGroupToggle = (groupId: string): void => {
    setFormData({
      ...formData,
      groupIds: formData.groupIds.includes(groupId)
        ? formData.groupIds.filter(id => id !== groupId)
        : [...formData.groupIds, groupId],
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    try {
      const userData: CreateUserDto = {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address || undefined,
      };

      if (user) {
        // Update user basic info
        await usersAPI.update(user.id, userData);
        // Update roles if changed
        if (formData.roleIds.length > 0 || user.roles?.length !== formData.roleIds.length) {
          await usersAPI.updateRoles(user.id, formData.roleIds);
        }
        // Update groups if changed
        if (formData.groupIds.length > 0 || user.groups?.length !== formData.groupIds.length) {
          await usersAPI.updateGroups(user.id, formData.groupIds);
        }
        notify.success('User updated successfully');
      } else {
        await usersAPI.create(userData);
        // After creating, update roles and groups if provided
        // Note: We'd need the created user ID, but for now we'll just create the user
        notify.success('User created successfully');
      }
      onClose();
    } catch (error: any) {
      console.error('Error saving user:', error);
      notify.error(error.response?.data?.message || 'Error saving user');
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold mb-4">
          {user ? 'Edit User' : 'Add New User'}
        </h3>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              disabled={!!user}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Phone *</label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Address</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {user && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Roles</label>
                <div className="border border-gray-300 rounded p-3 max-h-32 overflow-y-auto">
                  {roles.length === 0 ? (
                    <p className="text-sm text-gray-500">No roles available</p>
                  ) : (
                    <div className="space-y-2">
                      {roles.map((role) => (
                        <label
                          key={role.id}
                          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={formData.roleIds.includes(role.id)}
                            onChange={() => handleRoleToggle(role.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm">{role.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Groups</label>
                <div className="border border-gray-300 rounded p-3 max-h-32 overflow-y-auto">
                  {groups.length === 0 ? (
                    <p className="text-sm text-gray-500">No groups available</p>
                  ) : (
                    <div className="space-y-2">
                      {groups.map((group) => (
                        <label
                          key={group.id}
                          className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
                        >
                          <input
                            type="checkbox"
                            checked={formData.groupIds.includes(group.id)}
                            onChange={() => handleGroupToggle(group.id)}
                            className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <span className="text-sm">{group.name}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              {user ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;

