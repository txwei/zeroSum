import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useState } from 'react';

const Layout = () => {
  const { user, logout, updateDisplayName } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showEditNameModal, setShowEditNameModal] = useState(false);
  const [newDisplayName, setNewDisplayName] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [error, setError] = useState('');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLogin = () => {
    navigate('/login');
  };

  const handleEditNameClick = () => {
    if (user) {
      setNewDisplayName(user.displayName);
      setShowEditNameModal(true);
      setError('');
    }
  };

  const handleUpdateName = async () => {
    if (!newDisplayName.trim()) {
      setError('Display name cannot be empty');
      return;
    }

    setIsUpdating(true);
    setError('');
    try {
      await updateDisplayName(newDisplayName.trim());
      setShowEditNameModal(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update name');
    } finally {
      setIsUpdating(false);
    }
  };

  const isGroupPage = location.pathname.startsWith('/groups/') && location.pathname !== '/groups';

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/" className="text-xl font-bold text-blue-600">
                  Zero-Sum Tracker
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                {!isGroupPage ? (
                <Link
                    to="/groups"
                    className="border-blue-500 text-blue-600 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                    Groups
                </Link>
                ) : (
                <Link
                    to="/groups"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                    Groups
                </Link>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2 sm:space-x-4">
              {user ? (
                <>
                  <div className="flex items-center space-x-2 hidden sm:flex">
                    <span className="text-gray-700 text-sm">{user.displayName}</span>
                    <button
                      onClick={handleEditNameClick}
                      className="text-gray-500 hover:text-gray-700 p-1 rounded-md hover:bg-gray-100"
                      title="Edit name"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 sm:px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={handleLogin}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Login
                  </button>
                  <Link
                    to="/signup"
                    className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-3 sm:px-4 py-2 rounded-md text-sm font-medium"
                  >
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
          {/* Mobile menu */}
          <div className="sm:hidden border-t border-gray-200">
            <div className="flex space-x-4 py-2">
              <Link
                to="/groups"
                className={`${
                  !isGroupPage ? 'text-blue-600 font-medium' : 'text-gray-500'
                } px-3 py-2 text-sm`}
              >
                Groups
              </Link>
              {user && (
                <button
                  onClick={handleEditNameClick}
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 text-sm flex items-center space-x-1"
                >
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  <span>Edit Name</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>

      {/* Edit Name Modal */}
      {showEditNameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Edit Display Name</h2>
              <button
                onClick={() => {
                  setShowEditNameModal(false);
                  setError('');
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}
            <div className="mb-4">
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                Display Name
              </label>
              <input
                id="displayName"
                type="text"
                value={newDisplayName}
                onChange={(e) => setNewDisplayName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleUpdateName();
                  } else if (e.key === 'Escape') {
                    setShowEditNameModal(false);
                    setError('');
                  }
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Enter your display name"
                autoFocus
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowEditNameModal(false);
                  setError('');
                }}
                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md text-sm font-medium"
                disabled={isUpdating}
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateName}
                disabled={isUpdating}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isUpdating ? 'Updating...' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Layout;

