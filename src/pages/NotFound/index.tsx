import React from 'react';
import { Link, useHistory } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const NotFound: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const history = useHistory();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="text-center px-4">
        <div className="max-w-md mx-auto">
          <div className="mb-8">
            <h1 className="text-9xl font-bold text-blue-600">404</h1>
            <h2 className="text-3xl font-bold text-gray-800 mt-4 mb-2">Page Not Found</h2>
            <p className="text-gray-600 text-lg">
              Sorry, the page you are looking for does not exist.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => history.goBack()}
                className="px-6 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition font-medium"
              >
                ← Go Back
              </button>
              {isAuthenticated ? (
                <Link
                  to="/my-page/personal"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium inline-block"
                >
                  Go to Homepage
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium inline-block"
                >
                  Go to Login
                </Link>
              )}
            </div>
          </div>

          <div className="mt-8 text-gray-500 text-sm">
            <p>If you believe this is an error, please contact support.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
