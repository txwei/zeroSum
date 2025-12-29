import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';

interface User {
  _id: string;
  id?: string;
  username: string;
  displayName: string;
}

interface PlayerAutocompleteProps {
  token: string;
  value: string;
  onChange: (value: string, userId?: string, playerName?: string) => void;
  onUserCreated?: (user: User) => void;
  placeholder?: string;
  excludeUserIds?: string[]; // User IDs to exclude from search results
  selectedUserId?: string; // The currently selected user ID (if any)
  selectedPlayerName?: string; // The currently selected player name (if any, not a member)
}

const PlayerAutocomplete = ({
  token,
  value,
  onChange,
  onUserCreated,
  placeholder = 'Enter player name...',
  excludeUserIds = [],
  selectedUserId,
  selectedPlayerName,
}: PlayerAutocompleteProps) => {
  const [searchQuery, setSearchQuery] = useState(value);
  const [searchResults, setSearchResults] = useState<{
    inGroup: User[];
    notInGroup: User[];
  }>({ inGroup: [], notInGroup: [] });
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);

  // Sync searchQuery with value prop
  useEffect(() => {
    setSearchQuery(value);
  }, [value]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [selectedNotInGroupUser, setSelectedNotInGroupUser] = useState<User | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const { login } = useAuth();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPosition, setDropdownPosition] = useState<'bottom' | 'top'>('bottom');
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Update dropdown position when scrolling or resizing
  useEffect(() => {
    const updatePosition = () => {
      if (showDropdown && wrapperRef.current) {
        const rect = wrapperRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        const dropdownHeight = 192; // max-h-48 = 12rem = 192px
        
        if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
          setDropdownPosition('top');
          setDropdownStyle({
            position: 'fixed',
            top: `${rect.top - dropdownHeight - 4}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            zIndex: 1000,
          });
        } else {
          setDropdownPosition('bottom');
          setDropdownStyle({
            position: 'fixed',
            top: `${rect.bottom + 4}px`,
            left: `${rect.left}px`,
            width: `${rect.width}px`,
            zIndex: 1000,
          });
        }
      }
    };

    if (showDropdown) {
      updatePosition();
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
    }

    return () => {
      window.removeEventListener('scroll', updatePosition, true);
      window.removeEventListener('resize', updatePosition);
    };
  }, [showDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node) &&
          dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Search users as user types
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery || searchQuery.trim().length < 2) {
        setSearchResults({ inGroup: [], notInGroup: [] });
        setShowDropdown(false);
        return;
      }

      setLoading(true);
      try {
        const response = await apiClient.get(`/games/public/${token}/search-users`, {
          params: { q: searchQuery.trim() },
        });
        
        // Filter out excluded user IDs
        const excludeSet = new Set(excludeUserIds.map(id => id.toString()));
        const filteredResults = {
          inGroup: response.data.inGroup.filter((user: User) => {
            const userId = user._id || user.id;
            return userId && !excludeSet.has(userId.toString());
          }),
          notInGroup: response.data.notInGroup.filter((user: User) => {
            const userId = user._id || user.id;
            return userId && !excludeSet.has(userId.toString());
          }),
        };
        
        setSearchResults(filteredResults);
        setShowDropdown(true);
      } catch (error) {
        console.error('Search users error:', error);
        setSearchResults({ inGroup: [], notInGroup: [] });
      } finally {
        setLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, token]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setSearchQuery(newValue);
    onChange(newValue); // Update parent with raw text
  };

  const handleSelectUser = (user: User) => {
    const userId = user._id || user.id;
    setSearchQuery(user.displayName);
    setShowDropdown(false);
    // Pass userId explicitly when user is selected
    onChange(user.displayName, userId, user.displayName);
  };

  const handleCreateNewUser = () => {
    setShowCreateModal(true);
    setShowDropdown(false);
  };

  const handleCreateUser = async () => {
    if (!searchQuery.trim()) {
      return;
    }

    setCreatingUser(true);
    try {
      // Use searchQuery as both username and displayName
      const username = searchQuery.trim().toLowerCase().replace(/\s+/g, '');
      const response = await apiClient.post(`/games/public/${token}/quick-signup`, {
        username,
        displayName: searchQuery.trim(),
      });

      const newUser = response.data;
      setSearchQuery(newUser.displayName);
      setShowCreateModal(false);
      onChange(newUser.displayName, newUser._id || newUser.id);
      
      // Call onUserCreated callback if provided
      if (onUserCreated) {
        onUserCreated(newUser);
      }
    } catch (error: any) {
      console.error('Create user error:', error);
      alert(error.response?.data?.error || 'Failed to create user');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleUserNotInGroup = (user: User) => {
    setSelectedNotInGroupUser(user);
    setShowLoginModal(true);
    setShowDropdown(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedNotInGroupUser) return;

    setLoginError('');
    setLoginLoading(true);

    try {
      // Login the user
      await login(loginUsername, loginPassword);

      // Verify the logged-in user matches the selected user
      const currentUser = await apiClient.get('/users/me');
      const loggedInUserId = currentUser.data.id || currentUser.data._id;
      const selectedUserId = selectedNotInGroupUser._id || selectedNotInGroupUser.id;

      if (!selectedUserId) {
        setLoginError('Invalid user selected');
        setLoginLoading(false);
        return;
      }

      if (loggedInUserId.toString() !== selectedUserId.toString()) {
        setLoginError('You can only add yourself to the group. Please log in as this user.');
        setLoginLoading(false);
        return;
      }

      // Add user to group after login
      await apiClient.post(`/games/public/${token}/add-user-to-group`, {
        userId: selectedUserId,
      });

      // Refresh members list and select the user
      // The parent component should refresh members, but for now just select
      handleSelectUser(selectedNotInGroupUser);
      setShowLoginModal(false);
      setSelectedNotInGroupUser(null);
      setLoginUsername('');
      setLoginPassword('');
    } catch (error: any) {
      setLoginError(error.message || error.response?.data?.error || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const hasResults = searchResults.inGroup.length > 0 || searchResults.notInGroup.length > 0;
  const showCreateOption = searchQuery.trim().length >= 2;
  
  // Determine if current value represents a selected user
  const isMember = Boolean(selectedUserId);
  const isNameOnly = Boolean(selectedPlayerName && !selectedUserId);

  return (
    <>
      <div ref={wrapperRef} className="relative">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={handleInputChange}
            onFocus={() => {
              if (hasResults || showCreateOption) {
                // Calculate dropdown position using fixed positioning relative to viewport
                if (wrapperRef.current) {
                  const rect = wrapperRef.current.getBoundingClientRect();
                  const spaceBelow = window.innerHeight - rect.bottom;
                  const spaceAbove = rect.top;
                  const dropdownHeight = 192; // max-h-48 = 12rem = 192px
                  
                  // Position above if not enough space below AND more space above
                  if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
                    setDropdownPosition('top');
                    setDropdownStyle({
                      position: 'fixed',
                      top: `${rect.top - dropdownHeight - 4}px`,
                      left: `${rect.left}px`,
                      width: `${rect.width}px`,
                      zIndex: 1000,
                    });
                  } else {
                    setDropdownPosition('bottom');
                    setDropdownStyle({
                      position: 'fixed',
                      top: `${rect.bottom + 4}px`,
                      left: `${rect.left}px`,
                      width: `${rect.width}px`,
                      zIndex: 1000,
                    });
                  }
                }
                setShowDropdown(true);
              }
            }}
            placeholder={placeholder}
            className={`w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm pr-24 ${
              isMember ? 'bg-blue-50 border-blue-300' : isNameOnly ? 'bg-gray-50 border-gray-300' : ''
            }`}
          />
          {value && (
            <span className={`absolute right-2 top-1/2 transform -translate-y-1/2 text-xs px-2 py-0.5 rounded font-medium ${
              isMember ? 'text-blue-700 bg-blue-100' : isNameOnly ? 'text-gray-600 bg-gray-100' : 'text-gray-400 bg-gray-50'
            }`}>
              {isMember ? '✓ Member' : isNameOnly ? 'Name Only' : ''}
            </span>
          )}
        </div>

        {showDropdown && (hasResults || showCreateOption) && createPortal(
          <div 
            ref={dropdownRef}
            className="bg-white shadow-lg max-h-48 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none" 
            style={{ ...dropdownStyle, maxHeight: '12rem' }}
          >
            {loading && (
              <div className="px-4 py-2 text-sm text-gray-500">Searching...</div>
            )}

            {/* Users in group */}
            {searchResults.inGroup.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                  In Group
                </div>
                {searchResults.inGroup.map((user) => (
                  <button
                    key={user._id || user.id}
                    type="button"
                    onClick={() => handleSelectUser(user)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 focus:bg-gray-100"
                  >
                    <div className="font-medium">{user.displayName}</div>
                    <div className="text-xs text-gray-500">@{user.username}</div>
                  </button>
                ))}
              </>
            )}

            {/* Users not in group */}
            {searchResults.notInGroup.length > 0 && (
              <>
                <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase bg-gray-50">
                  Not in Group (Login Required)
                </div>
                {searchResults.notInGroup.map((user) => (
                  <button
                    key={user._id || user.id}
                    type="button"
                    onClick={() => handleUserNotInGroup(user)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-900 hover:bg-gray-100 focus:bg-gray-100"
                  >
                    <div className="font-medium">{user.displayName}</div>
                    <div className="text-xs text-gray-500">@{user.username} - Click to login and add</div>
                  </button>
                ))}
              </>
            )}

            {/* Create new user option */}
            {showCreateOption && (
              <>
                <div className="border-t border-gray-200 my-1"></div>
                <button
                  type="button"
                  onClick={handleCreateNewUser}
                  className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 focus:bg-blue-50 font-medium"
                >
                  + Create new user: "{searchQuery.trim()}"
                </button>
              </>
            )}
          </div>,
          document.body
        )}
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Create New User</h3>
            <p className="text-sm text-gray-600 mb-4">
              Create a new user account with the name "{searchQuery.trim()}". This user will be automatically added to the group.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateUser}
                disabled={creatingUser}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {creatingUser ? 'Creating...' : 'Create User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Login Modal for users not in group */}
      {showLoginModal && selectedNotInGroupUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Login Required</h3>
              <button
                onClick={() => {
                  setShowLoginModal(false);
                  setSelectedNotInGroupUser(null);
                  setLoginUsername('');
                  setLoginPassword('');
                  setLoginError('');
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                ✕
              </button>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              "{selectedNotInGroupUser.displayName}" exists but is not in this group. Please log in to add them.
            </p>
            <form onSubmit={handleLogin} className="space-y-4">
              {loginError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
                  {loginError}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  required
                />
              </div>
              <div className="flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowLoginModal(false);
                    setSelectedNotInGroupUser(null);
                    setLoginUsername('');
                    setLoginPassword('');
                    setLoginError('');
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {loginLoading ? 'Logging in...' : 'Login'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default PlayerAutocomplete;

