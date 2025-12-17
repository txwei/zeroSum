import { useGroup } from '../context/GroupContext';

const GroupSelector = () => {
  const { groups, selectedGroupId, selectedGroup, selectGroup, loading } = useGroup();

  if (loading || groups.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center space-x-2">
      <label htmlFor="group-select" className="text-sm font-medium text-gray-700">
        Group:
      </label>
      <select
        id="group-select"
        value={selectedGroupId || ''}
        onChange={(e) => selectGroup(e.target.value || null)}
        className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
      >
        <option value="">All Groups</option>
        {groups.map((group) => (
          <option key={group._id} value={group._id}>
            {group.name}
          </option>
        ))}
      </select>
      {selectedGroup && (
        <span className="text-xs text-gray-500">({selectedGroup.memberIds.length} members)</span>
      )}
    </div>
  );
};

export default GroupSelector;

