import React from 'react';
import { Link } from 'react-router-dom';
import { User } from '../../../types';

interface Props {
  user: User | null;
  /** Adds a link through to the profile page; omit when already on it. */
  withLink?: boolean;
}

/**
 * Tells the member exactly which fields are outstanding, rather than leaving
 * them to discover the borrow button does nothing.
 */
const ProfileCompletionBanner: React.FC<Props> = ({ user, withLink }) => {
  if (!user || user.profileComplete) {
    return null;
  }

  const missing = user.missingProfileFields || [];

  return (
    <div className="mb-6 bg-amber-50 border border-amber-300 rounded-lg p-4">
      <div className="flex items-start space-x-3">
        <span className="text-2xl leading-none">📋</span>
        <div className="flex-1">
          <p className="font-semibold text-amber-900">Complete your profile to borrow books</p>
          <p className="text-sm text-amber-800 mt-1">
            You can browse the catalogue now, but borrowing stays locked until these are filled in:
          </p>
          <ul className="mt-2 flex flex-wrap gap-2">
            {missing.map(field => (
              <li
                key={field}
                className="px-2 py-1 text-xs font-medium rounded-full bg-amber-200 text-amber-900"
              >
                {field}
              </li>
            ))}
          </ul>
          {withLink && (
            <Link
              to="/my-page/personal"
              className="inline-block mt-3 text-sm font-medium text-amber-900 underline hover:text-amber-700"
            >
              Go to my profile
            </Link>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileCompletionBanner;
