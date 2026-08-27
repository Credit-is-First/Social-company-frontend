import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { usersAPI, rolesAPI, groupsAPI } from '../../../../services/api';
import { User, Role, Group } from '../../../../types';
import { notify } from '../../../../utils/notifications';

interface UserModalProps {
  /** null puts the modal in "create account" mode. */
  user: User | null;
  onClose: () => void;
}

interface UserFormData {
  name: string;
  email: string;
  phone: string;
  password: string;
  address: string;
  roleIds: string[];
  groupIds: string[];
}

const MIN_PASSWORD_LENGTH = 8;

const emptyForm: UserFormData = {
  name: '',
  email: '',
  phone: '',
  password: '',
  address: '',
  roleIds: [],
  groupIds: [],
};

const UserModal: React.FC<UserModalProps> = ({ user, onClose }) => {
  const isEditing = !!user;
  const [formData, setFormData] = useState<UserFormData>(emptyForm);
  const [roles, setRoles] = useState<Role[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

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
        notify.error('Error loading roles and groups');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (user) {
      setFormData({
        ...emptyForm,
        name: user.name,
        email: user.email,
        phone: user.phone,
        address: user.address || '',
        roleIds: user.roles?.map(r => r.id) || [],
        groupIds: user.groups?.map(g => g.id) || [],
      });
    } else {
      setFormData(emptyForm);
    }
  }, [user]);

  const handleFieldChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const toggleId = (key: 'roleIds' | 'groupIds', id: string): void => {
    setFormData(prev => ({
      ...prev,
      [key]: prev[key].indexOf(id) !== -1
        ? prev[key].filter(existing => existing !== id)
        : prev[key].concat(id),
    }));
  };

  const submitCreate = async (): Promise<void> => {
    if (formData.password.length < MIN_PASSWORD_LENGTH) {
      notify.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }

    await usersAPI.create({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      address: formData.address || undefined,
      roleIds: formData.roleIds,
      groupIds: formData.groupIds.length > 0 ? formData.groupIds : undefined,
    });
    notify.success('User created successfully');
  };

  const submitUpdate = async (): Promise<void> => {
    if (!user) return;

    const rolesChanged =
      formData.roleIds.length !== (user.roles?.length || 0) ||
      !formData.roleIds.every(id => user.roles?.some(r => r.id === id));
    const groupsChanged =
      formData.groupIds.length !== (user.groups?.length || 0) ||
      !formData.groupIds.every(id => user.groups?.some(g => g.id === id));

    if (rolesChanged) {
      await usersAPI.updateRoles(user.id, formData.roleIds);
    }
    if (groupsChanged) {
      await usersAPI.updateGroups(user.id, formData.groupIds);
    }
    notify.success('User updated successfully');
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      if (isEditing) {
        await submitUpdate();
      } else {
        await submitCreate();
      }
      onClose();
    } catch (error: any) {
      console.error('Error saving user:', error);
      notify.error(error.response?.data?.message || 'Error saving user');
    } finally {
      setIsSubmitting(false);
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

  const checkboxList = (
    items: Array<{ id: string; name: string }>,
    selected: string[],
    key: 'roleIds' | 'groupIds',
    emptyLabel: string,
  ) => (
    <div className="border border-gray-300 rounded p-3 max-h-32 overflow-y-auto">
      {items.length === 0 ? (
        <p className="text-sm text-gray-500">{emptyLabel}</p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <label
              key={item.id}
              className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded"
            >
              <input
                type="checkbox"
                checked={selected.indexOf(item.id) !== -1}
                onChange={() => toggleId(key, item.id)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm">{item.name}</span>
            </label>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-2xl flex flex-col" style={{ maxHeight: '90vh' }}>
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-2xl font-bold">{isEditing ? 'Edit User' : 'Create User'}</h3>
          {!isEditing && (
            <p className="text-sm text-gray-600 mt-1">
              The account is created with the password you set here. Ask the person to change it
              after their first sign-in. With no group selected they join the User group.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6">
            {!isEditing && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Full Name *</label>
                    <input
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleFieldChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Email *</label>
                    <input
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleFieldChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Phone *</label>
                    <input
                      name="phone"
                      type="text"
                      required
                      value={formData.phone}
                      onChange={handleFieldChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Initial Password * <span className="text-gray-500 font-normal">(min {MIN_PASSWORD_LENGTH})</span>
                    </label>
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={MIN_PASSWORD_LENGTH}
                      value={formData.password}
                      onChange={handleFieldChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1">Address</label>
                  <input
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={handleFieldChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </>
            )}

            {isEditing && (
              <div className="mb-4 bg-gray-50 border border-gray-200 rounded p-3">
                <p className="text-sm font-medium text-gray-800">{formData.name}</p>
                <p className="text-sm text-gray-600">{formData.email}</p>
                <p className="mt-2 text-xs text-gray-500">
                  Personal details can only be changed by the account holder from their own profile.
                </p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Groups</label>
              {checkboxList(groups, formData.groupIds, 'groupIds', 'No groups available')}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Direct Roles</label>
              {checkboxList(roles, formData.roleIds, 'roleIds', 'No roles available')}
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
              disabled={isSubmitting}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default UserModal;
