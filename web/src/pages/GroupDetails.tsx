import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useGroup } from '../context/GroupContext';
import Dashboard from './Dashboard';
import Stats from './Stats';

interface Group {
  _id: string;
  name: string;
  description?: string;
  createdByUserId: {
    id?: string;  // User model transforms _id to id in toJSON
    _id?: string;  // Fallback in case it's not transformed
    username: string;
    displayName: string;
  };
  memberIds: Array<{
    id?: string;  // User model transforms _id to id in toJSON
    _id?: string;  // Fallback in case it's not transformed
    username: string;
    displayName: string;
  }>;
  isPublic: boolean;
  createdAt: string;
}

type Tab = 'games' | 'stats';

const GroupDetails = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshGroups, fetchGroupDetails, groupDetailsCache } = useGroup();
  const [group, setGroup] = useState<Group | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState<Tab>('games');
  const [usernameToAdd, setUsernameToAdd] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [updating, setUpdating] = useState(false);
  const [showManage, setShowManage] = useState(false);

  useEffect(() => {
    if (groupId) {
      fetchGroup();
    }
  }, [groupId]);

  const fetchGroup = async () => {
    setLoading(true);
    setError('');
    
    // Check cache first - show immediately if available
    const cached = groupDetailsCache.get(groupId!);
    if (cached) {
      setGroup(cached);
      setGroupName(cached.name);
      setGroupDescription(cached.description || '');
      setLoading(false);
      // Fetch fresh data in background (non-blocking)
      fetchGroupDetails(groupId!).catch(() => {
        // Silently fail background refresh
      });
      return;
    }

    // Not in cache - fetch normally
    try {
      const groupDetails = await fetchGroupDetails(groupId!);
      if (groupDetails) {
        setGroup(groupDetails);
        setGroupName(groupDetails.name);
        setGroupDescription(groupDetails.description || '');
      }
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load group');
      setLoading(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!usernameToAdd.trim()) {
      setError('Username is required');
      return;
    }

    setAddingMember(true);

    try {
      await apiClient.post(`/groups/${groupId}/members`, { username: usernameToAdd.trim() });
      setUsernameToAdd('');
      await fetchGroup();
      await refreshGroups();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!window.confirm('Are you sure you want to remove this member?')) {
      return;
    }

    try {
      await apiClient.delete(`/groups/${groupId}/members/${userId}`);
      await fetchGroup();
      await refreshGroups();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to remove member');
    }
  };

  const handleDeleteGroup = async () => {
    setDeleting(true);

    try {
      await apiClient.delete(`/groups/${groupId}`);
      await refreshGroups();
      navigate('/groups');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete group');
      setDeleting(false);
    }
  };

  const handleUpdateGroup = async () => {
    setUpdating(true);
    setError('');

    try {
      const response = await apiClient.patch(`/groups/${groupId}`, {
        name: groupName.trim(),
        description: groupDescription.trim(),
      });
      setGroup(response.data);
      setEditingName(false);
      await refreshGroups();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update group');
    } finally {
      setUpdating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error && !group) {
    return (
      <div className="px-4 sm:px-0">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button
          onClick={() => navigate('/groups')}
          className="text-blue-600 hover:text-blue-500"
        >
          ← Back to Groups
        </button>
      </div>
    );
  }

  if (!group) {
    return null;
  }

  // Normalize IDs for comparison - User model transforms _id to id in toJSON
  const ownerId = group.createdByUserId?.id || group.createdByUserId?._id;
  const ownerIdStr = ownerId ? String(ownerId) : '';
  const currentUserIdStr = user?.id ? String(user.id) : '';
  const isAdmin = ownerIdStr && currentUserIdStr && ownerIdStr === currentUserIdStr;

  return (
    <div className="px-4 sm:px-0">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/groups')}
              className="text-blue-600 hover:text-blue-500 text-sm"
            >
              ← Back to Groups
            </button>
            <div className="h-6 w-px bg-gray-300"></div>
            <div>
              {editingName && isAdmin ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    className="text-2xl font-bold border-b-2 border-blue-500 focus:outline-none"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleUpdateGroup();
                      } else if (e.key === 'Escape') {
                        setEditingName(false);
                        setGroupName(group.name);
                        setGroupDescription(group.description || '');
                      }
                    }}
                    autoFocus
                  />
                  <button
                    onClick={handleUpdateGroup}
                    disabled={updating || !groupName.trim()}
                    className="text-blue-600 hover:text-blue-800 text-sm disabled:opacity-50"
                  >
                    {updating ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => {
                      setEditingName(false);
                      setGroupName(group.name);
                      setGroupDescription(group.description || '');
                    }}
                    className="text-gray-600 hover:text-gray-800 text-sm"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
                  {isAdmin && (
                    <button
                      onClick={() => setEditingName(true)}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                      title="Edit group name"
                    >
                      ✏️
                    </button>
                  )}
                </div>
              )}
              <div className="flex items-center space-x-2 mt-1">
                <p className="text-sm text-gray-500">
                  Owner: <span className="font-medium">{group.createdByUserId.displayName}</span>
                </p>
                {isAdmin && (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Admin
                  </span>
                )}
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                  group.isPublic 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {group.isPublic ? 'Public' : 'Private'}
                </span>
              </div>
            </div>
          </div>
          {user && (
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setShowManage(!showManage)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
              >
                {showManage ? 'Hide' : 'Manage'}
              </button>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('games')}
              className={`${
                activeTab === 'games'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Games
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`${
                activeTab === 'stats'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              Statistics
            </button>
          </nav>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Manage Section - Only show if user is logged in */}
      {showManage && user && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Group Management</h2>
          
          {group.description && !editingName && (
            <p className="text-sm text-gray-600 mb-4">{group.description}</p>
          )}

          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Add Member</h3>
            <form onSubmit={handleAddMember} className="flex space-x-2">
              <input
                type="text"
                value={usernameToAdd}
                onChange={(e) => setUsernameToAdd(e.target.value)}
                placeholder="Enter username (e.g., alice)"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
              />
              <button
                type="submit"
                disabled={addingMember || !usernameToAdd.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {addingMember ? 'Adding...' : 'Add Member'}
              </button>
            </form>
            <p className="text-xs text-gray-500 mt-2">
              Enter the username of the person you want to add to this group
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Members</h3>
              <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {group.memberIds.length} {group.memberIds.length === 1 ? 'member' : 'members'}
              </span>
            </div>
            <div className="space-y-3">
              {group.memberIds.map((member) => {
                // Extract owner ID - User model's toJSON transforms _id to id
                const ownerId = group.createdByUserId?.id || group.createdByUserId?._id;
                const ownerIdStr = ownerId ? String(ownerId) : '';
                
                // Extract member ID - User model's toJSON transforms _id to id
                const memberId = member?.id || member?._id;
                const memberIdStr = memberId ? String(memberId) : '';
                
                // Only compare if both IDs exist and match exactly
                const isMemberOwner = Boolean(
                  ownerIdStr && 
                  memberIdStr && 
                  ownerIdStr === memberIdStr
                );

                return (
                  <div
                    key={member.id || member._id}
                    className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-semibold text-sm">
                          {member.displayName.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{member.displayName}</span>
                          {isMemberOwner && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                              Owner
                            </span>
                          )}
                        </div>
                        <span className="text-sm text-gray-500">@{member.username}</span>
                      </div>
                    </div>
                    <div className="ml-4 flex items-center">
                      {isMemberOwner ? (
                        <span className="text-xs text-gray-400 italic">Cannot remove owner</span>
                      ) : isAdmin ? (
                        <button
                          onClick={() => handleRemoveMember(member.id || member._id || '')}
                          className="text-red-600 hover:text-red-800 text-sm font-medium px-3 py-1 rounded hover:bg-red-50 transition-colors"
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Delete Group Section - Only visible to admin */}
          {isAdmin && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Danger Zone</h3>
              <p className="text-xs text-gray-500 mb-3">
                Once you delete a group, there is no going back. Please be certain.
              </p>
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 hover:text-red-800 text-sm font-medium underline"
              >
                Delete this group
              </button>
            </div>
          )}
        </div>
      )}

      {showDeleteConfirm && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
          <p className="text-red-800 mb-3">
            Are you sure you want to delete this group? This action cannot be undone.
          </p>
          <div className="flex space-x-3">
            <button
              onClick={handleDeleteGroup}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
            >
              {deleting ? 'Deleting...' : 'Yes, Delete Group'}
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'games' && groupId && (
        <Dashboard key={groupId} groupId={groupId} />
      )}
      {activeTab === 'stats' && groupId && <Stats groupId={groupId} />}
    </div>
  );
};

export default GroupDetails;
