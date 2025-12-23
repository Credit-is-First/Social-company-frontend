import React, { useState, useEffect } from 'react';
import { groupsAPI, rolesAPI } from '../../../services/api';
import { Group, Role } from '../../../types';
import GroupModal from './components/GroupModal';
import { notify } from '../../../utils/notifications';
import { useConfirmDialog } from '../../../utils/confirmDialog';
import { useAuth } from '../../../contexts/AuthContext';

const GroupsManagement: React.FC = () => {
  const { hasRole } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);
  const { confirm, Dialog } = useConfirmDialog();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async (): Promise<void> => {
    try {
      setLoading(true);
      const [groupsRes, rolesRes] = await Promise.all([
        groupsAPI.getAll(),
        rolesAPI.getAll(),
      ]);
      setGroups(groupsRes.data);
      setRoles(rolesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      notify.error('Error fetching groups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = (): void => {
    setEditingGroup(null);
    setIsModalOpen(true);
  };

  const handleEdit = (group: Group): void => {
    setEditingGroup(group);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string): Promise<void> => {
    confirm(
      'Delete Group',
      'Are you sure you want to delete this group? This action cannot be undone.',
      async () => {
        try {
          await groupsAPI.delete(id);
          notify.success('Group deleted successfully');
          fetchData();
        } catch (error: any) {
          console.error('Error deleting group:', error);
          notify.error(error.response?.data?.message || 'Error deleting group');
        }
      },
      { confirmText: 'Delete', confirmColor: 'red' }
    );
  };

  const handleModalClose = (): void => {
    setIsModalOpen(false);
    setEditingGroup(null);
    fetchData();
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Groups Management</h2>
      </div>
      <div className="flex justify-between items-center mb-6">
        <div></div>
        {hasRole('group:create') && (
          <button
            onClick={handleCreate}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            + Add Group
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-8">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.map((group) => (
            <div key={group.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-xl font-semibold mb-1">{group.name}</h3>
                  {group.isDefault && (
                    <span className="inline-block px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      Default
                    </span>
                  )}
                </div>
                <div className="flex space-x-2">
                  {hasRole('group:update') && (
                    <button
                      onClick={() => handleEdit(group)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      Edit
                    </button>
                  )}
                  {!group.isDefault && hasRole('group:delete') && (
                    <button
                      onClick={() => handleDelete(group.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>
              
              {group.description && (
                <p className="text-gray-600 text-sm mb-3">{group.description}</p>
              )}

              <div className="mt-3">
                <p className="text-sm font-medium text-gray-700 mb-2">Roles:</p>
                <div className="flex flex-wrap gap-2">
                  {group.roles && group.roles.length > 0 ? (
                    group.roles.map((role) => (
                      <span
                        key={role.id}
                        className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800"
                      >
                        {role.name}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-gray-400">No roles assigned</span>
                  )}
                </div>
              </div>

              <div className="mt-4 text-xs text-gray-500">
                Created: {new Date(group.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <GroupModal
          group={editingGroup}
          roles={roles}
          onClose={handleModalClose}
        />
      )}
      <Dialog />
    </div>
  );
};

export default GroupsManagement;

