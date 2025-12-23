import React, { useState, useEffect } from 'react';
import { rolesAPI } from '../../../services/api';
import { Role } from '../../../types';
import { notify } from '../../../utils/notifications';

const RolesManagement: React.FC = () => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState<string>('');

  useEffect(() => {
    fetchRoles();
  }, []);

  const fetchRoles = async (): Promise<void> => {
    try {
      setLoading(true);
      const response = await rolesAPI.getAll();
      setRoles(response.data);
    } catch (error) {
      console.error('Error fetching roles:', error);
      notify.error('Error fetching roles');
    } finally {
      setLoading(false);
    }
  };

  const filteredRoles = roles.filter(role =>
    role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (role.description && role.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-3xl font-bold">Roles Management</h2>
      </div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search roles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading roles...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRoles.map((role) => (
            <div key={role.id} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-xl font-semibold mb-2">{role.name}</h3>
              {role.description && (
                <p className="text-gray-600 text-sm mb-3">{role.description}</p>
              )}
              <div className="mt-4 text-xs text-gray-500">
                Created: {new Date(role.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
          {filteredRoles.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-500">
              No roles found
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default RolesManagement;

