import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/client';

interface Game {
  _id: string;
  name: string;
  date: string;
  createdByUserId: {
    _id: string;
    username: string;
    displayName: string;
  };
  transactions: Array<{
    _id: string;
    userId: {
      _id: string;
      username: string;
      displayName: string;
    };
    amount: number;
  }>;
}

const GameDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      fetchGame();
    }
  }, [id]);

  const fetchGame = async () => {
    try {
      const response = await apiClient.get(`/games/${id}`);
      setGame(response.data);
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
      await apiClient.delete(`/games/${id}`);
      navigate('/');
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
        <Link to="/" className="text-blue-600 hover:text-blue-500">
          ← Back to Dashboard
        </Link>
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
        <Link to="/" className="text-blue-600 hover:text-blue-500 text-sm">
          ← Back to Dashboard
        </Link>
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
              <p className="text-sm text-gray-500">
                Created by {game.createdByUserId.displayName}
              </p>
            </div>
            <button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium"
            >
              Delete Game
            </button>
          </div>
        </div>

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
                        {transaction.userId.displayName}
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

