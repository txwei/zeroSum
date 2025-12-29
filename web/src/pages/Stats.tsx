import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';

interface StatsProps {
  groupId: string;
}

interface UserTotal {
  userId: string;
  username: string;
  displayName: string;
  total: number;
}

interface TrendDataPoint {
  date: string;
  [playerId: string]: string | number;
}

interface TrendResponse {
  dataPoints: TrendDataPoint[];
  playerInfo: Record<string, { username: string; displayName: string }>;
}

type TimePeriod = '30d' | '90d' | 'year' | 'all';

// Cache for stats by groupId and timePeriod (exported for prefetching)
export const statsCache = new Map<string, UserTotal[]>();

const Stats = ({ groupId }: StatsProps) => {
  const [totals, setTotals] = useState<UserTotal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sortBy, setSortBy] = useState<'name' | 'total'>('total');
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('all');

  // Trend chart state
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([]);
  const [trendData, setTrendData] = useState<TrendDataPoint[]>([]);
  const [playerInfo, setPlayerInfo] = useState<Record<string, { username: string; displayName: string }>>({});
  const [trendLoading, setTrendLoading] = useState(false);
  const [trendError, setTrendError] = useState('');

  useEffect(() => {
    if (groupId) {
      fetchTotals();
    }
  }, [groupId, timePeriod]);

  useEffect(() => {
    if (groupId && selectedPlayers.length > 0) {
      fetchTrendData();
    } else {
      // Only clear data when no players are selected
      setTrendData([]);
      setPlayerInfo({});
    }
  }, [groupId, selectedPlayers]);

  const fetchTotals = async () => {
    const cacheKey = `${groupId}-${timePeriod}`;
    // Check cache first - show immediately if available
    const cached = statsCache.get(cacheKey);
    if (cached) {
      setTotals(cached);
      setLoading(false);
      // Fetch fresh data in background
    } else {
      setLoading(true);
    }

    try {
      const params: any = { groupId };
      if (timePeriod !== 'all') {
        params.timePeriod = timePeriod;
      }
      const response = await apiClient.get('/stats/totals', { params });
      const statsData = response.data;
      statsCache.set(cacheKey, statsData);
      setTotals(statsData);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load statistics');
      setLoading(false);
    }
  };

  const fetchTrendData = async () => {
    setTrendLoading(true);
    setTrendError('');
    // Don't clear trendData - keep previous data visible while loading
    try {
      const response = await apiClient.get<TrendResponse>('/stats/trends', {
        params: {
          groupId,
          playerIds: selectedPlayers,
        },
      });
      // Update data smoothly
      // Ensure all data points have all selected player keys
      // Use previous value if missing, or 0 if it's the first point
      const normalizedData: TrendDataPoint[] = [];
      const previousValues: Record<string, number> = {};
      
      // Initialize previous values to 0
      selectedPlayers.forEach((playerId) => {
        previousValues[playerId] = 0;
      });
      
      response.data.dataPoints.forEach((point: TrendDataPoint) => {
        const normalized: TrendDataPoint = { date: point.date };
        selectedPlayers.forEach((playerId) => {
          if (point[playerId] !== undefined && point[playerId] !== null) {
            const value = typeof point[playerId] === 'number' 
              ? point[playerId] 
              : (typeof point[playerId] === 'string' ? parseFloat(point[playerId]) : 0) || 0;
            normalized[playerId] = value;
            previousValues[playerId] = value; // Update previous value
          } else {
            // Use previous value if available, otherwise 0
            normalized[playerId] = previousValues[playerId];
          }
        });
        normalizedData.push(normalized);
      });
      
      setTrendData(normalizedData);
      setPlayerInfo(response.data.playerInfo);
      setTrendLoading(false);
    } catch (err: any) {
      console.error('Error fetching trend data:', err);
      setTrendError(err.response?.data?.error || 'Failed to load trend data');
      setTrendLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const togglePlayerSelection = (userId: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const sortedTotals = [...totals].sort((a, b) => {
    if (sortBy === 'name') {
      return a.displayName.localeCompare(b.displayName);
    }
    return b.total - a.total;
  });

  // Standard color palette for data visualization - all solid lines
  // Using a palette designed for accessibility and distinction
  const lineStyles = [
    { color: '#2563eb', strokeWidth: 2.5 }, // blue
    { color: '#dc2626', strokeWidth: 2.5 }, // red
    { color: '#16a34a', strokeWidth: 2.5 }, // green
    { color: '#ca8a04', strokeWidth: 2.5 }, // yellow/amber
    { color: '#9333ea', strokeWidth: 2.5 }, // purple
    { color: '#e11d48', strokeWidth: 2.5 }, // pink/rose
    { color: '#0891b2', strokeWidth: 2.5 }, // cyan
    { color: '#ea580c', strokeWidth: 2.5 }, // orange
  ];

  const getPlayerDisplayName = (playerId: string) => {
    // Remove "playerName:" prefix if present
    if (playerId.startsWith('playerName:')) {
      return playerId.replace('playerName:', '');
    }
    return playerInfo[playerId]?.displayName || playerInfo[playerId]?.username || playerId;
  };

  const selectAllPlayers = () => {
    setSelectedPlayers(sortedTotals.map((t) => t.userId));
  };

  const unselectAllPlayers = () => {
    setSelectedPlayers([]);
  };

  // Only show loading if we don't have cached data
  if (loading && totals.length === 0) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0 space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Statistics</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Cumulative Totals Section */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center flex-wrap gap-4">
            <div>
              <h2 className="text-lg font-medium text-gray-900">Cumulative Totals</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Time Period Selector */}
              <div className="flex space-x-1 bg-gray-100 rounded-md p-1">
                {(['30d', '90d', 'year', 'all'] as TimePeriod[]).map((period) => (
                  <button
                    key={period}
                    onClick={() => setTimePeriod(period)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      timePeriod === period
                        ? 'bg-white text-blue-800 shadow-sm'
                        : 'text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    {period === 'all' ? 'All Time' : period === '30d' ? '30 Days' : period === '90d' ? '90 Days' : '1 Year'}
                  </button>
                ))}
              </div>
              {/* Sort Buttons */}
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

      {/* Trend Chart Section */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Trend Chart</h2>
          <p className="text-sm text-gray-500 mt-1">
            Select one or more players to view their running balance over time
          </p>
        </div>

        <div className="px-6 py-4">
          {/* Player Selection */}
          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <label className="block text-sm font-medium text-gray-700">
                Select Players:
              </label>
              {totals.length > 0 && (
                <div className="flex gap-2">
                  <button
                    onClick={selectAllPlayers}
                    className="px-3 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Select All
                  </button>
                  <button
                    onClick={unselectAllPlayers}
                    className="px-3 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                  >
                    Unselect All
                  </button>
                </div>
              )}
            </div>
            {totals.length === 0 ? (
              <p className="text-sm text-gray-500">No players available</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {sortedTotals.map((userTotal) => (
                  <button
                    key={userTotal.userId}
                    onClick={() => togglePlayerSelection(userTotal.userId)}
                    className={`px-3 py-2 rounded-md text-sm font-medium transition-all ${
                      selectedPlayers.includes(userTotal.userId)
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {userTotal.displayName}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Chart */}
          {trendError && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
              {trendError}
            </div>
          )}

          {trendLoading && trendData.length === 0 && selectedPlayers.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex items-center space-x-2 text-gray-600">
                <svg
                  className="animate-spin h-5 w-5 text-blue-600"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                <span className="text-sm font-medium">Loading trend data...</span>
              </div>
            </div>
          ) : (
            <div className="w-full relative bg-gray-50" style={{ height: '500px', minHeight: '500px' }}>
              {/* Subtle loading overlay - only shows when updating existing chart */}
              {trendLoading && trendData.length > 0 && (
                <div className="absolute inset-0 bg-white bg-opacity-60 flex items-center justify-center z-10 rounded-lg transition-opacity backdrop-blur-sm">
                  <div className="flex items-center space-x-2 text-gray-700 bg-white px-4 py-2 rounded-lg shadow-md">
                    <svg
                      className="animate-spin h-5 w-5 text-blue-600"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      ></circle>
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      ></path>
                    </svg>
                    <span className="text-sm font-medium">Updating chart...</span>
                  </div>
                </div>
              )}
              {/* Chart - always render, even when empty */}
              <div className="transition-opacity duration-300" style={{ width: '100%', height: '500px' }}>
                {/* Chart Title - Above the chart */}
                <div className="absolute -top-1 left-0 right-0 flex justify-center z-20 pointer-events-none">
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 px-4 py-1.5 rounded-full shadow-sm backdrop-blur-sm bg-opacity-95">
                    <h3 className="text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                      Net Profit Over Time
                    </h3>
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={500}>
                  <LineChart 
                    data={trendData.length > 0 ? trendData : []}
                    margin={{ top: 20, right: 20, left: 10, bottom: 60 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" opacity={0.5} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={formatDate}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <YAxis 
                      tickFormatter={(value) => formatCurrency(value)} 
                      stroke="#6b7280"
                      style={{ fontSize: '12px' }}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        formatCurrency(value),
                        getPlayerDisplayName(name),
                      ]}
                      labelFormatter={(label) => formatDate(label)}
                      contentStyle={{
                        backgroundColor: 'white',
                        border: '1px solid #e5e7eb',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      }}
                      labelStyle={{ fontWeight: 'bold', marginBottom: '4px' }}
                    />
                    <Legend
                      formatter={(value) => {
                        const playerId = value as string;
                        return getPlayerDisplayName(playerId);
                      }}
                      wrapperStyle={{ paddingTop: '20px' }}
                      iconType="line"
                    />
                    {selectedPlayers.map((playerId, index) => {
                      const style = lineStyles[index % lineStyles.length];
                      return (
                        <Line
                          key={playerId}
                          type="monotone"
                          dataKey={playerId}
                          stroke={style.color}
                          strokeWidth={style.strokeWidth}
                          dot={{ r: 4, fill: style.color, strokeWidth: 2, stroke: '#fff' }}
                          activeDot={{ r: 6, fill: style.color, strokeWidth: 2, stroke: '#fff' }}
                          name={playerId}
                          connectNulls={true}
                          animationDuration={300}
                          isAnimationActive={true}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
              {/* Empty state message overlay */}
              {selectedPlayers.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-gray-400 text-sm">Select players to view trends</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Stats;
