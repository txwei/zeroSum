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
    _id: string;
    username: string;
    displayName: string;
  };
  memberIds: Array<{
    _id: string;
    username: string;
    displayName: string;
  }>;
  createdAt: string;
}

type Tab = 'games' | 'stats';

const GroupDetails = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { refreshGroups } = useGroup();
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
    try {
      const response = await apiClient.get(`/groups/${groupId}`);
      setGroup(response.data);
      setGroupName(response.data.name);
      setGroupDescription(response.data.description || '');
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

  const isAdmin = group.createdByUserId?._id?.toString() === user?.id;

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
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setShowManage(!showManage)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm font-medium"
            >
              {showManage ? 'Hide' : 'Manage'}
            </button>
            {isAdmin && !editingName && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Delete Group
              </button>
            )}
          </div>
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

      {/* Manage Section */}
      {showManage && (
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Group Management</h2>
          
          {group.description && !editingName && (
            <p className="text-sm text-gray-600 mb-4">{group.description}</p>
          )}

          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Add Member</h3>
            <form onSubmit={handleAddMember} className="flex space-x-2">
              <input
                type="text"
                value={usernameToAdd}
                onChange={(e) => setUsernameToAdd(e.target.value)}
                placeholder="Enter username"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
              <button
                type="submit"
                disabled={addingMember}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
              >
                {addingMember ? 'Adding...' : 'Add'}
              </button>
            </form>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Members ({group.memberIds.length})</h3>
            <div className="space-y-2">
              {group.memberIds.map((member) => {
                const isMemberAdmin = member._id === group.createdByUserId._id;
                const canRemove = isAdmin && !isMemberAdmin;

                return (
                  <div
                    key={member._id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{member.displayName}</span>
                        {isMemberAdmin && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                            Owner
                          </span>
                        )}
                      </div>
                      <span className="text-sm text-gray-500">@{member.username}</span>
                    </div>
                    {canRemove && (
                      <button
                        onClick={() => handleRemoveMember(member._id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
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
      {activeTab === 'games' && groupId && <Dashboard groupId={groupId} />}
      {activeTab === 'stats' && groupId && <Stats groupId={groupId} />}
    </div>
  );
};

export default GroupDetails;
