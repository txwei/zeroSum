import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import apiClient from '../api/client';
import { useAuth } from './AuthContext';

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

interface GroupContextType {
  groups: Group[];
  selectedGroupId: string | null;
  selectedGroup: Group | null;
  loading: boolean;
  fetchGroups: () => Promise<void>;
  selectGroup: (groupId: string | null) => void;
  refreshGroups: () => Promise<void>;
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

  const fetchGroups = async () => {
    try {
      const response = await apiClient.get('/groups');
      const fetchedGroups = response.data;
      setGroups(fetchedGroups);
      
      // Don't auto-select groups - let routing handle it
      // But preserve stored selection if it exists and is valid
      if (selectedGroupId) {
        const groupExists = fetchedGroups.find((g: Group) => g._id === selectedGroupId);
        if (!groupExists) {
          // Selected group no longer exists, clear it
          setSelectedGroupId(null);
          localStorage.removeItem('selectedGroupId');
        }
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

  useEffect(() => {
    if (user) {
      fetchGroups();
    }
  }, [user]);

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
      }}
    >
      {children}
    </GroupContext.Provider>
  );
};

