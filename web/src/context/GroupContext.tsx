import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '../api/client';
import { useAuth } from './AuthContext';
import { getGroupId } from '../utils/groupHelpers';

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
  isPublic: boolean;
  createdAt: string;
}

interface GroupDetails extends Group {
  // Extended group details with full member info
}

interface GroupContextType {
  groups: Group[];
  selectedGroupId: string | null;
  selectedGroup: Group | null;
  loading: boolean;
  fetchGroups: () => Promise<void>;
  selectGroup: (groupId: string | null) => void;
  refreshGroups: () => Promise<void>;
  // Cache for group details
  groupDetailsCache: Map<string, GroupDetails>;
  fetchGroupDetails: (groupId: string) => Promise<GroupDetails | null>;
  prefetchGroupDetails: (groupId: string) => void;
}

const GroupContext = createContext<GroupContextType | undefined>(undefined);

export const useGroup = () => {
  const context = useContext(GroupContext);
  if (context === undefined) {
    throw new Error('useGroup must be used within a GroupProvider');
  }
  return context;
};

interface GroupProviderProps {
  children: ReactNode;
}

export const GroupProvider: React.FC<GroupProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [groups, setGroups] = useState<Group[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [groupDetailsCache, setGroupDetailsCache] = useState<Map<string, GroupDetails>>(new Map());

  const fetchGroups = async () => {
    try {
      // Fetch groups - works for both authenticated and unauthenticated users
      // Backend will return public groups for everyone, and private groups for members
      const response = await apiClient.get('/groups');
      const fetchedGroups = response.data;
      setGroups(fetchedGroups);
      
      // Don't auto-select groups - let routing handle it
      // But preserve stored selection if it exists and is valid
      if (selectedGroupId) {
        const groupExists = fetchedGroups.find((g: Group) => getGroupId(g) === selectedGroupId);
        if (!groupExists) {
          // Selected group no longer exists, clear it
          setSelectedGroupId(null);
          localStorage.removeItem('selectedGroupId');
        }
      }

      // Prefetch all data after groups are loaded (non-blocking)
      // Only prefetch if user is logged in
      if (user && fetchedGroups.length > 0) {
        setTimeout(() => prefetchAllData(fetchedGroups), 500);
      }
    } catch (error) {
      console.error('Failed to fetch groups:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectGroup = (groupId: string | null) => {
    setSelectedGroupId(groupId);
    if (groupId) {
      localStorage.setItem('selectedGroupId', groupId);
    } else {
      localStorage.removeItem('selectedGroupId');
    }
  };

  const refreshGroups = async () => {
    await fetchGroups();
  };

  const fetchGroupDetails = async (groupId: string): Promise<GroupDetails | null> => {
    // Check cache first
    const cached = groupDetailsCache.get(groupId);
    if (cached) {
      return cached;
    }

    // Fetch if not cached
    // Works for both authenticated and unauthenticated users
    // Backend will return public groups without auth, private groups require auth
    try {
      const response = await apiClient.get(`/groups/${groupId}`);
      const groupDetails = response.data as GroupDetails;
      setGroupDetailsCache(prev => new Map(prev).set(groupId, groupDetails));
      return groupDetails;
    } catch (error) {
      console.error('Failed to fetch group details:', error);
      return null;
    }
  };

  const prefetchGroupDetails = (groupId: string) => {
    // Only prefetch if not already cached
    const cached = groupDetailsCache.get(groupId);
    if (cached) {
      return; // Already have it, no need to prefetch
    }

    // Prefetch group details (non-blocking)
    apiClient.get(`/groups/${groupId}`)
      .then(response => {
        setGroupDetailsCache(prev => new Map(prev).set(groupId, response.data));
      })
      .catch(() => {
        // Silently fail for prefetch - it's just an optimization
      });
  };

  useEffect(() => {
    // Fetch groups even if not logged in (to show public groups)
      fetchGroups();
  }, [user]);

  const prefetchAllData = (groupsToPrefetch: Group[]) => {
    if (groupsToPrefetch.length === 0) {
      return; // No groups to prefetch
    }

    // Prefetch all group details, games, and stats for each group (non-blocking)
    groupsToPrefetch.forEach(group => {
      const groupId = getGroupId(group);
      if (!groupId) return;
      
      // Prefetch group details
      prefetchGroupDetails(groupId);

      // Prefetch games (using dynamic import to avoid circular dependency)
      import('../pages/Dashboard').then(module => {
        const gameListCache = (module as any).gameListCache;
        if (gameListCache && !gameListCache.has(groupId)) {
          apiClient.get('/games', { params: { groupId } })
            .then(response => {
              gameListCache.set(groupId, response.data);
            })
            .catch(() => {
              // Silently fail for prefetch
            });
        }
      }).catch(() => {
        // Silently fail
      });

      // Prefetch stats
      import('../pages/Stats').then(module => {
        const statsCache = (module as any).statsCache;
        if (statsCache && !statsCache.has(groupId)) {
          apiClient.get('/stats/totals', { params: { groupId } })
            .then(response => {
              statsCache.set(groupId, response.data);
            })
            .catch(() => {
              // Silently fail for prefetch
            });
        }
      }).catch(() => {
        // Silently fail
      });
    });
  };

  const selectedGroup = selectedGroupId
    ? groups.find((g) => g._id === selectedGroupId) || null
    : null;

  return (
    <GroupContext.Provider
      value={{
        groups,
        selectedGroupId,
        selectedGroup,
        loading,
        fetchGroups,
        selectGroup,
        refreshGroups,
        groupDetailsCache,
        fetchGroupDetails,
        prefetchGroupDetails,
      }}
    >
      {children}
    </GroupContext.Provider>
  );
};

