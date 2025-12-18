import { useEffect, useState } from 'react';
import apiClient from '../api/client';
import { gameDetailsCache } from './Dashboard';

interface GameDetailsProps {
  gameId: string;
  groupId?: string;
  onClose: () => void;
}

interface Game {
  _id: string;
  name: string;
  date: string;
  publicToken?: string;
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
    _id?: string; // Optional because Dashboard Game doesn't have it
    userId: {
      _id: string;
      username: string;
      displayName: string;
    };
    amount: number;
  }>;
}

const GameDetails = ({ gameId, onClose }: GameDetailsProps) => {
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showShareLink, setShowShareLink] = useState(false);

  useEffect(() => {
    if (gameId) {
      fetchGame();
    }
  }, [gameId]);

  const fetchGame = async () => {
    // Check cache first - show immediately if available
    const cached = gameDetailsCache.get(gameId);
    if (cached) {
      setGame(cached);
      setLoading(false);
      // Still fetch fresh data in background
    } else {
      setLoading(true);
    }

    try {
      const response = await apiClient.get(`/games/${gameId}`);
      const gameData = response.data;
      gameDetailsCache.set(gameId, gameData);
      setGame(gameData);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load game');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this game?')) {
      return;
    }

    try {
      await apiClient.delete(`/games/${gameId}`);
      onClose();
      // Refresh will be handled by parent
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete game');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Show brief success feedback
      const button = document.getElementById('copy-share-button');
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
          if (button) button.textContent = originalText;
        }, 2000);
      }
    });
  };

  const publicLink = game?.publicToken
    ? `${window.location.origin}${import.meta.env.BASE_URL || '/'}games/public/${game.publicToken}`
    : '';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error && !game) {
    return (
      <div className="px-4 sm:px-0">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
        <button onClick={onClose} className="text-blue-600 hover:text-blue-500">
          ← Back
        </button>
      </div>
    );
  }

  if (!game) {
    return null;
  }

  const sum = game.transactions.reduce((acc, t) => acc + t.amount, 0);
  const isValid = Math.abs(sum) < 0.01;

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-4">
        <button onClick={onClose} className="text-blue-600 hover:text-blue-500 text-sm">
          ← Back to Games
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{game.name}</h1>
              <p className="text-sm text-gray-500 mt-1">{formatDate(game.date)}</p>
              <div className="flex items-center space-x-2 mt-1">
              <p className="text-sm text-gray-500">
                Created by {game.createdByUserId?.displayName || 'Unknown'}
              </p>
                {game.groupId && (
                  <>
                    <span className="text-gray-400">•</span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      {game.groupId?.name || 'Unknown Group'}
                    </span>
                  </>
                )}
              </div>
            </div>
            <div className="flex space-x-2">
              {game.publicToken && (
                <button
                  onClick={() => setShowShareLink(!showShareLink)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  {showShareLink ? 'Hide Share Link' : 'Share Game'}
                </button>
              )}
              <button
                onClick={handleDelete}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Delete Game
              </button>
            </div>
          </div>
        </div>

        {showShareLink && game.publicToken && (
          <div className="px-6 py-4 bg-blue-50 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share this link with others:
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                readOnly
                value={publicLink}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-white"
              />
              <button
                id="copy-share-button"
                type="button"
                onClick={() => copyToClipboard(publicLink)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Copy Link
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-600">
              Anyone with this link can view the game and enter their transactions without logging in.
            </p>
          </div>
        )}

        <div className="px-6 py-4">
          <div className="mb-4">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}
            >
              {isValid ? '✓ Valid (sum equals zero)' : `Invalid (sum: ${formatCurrency(sum)})`}
            </span>
          </div>

          <h2 className="text-lg font-medium text-gray-900 mb-4">Transactions</h2>
          {game.transactions.length === 0 ? (
            <p className="text-gray-500">No transactions recorded for this game.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participant
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {game.transactions.map((transaction) => (
                    <tr key={transaction._id}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {transaction.userId?.displayName || 'Unknown User'}
                      </td>
                      <td
                        className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${
                          transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {formatCurrency(transaction.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">Total</td>
                    <td
                      className={`px-4 py-3 whitespace-nowrap text-sm font-medium ${
                        isValid ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {formatCurrency(sum)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameDetails;

