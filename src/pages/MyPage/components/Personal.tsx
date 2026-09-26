import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../../contexts/AuthContext';
import { authAPI } from '../../../services/api';
import { useUserPhoto } from '../../../hooks/useUserPhoto';
import { Gender } from '../../../types';
import { notify } from '../../../utils/notifications';
import { useConfirmDialog } from '../../../utils/confirmDialog';
import ProfileCompletionBanner from './ProfileCompletionBanner';

const GENDER_OPTIONS: Array<{ value: Gender; label: string }> = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other', label: 'Other' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const inputClass =
  'w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500';

const genderLabel = (value?: Gender): string => {
  const found = GENDER_OPTIONS.find(option => option.value === value);
  return found ? found.label : 'Not provided';
};

const formatDate = (value?: string): string =>
  value ? new Date(value).toLocaleDateString() : 'Not provided';

/** The API returns a full ISO timestamp; the date input needs YYYY-MM-DD. */
const toDateInput = (value?: string): string => (value ? value.split('T')[0] : '');

const Personal: React.FC = () => {
  const { user, updateCurrentUser } = useAuth();
  const { confirm, Dialog } = useConfirmDialog();
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    dateOfBirth: '',
    gender: '' as Gender | '',
    occupation: '',
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [activeSection, setActiveSection] = useState<'profile' | 'password'>('profile');

  const photoUrl = useUserPhoto(user?.id, !!user?.photoPath, user?.updatedAt);

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: user.address || '',
        dateOfBirth: toDateInput(user.dateOfBirth),
        gender: user.gender || '',
        occupation: user.occupation || '',
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      const response = await authAPI.updateProfile({
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
        dateOfBirth: formData.dateOfBirth || undefined,
        gender: formData.gender || undefined,
        occupation: formData.occupation || undefined,
      });
      updateCurrentUser(response.data);
      notify.success('Profile updated successfully');
      setIsEditing(false);
    } catch (error: any) {
      notify.error(error.response?.data?.message || 'Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    // Reset immediately so picking the same file twice still fires onChange.
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (!file) return;

    if (ACCEPTED_PHOTO_TYPES.indexOf(file.type) === -1) {
      notify.error('Please choose a JPEG, PNG or WebP image');
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      notify.error('Image must be 5MB or smaller');
      return;
    }

    try {
      setIsUploading(true);
      const response = await authAPI.uploadProfilePhoto(file);
      updateCurrentUser(response.data);
      notify.success('Photo updated');
    } catch (error: any) {
      notify.error(error.response?.data?.message || 'Error uploading photo');
    } finally {
      setIsUploading(false);
    }
  };

  const handlePhotoRemove = () => {
    confirm('Remove Photo', 'Remove your profile photo?', async () => {
      try {
        const response = await authAPI.removeProfilePhoto();
        updateCurrentUser(response.data);
        notify.success('Photo removed');
      } catch (error: any) {
        notify.error(error.response?.data?.message || 'Error removing photo');
      }
    }, { confirmText: 'Remove', confirmColor: 'red' });
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      notify.error('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      notify.error('Password must be at least 6 characters long');
      return;
    }

    confirm(
      'Change Password',
      'Are you sure you want to change your password? Your other devices will be signed out.',
      async () => {
        try {
          await authAPI.changePassword({
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword,
          });
          notify.success('Password changed successfully');
          setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error: any) {
          notify.error(error.response?.data?.message || 'Error changing password');
        }
      }
    );
  };

  const initials = (user?.name || 'U')
    .split(' ')
    .map(part => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Personal Information</h2>
        <p className="text-gray-600">Manage your personal information and account settings</p>
      </div>

      <ProfileCompletionBanner user={user} />

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveSection('profile')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeSection === 'profile'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Profile
          </button>
          <button
            onClick={() => setActiveSection('password')}
            className={`px-4 py-2 font-medium transition-colors ${
              activeSection === 'password'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Change Password
          </button>
        </div>
      </div>

      {activeSection === 'profile' && (
        <div className="bg-white rounded-lg shadow p-6">
          {/* Photo */}
          <div className="flex items-center space-x-6 mb-8 pb-6 border-b border-gray-200">
            <div className="w-24 h-24 rounded-full overflow-hidden bg-blue-500 flex items-center justify-center text-white text-2xl font-semibold flex-shrink-0">
              {photoUrl ? (
                <img src={photoUrl} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{initials}</span>
              )}
            </div>
            <div>
              <p className="font-medium text-gray-900 mb-1">Profile photo</p>
              <p className="text-sm text-gray-600 mb-3">JPEG, PNG or WebP, up to 5MB.</p>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current && fileInputRef.current.click()}
                  disabled={isUploading}
                  className="px-3 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
                >
                  {isUploading ? 'Uploading...' : user?.photoPath ? 'Replace photo' : 'Upload photo'}
                </button>
                {user?.photoPath && (
                  <button
                    type="button"
                    onClick={handlePhotoRemove}
                    className="px-3 py-2 text-sm border border-gray-300 rounded hover:bg-gray-100"
                  >
                    Remove
                  </button>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>
          </div>

          {!isEditing ? (
            <div>
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h3 className="text-xl font-semibold mb-1">{user?.name}</h3>
                  <p className="text-gray-600">{user?.email}</p>
                </div>
                <button
                  onClick={() => setIsEditing(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                >
                  Edit Profile
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <p className="text-gray-900">{user?.name || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <p className="text-gray-900">{user?.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                  <p className="text-gray-900">{user?.phone || 'Not provided'}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth</label>
                  <p className="text-gray-900">{formatDate(user?.dateOfBirth)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
                  <p className="text-gray-900">{genderLabel(user?.gender)}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Occupation</label>
                  <p className="text-gray-900">{user?.occupation || 'Not provided'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                  <p className="text-gray-900">{user?.address || 'Not provided'}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Groups</label>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {user?.groups && user.groups.length > 0 ? (
                      user.groups.map(group => (
                        <span
                          key={group.id}
                          className="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800"
                        >
                          {group.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-gray-500">No groups assigned</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProfileUpdate}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input type="email" value={formData.email} disabled className={`${inputClass} bg-gray-100 cursor-not-allowed`} />
                  <p className="text-xs text-gray-500 mt-1">Email cannot be changed</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone *</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date of birth *</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    max={new Date().toISOString().split('T')[0]}
                    onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                    required
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Gender *</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({ ...formData, gender: e.target.value as Gender })}
                    required
                    className={inputClass}
                  >
                    <option value="">Select an option</option>
                    {GENDER_OPTIONS.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Occupation *</label>
                  <input
                    type="text"
                    value={formData.occupation}
                    onChange={(e) => setFormData({ ...formData, occupation: e.target.value })}
                    required
                    maxLength={120}
                    placeholder="e.g. Student, Engineer, Teacher"
                    className={inputClass}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Address *</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    required
                    className={inputClass}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:bg-gray-400"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {activeSection === 'password' && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-xl font-semibold mb-4">Change Password</h3>
          <form onSubmit={handlePasswordChange}>
            <div className="space-y-4 max-w-md">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Current Password *</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  required
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Password *</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  required
                  minLength={6}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password *</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  required
                  minLength={6}
                  className={inputClass}
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Change Password
              </button>
            </div>
          </form>
        </div>
      )}

      <Dialog />
    </div>
  );
};

export default Personal;
