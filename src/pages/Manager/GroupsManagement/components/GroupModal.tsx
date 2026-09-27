import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { groupsAPI } from '../../../../services/api';
import { Group, Role, CreateGroupDto, UpdateGroupDto } from '../../../../types';
import { notify } from '../../../../utils/notifications';

interface GroupModalProps {
  group: Group | null;
  roles: Role[];
  onClose: () => void;
}

interface GroupFormData {
  name: string;
  description: string;
  roleIds: string[];
}

const GroupModal: React.FC<GroupModalProps> = ({ group, roles, onClose }) => {
  const [formData, setFormData] = useState<GroupFormData>({
    name: '',
    description: '',
    roleIds: [],
  });

  useEffect(() => {
    if (group) {
      setFormData({
        name: group.name || '',
        description: group.description || '',
        roleIds: group.roles?.map(r => r.id) || [],
      });
    }
  }, [group]);

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value,
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    try {
      if (group) {
        const updateData: UpdateGroupDto = {
          name: formData.name,
          description: formData.description || undefined,
          roleIds: formData.roleIds,
        };
        await groupsAPI.update(group.id, updateData);
        notify.success('Group updated successfully');
      } else {
        const createData: CreateGroupDto = {
          name: formData.name,
          description: formData.description || undefined,
          roleIds: formData.roleIds.length > 0 ? formData.roleIds : undefined,
        };
        await groupsAPI.create(createData);
        notify.success('Group created successfully');
      }
      onClose();
    } catch (error: any) {
      console.error('Error saving group:', error);
      notify.error(error.response?.data?.message || 'Error saving group');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-2xl font-bold">
            {group ? 'Edit Group' : 'Add New Group'}
          </h3>
        </div>
        
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
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
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Roles</label>
            <div className="border border-gray-300 rounded p-3 max-h-48 overflow-y-auto">
              {roles.length === 0 ? (
                <p className="text-sm text-gray-500">No roles available</p>
              ) : (
                <div className="space-y-2">
                  {roles.map((role) => (
                    <label
                      key={role.id}
                      className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={formData.roleIds.includes(role.id)}
                        onChange={() => handleRoleToggle(role.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <span className="text-sm font-medium text-gray-900">{role.name}</span>
                        {role.description && (
                          <p className="text-xs text-gray-500">{role.description}</p>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Selected {formData.roleIds.length} role(s)
            </p>
          </div>

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
              {group ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GroupModal;

