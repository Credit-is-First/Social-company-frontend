import React, { useState, useEffect, FormEvent, ChangeEvent } from 'react';
import { useHistory, Link, useLocation, Redirect } from 'react-router-dom';
import { useAuth } from '../../../contexts/AuthContext';
import { RegisterDto } from '../../../types';

const SECURITY_QUESTIONS = [
  'What was the name of your first pet?',
  'What city were you born in?',
  'What was your mother\'s maiden name?',
  'What was the name of your elementary school?',
  'What is your favorite movie?',
];

const Register: React.FC = () => {
  const [formData, setFormData] = useState<RegisterDto>({
    name: '',
    email: '',
    phone: '',
    password: '',
    address: '',
    securityQuestion: '',
    securityAnswer: '',
  });
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [registered, setRegistered] = useState<boolean>(false);
  const { register, isAuthenticated } = useAuth();
  const history = useHistory();
  const location = useLocation();

  // Get 'from' from location state or query parameter (for backward compatibility)
  const getFromPath = (): string => {
    const stateFrom = (location.state as any)?.from;
    if (stateFrom) return stateFrom;
    const searchParams = new URLSearchParams(location.search);
    return searchParams.get('from') || '/my-page/personal';
  };

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      const from = getFromPath();
      history.replace(from);
    }
  }, [isAuthenticated, location, history]);

  // Don't render if already authenticated
  if (isAuthenticated) {
    const from = getFromPath();
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
    setLoading(true);

    try {
      await register(formData);
      // Registration does not sign you in, so say what happens next rather than
      // dropping the user on the login page with no explanation.
      setRegistered(true);
    } catch (err: any) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  if (registered) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-6 text-center">
          <div className="text-5xl">✅</div>
          <h2 className="text-3xl font-extrabold text-gray-900">Account created</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6 text-left space-y-3">
            <p className="text-sm text-gray-700">
              Your account <span className="font-medium">{formData.email}</span> is ready. Sign in to
              browse the catalogue and request books.
            </p>
            <p className="text-sm text-gray-600">
              You start in the <span className="font-medium">User</span> group, which lets you borrow
              books. If you need to manage the catalogue, users or lending, ask an administrator to
              add you to another group.
            </p>
          </div>
          <button
            onClick={() => history.push('/login')}
            className="w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Go to sign in
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
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
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Sign up'}
            </button>
          </div>

          <div className="text-center text-sm">
            <span className="text-gray-600">Already have an account? </span>
            <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
              Sign in
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Register;

