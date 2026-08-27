import React, { useState, FormEvent, ChangeEvent } from 'react';
import { useHistory, Link } from 'react-router-dom';
import { authAPI } from '../../../services/api';
import { ResetPasswordDto } from '../../../types';

const inputClass =
  'mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm';

const ResetPassword: React.FC = () => {
  const [formData, setFormData] = useState<ResetPasswordDto>({
    email: '',
    securityAnswer: '',
    newPassword: '',
  });
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  // The question is fetched for the entered address, so the user can actually
  // see what they are answering.
  const [securityQuestion, setSecurityQuestion] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [success, setSuccess] = useState<string>('');
  const [lookingUp, setLookingUp] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const history = useHistory();

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleLookup = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setLookingUp(true);

    try {
      const response = await authAPI.getSecurityQuestion(formData.email);
      setSecurityQuestion(response.data.securityQuestion);
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError('Too many attempts. Please wait a few minutes and try again.');
      } else if (err.response?.status === 404) {
        setError('No security question is set for that email address.');
      } else {
        setError(err.response?.data?.message || 'Could not look up your security question');
      }
    } finally {
      setLookingUp(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (formData.newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await authAPI.resetPassword(formData);
      setSuccess('Password reset successfully! Redirecting to login...');
      setTimeout(() => {
        history.push('/login');
      }, 2000);
    } catch (err: any) {
      if (err.response?.status === 429) {
        setError('Too many attempts. Please wait a few minutes and try again.');
      } else {
        setError(err.response?.data?.message || 'Failed to reset password');
      }
    } finally {
      setLoading(false);
    }
  };

  const startOver = (): void => {
    setSecurityQuestion('');
    setFormData(prev => ({ ...prev, securityAnswer: '', newPassword: '' }));
    setConfirmPassword('');
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Reset Password
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            {securityQuestion
              ? 'Answer your security question to choose a new password'
              : 'Enter your email to look up your security question'}
          </p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}
        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        )}

        {!securityQuestion ? (
          <form className="mt-8 space-y-6" onSubmit={handleLookup}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email *
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className={inputClass}
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <button
              type="submit"
              disabled={lookingUp}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {lookingUp ? 'Looking up...' : 'Continue'}
            </button>

            <div className="text-center text-sm">
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Back to login
              </Link>
            </div>
          </form>
        ) : (
          <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
            <div className="bg-blue-50 border border-blue-200 rounded p-4">
              <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">
                Security question
              </p>
              <p className="mt-1 text-sm text-blue-900">{securityQuestion}</p>
              <p className="mt-2 text-xs text-blue-700">for {formData.email}</p>
            </div>

            <div className="space-y-4">
              <div>
                <label htmlFor="securityAnswer" className="block text-sm font-medium text-gray-700">
                  Your Answer *
                </label>
                <input
                  id="securityAnswer"
                  name="securityAnswer"
                  type="text"
                  required
                  autoFocus
                  className={inputClass}
                  value={formData.securityAnswer}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700">
                  New Password *
                </label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  required
                  className={inputClass}
                  value={formData.newPassword}
                  onChange={handleChange}
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                  Confirm New Password *
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  required
                  className={inputClass}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Resetting password...' : 'Reset Password'}
            </button>

            <div className="flex justify-between text-sm">
              <button
                type="button"
                onClick={startOver}
                className="font-medium text-gray-600 hover:text-gray-800 focus:outline-none"
              >
                Use a different email
              </button>
              <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                Back to login
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;
