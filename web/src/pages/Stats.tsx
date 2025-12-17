import { useEffect, useState } from 'react';
import apiClient from '../api/client';

interface StatsProps {
  groupId: string;
}

interface UserTotal {
  userId: string;
  username: string;
  displayName: string;
  total: number;
}

const Stats = ({ groupId }: StatsProps) => {
  const [totals, setTotals] = useState<UserTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'total'>('total');

  useEffect(() => {
    if (groupId) {
    fetchTotals();
    }
  }, [groupId]);

  const fetchTotals = async () => {
    try {
      const response = await apiClient.get('/stats/totals', { params: { groupId } });
      setTotals(response.data);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load statistics');
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const sortedTotals = [...totals].sort((a, b) => {
    if (sortBy === 'name') {
      return a.displayName.localeCompare(b.displayName);
    }
    return b.total - a.total;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Statistics</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
            <h2 className="text-lg font-medium text-gray-900">Cumulative Totals</h2>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setSortBy('name')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  sortBy === 'name'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Sort by Name
              </button>
              <button
                onClick={() => setSortBy('total')}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  sortBy === 'total'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                Sort by Total
              </button>
            </div>
          </div>
        </div>

        {totals.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-500">No statistics available yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    User
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {sortedTotals.map((userTotal) => (
                  <tr key={userTotal.userId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {userTotal.displayName}
                      </div>
                      <div className="text-sm text-gray-500">{userTotal.username}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`text-sm font-medium ${
                          userTotal.total >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(userTotal.total)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Stats;

