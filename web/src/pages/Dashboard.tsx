import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { useAuth } from '../context/AuthContext';
import CreateGame from './CreateGame';
import GameDetails from './GameDetails';
import { GameCardSkeleton, SkeletonLoader } from '../components/SkeletonLoader';

interface Game {
  _id: string;
  name: string;
  date: string;
  createdByUserId: {
    _id: string;
    username: string;
    displayName: string;
  };
  groupId: {
    _id: string;
    name: string;
  };
  transactions: Array<{
    userId: {
      _id: string;
      username: string;
      displayName: string;
    };
    amount: number;
  }>;
}

interface DashboardProps {
  groupId: string;
}

// Cache for game details (shared between Dashboard and GameDetails)
export const gameDetailsCache = new Map<string, Game>();

// Cache for game lists by groupId
const gameListCache = new Map<string, Game[]>();

const Dashboard = ({ groupId }: DashboardProps) => {
  const { user } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [filteredGames, setFilteredGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterMyGames, setFilterMyGames] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedGameId, setSelectedGameId] = useState<string | null>(null);

  // Prefetch game details on hover (with debounce to avoid too many requests)
  const prefetchGame = (() => {
    let timeoutId: NodeJS.Timeout | null = null;
    return (gameId: string) => {
      // Debounce: only prefetch after 200ms of hover
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      timeoutId = setTimeout(() => {
        if (gameDetailsCache.has(gameId)) {
          return; // Already cached
        }
        apiClient.get(`/games/${gameId}`)
          .then(response => {
            gameDetailsCache.set(gameId, response.data);
          })
          .catch(() => {
            // Silently fail for prefetch
          });
      }, 200); // Wait 200ms before prefetching
    };
  })();

  useEffect(() => {
    if (groupId) {
      fetchGames();
    }
  }, [groupId]);

  const fetchGames = async () => {
    // Check cache first - show immediately if available
    const cached = gameListCache.get(groupId);
    if (cached) {
      setGames(cached);
      setFilteredGames(cached);
      setLoading(false);
      // Fetch fresh data in background
    } else {
      setLoading(true);
    }

    try {
      const response = await apiClient.get('/games', { params: { groupId } });
      const fetchedGames = response.data;
      gameListCache.set(groupId, fetchedGames);
      setGames(fetchedGames);
      setFilteredGames(fetchedGames);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load games');
      setLoading(false);
    }
  };

  const handleGameCreated = () => {
    setShowCreateForm(false);
    // Invalidate cache and refetch
    gameListCache.delete(groupId);
    fetchGames();
  };

  useEffect(() => {
    if (filterMyGames && user) {
      const myGames = games.filter((game) =>
        game.transactions.some((t) => {
          const userId = t.userId?._id || t.userId;
          return userId?.toString() === user.id;
        })
      );
      setFilteredGames(myGames);
    } else {
      setFilteredGames(games);
    }
  }, [filterMyGames, games, user]);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'No date';
    // Dates are stored as UTC midnight, so use UTC methods to avoid timezone shifts
    const date = new Date(dateString);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1;
    const day = date.getUTCDate();
    return new Date(year, month - 1, day).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  // Only show skeleton on initial load, not when we have cached games
  if (loading && games.length === 0 && filteredGames.length === 0) {
    return (
      <div className="px-4 sm:px-0">
        <div className="mb-6 flex justify-between items-center">
          <SkeletonLoader className="h-8 w-48" />
          <SkeletonLoader className="h-10 w-32" />
        </div>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <ul className="divide-y divide-gray-200">
            <GameCardSkeleton />
            <GameCardSkeleton />
            <GameCardSkeleton />
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-4">
          <h2 className="text-xl font-semibold text-gray-900">Games</h2>
          <button
            onClick={() => setFilterMyGames(!filterMyGames)}
            className={`px-3 py-1 rounded-md text-sm font-medium ${
              filterMyGames
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {filterMyGames ? 'Show All' : 'My Games Only'}
          </button>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
        >
          Create New Game
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {filteredGames.length === 0 ? (
        <div className="bg-white shadow rounded-lg p-6 text-center">
          <p className="text-gray-600 mb-4">
            {filterMyGames ? "You haven't participated in any games yet." : 'No games yet. Create your first game!'}
          </p>
          {!filterMyGames && (
            <button
              onClick={() => setShowCreateForm(true)}
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
          >
            Create Game
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <ul className="divide-y divide-gray-200">
            {filteredGames.map((game) => {
              const sum = game.transactions.reduce((acc, t) => acc + t.amount, 0);
              return (
                <li key={game._id}>
                      <button
                        onClick={() => setSelectedGameId(game._id)}
                        onMouseEnter={() => prefetchGame(game._id)}
                        className="w-full text-left block hover:bg-gray-50 px-4 py-4 sm:px-6 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center">
                          <p className="text-sm font-medium text-blue-600 truncate">
                            {game.name}
                          </p>
                          <span
                            className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                              Math.abs(sum) < 0.01
                                ? 'bg-green-100 text-green-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {Math.abs(sum) < 0.01 ? 'Valid' : `Sum: ${formatCurrency(sum)}`}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500">
                          <p>{formatDate(game.date)}</p>
                          <span className="mx-2">•</span>
                          <p>
                            {game.transactions.length} participant
                            {game.transactions.length !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="ml-5 flex-shrink-0">
                        <svg
                          className="h-5 w-5 text-gray-400"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5l7 7-7 7"
                          />
                        </svg>
                      </div>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Create Game Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Create New Game</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <CreateGame groupId={groupId} onClose={handleGameCreated} />
            </div>
          </div>
        </div>
      )}

      {/* Game Details Modal */}
      {selectedGameId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Game Details</h2>
                <button
                  onClick={() => {
                    setSelectedGameId(null);
                    fetchGames();
                  }}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              <GameDetails
                gameId={selectedGameId}
                groupId={groupId}
                onClose={() => {
                  setSelectedGameId(null);
                  fetchGames();
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

