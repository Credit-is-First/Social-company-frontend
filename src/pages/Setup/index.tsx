import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useHistory, Redirect, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { RegisterDto } from '../../types';

const SECURITY_QUESTIONS = [
  'What was the name of your first pet?',
  'What city were you born in?',
  'What was your mother\'s maiden name?',
  'What was the name of your elementary school?',
  'What is your favorite movie?',
];

const Setup: React.FC = () => {
  const [formData, setFormData] = useState<RegisterDto & { confirmPassword: string }>({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    address: '',
    securityQuestion: '',
    securityAnswer: '',
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const { completeSetup, needsSetup, checkingSetup, isAuthenticated } = useAuth();
  const history = useHistory();
  const location = useLocation();

  // Get 'from' from location state or query parameter (for backward compatibility)
  const getFromPath = (defaultPath: string = '/my-page/personal'): string => {
    const stateFrom = (location.state as any)?.from;
    if (stateFrom) return stateFrom;
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('from') || defaultPath;
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = getFromPath();
      history.replace(from);
    }
  }, [isAuthenticated, location, history]);

  // Redirect if setup is already complete
  useEffect(() => {
    if (!checkingSetup && needsSetup === false) {
      const from = getFromPath('/login');
      history.replace(from);
    }
  }, [needsSetup, checkingSetup, location, history]);

  // Don't render if already authenticated
  if (isAuthenticated) {
    const from = getFromPath();
    return <Redirect to={from} />;
  }

  // Don't render if setup is already complete
  if (!checkingSetup && needsSetup === false) {
    const from = getFromPath('/login');
    return <Redirect to={from} />;
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>): void => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setLoading(true);

    try {
      // Remove confirmPassword before sending
      const { confirmPassword, ...registerData } = formData;
      // Use setupSuperAdmin endpoint instead of register
      const { authAPI } = await import('../../services/api');
      // setupSuperAdmin only returns user, not token
      await authAPI.setupSuperAdmin(registerData);
      // Mark setup as complete in AuthContext
      completeSetup();
      // Redirect to login page after successful setup
      history.push('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to create admin account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white rounded-lg shadow-xl p-8">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
            <svg
              className="h-8 w-8 text-blue-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h2 className="text-3xl font-extrabold text-gray-900">
            Initial Setup
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your super admin account to get started
          </p>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Full Name *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.name}
                onChange={handleChange}
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.email}
                onChange={handleChange}
                placeholder="admin@example.com"
              />
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
                Phone *
              </label>
              <input
                id="phone"
                name="phone"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.phone}
                onChange={handleChange}
                placeholder="+1234567890"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password *
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.password}
                onChange={handleChange}
                placeholder="Minimum 6 characters"
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password *
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.confirmPassword}
                onChange={handleChange}
                placeholder="Re-enter your password"
                minLength={6}
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address
              </label>
              <textarea
                id="address"
                name="address"
                rows={2}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.address}
                onChange={handleChange}
                placeholder="Optional address"
              />
            </div>

            <div>
              <label htmlFor="securityQuestion" className="block text-sm font-medium text-gray-700">
                Security Question *
              </label>
              <select
                id="securityQuestion"
                name="securityQuestion"
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.securityQuestion}
                onChange={handleChange}
              >
                <option value="">Select a security question</option>
                {SECURITY_QUESTIONS.map((question, index) => (
                  <option key={index} value={question}>
                    {question}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="securityAnswer" className="block text-sm font-medium text-gray-700">
                Security Answer *
              </label>
              <input
                id="securityAnswer"
                name="securityAnswer"
                type="text"
                required
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                value={formData.securityAnswer}
                onChange={handleChange}
                placeholder="Your answer to the security question"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Creating admin account...' : 'Create Super Admin Account'}
            </button>
          </div>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              This will create the first admin account for the system. Make sure to keep your credentials secure.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Setup;
