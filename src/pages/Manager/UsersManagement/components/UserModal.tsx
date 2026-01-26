import React, { useState, useEffect, FormEvent } from 'react';
import { usersAPI, rolesAPI, groupsAPI } from '../../../../services/api';
import { User, Role, Group } from '../../../../types';
import { notify } from '../../../../utils/notifications';

interface UserModalProps {
  user: User | null;
  onClose: () => void;
}

interface UserFormData {
  roleIds: string[];
  groupIds: string[];
}

const UserModal: React.FC<UserModalProps> = ({ user, onClose }) => {
  const [formData, setFormData] = useState<UserFormData>({
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
        roleIds: user.roles?.map(r => r.id) || [],
        groupIds: user.groups?.map(g => g.id) || [],
      });
    }
  }, [user]);


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
      if (!user) {
        throw new Error('Cannot create users. Users must sign up through registration.');
      }
      
      // Update roles if changed
      if (formData.roleIds.length !== (user.roles?.length || 0) || 
          !formData.roleIds.every(id => user.roles?.some(r => r.id === id))) {
        await usersAPI.updateRoles(user.id, formData.roleIds);
      }
      // Update groups if changed
      if (formData.groupIds.length !== (user.groups?.length || 0) || 
          !formData.groupIds.every(id => user.groups?.some(g => g.id === id))) {
        await usersAPI.updateGroups(user.id, formData.groupIds);
      }
      notify.success('User updated successfully');
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="p-6 border-b border-gray-200">
        <h3 className="text-2xl font-bold">
          Edit User
        </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
            {user && (
              <>
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
              </>
            )}
          </div>

          <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 bg-gray-50">
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
              Update
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;

