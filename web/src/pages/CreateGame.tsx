import { useState, useEffect } from 'react';
import apiClient from '../api/client';
import TransactionInput from '../components/TransactionInput';

interface CreateGameProps {
  groupId: string;
  onClose: () => void;
}

interface User {
  id: string;
  username: string;
  displayName: string;
}

interface Transaction {
  userId: string | { _id?: string; id?: string };
  amount: number;
}

const CreateGame = ({ groupId, onClose }: CreateGameProps) => {
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [users, setUsers] = useState<User[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdGame, setCreatedGame] = useState<{ publicToken: string; name: string } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await apiClient.get('/users');
      setUsers(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load users');
    }
  };

  const sum = transactions.reduce((acc, t) => acc + t.amount, 0);
  const isValid = Math.abs(sum) < 0.01 && transactions.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Game name is required');
      return;
    }

    if (!groupId) {
      setError('Please select a group');
      return;
    }

    if (!isValid) {
      setError(`Transactions must sum to zero. Current sum: ${sum.toFixed(2)}`);
      return;
    }

    setLoading(true);

    try {
      // Normalize transactions - ensure userId is always a string
      const normalizedTransactions = transactions.map(t => ({
        userId: typeof t.userId === 'string' ? t.userId : (t.userId as any)?._id || (t.userId as any)?.id || '',
        amount: t.amount,
      }));
      
      const response = await apiClient.post('/games', {
        name: name.trim(),
        date,
        groupId,
        transactions: normalizedTransactions,
      });
      
      // Store created game info to show share link
      setCreatedGame({
        publicToken: response.data.publicToken,
        name: response.data.name,
      });
      setLoading(false);
      // Don't close immediately - show share link first
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create game');
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      // Show brief success feedback
      const button = document.getElementById('copy-button');
      if (button) {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        setTimeout(() => {
          if (button) button.textContent = originalText;
        }, 2000);
      }
    });
  };

  const publicLink = createdGame
    ? `${window.location.origin}${import.meta.env.BASE_URL || '/'}games/public/${createdGame.publicToken}`
    : '';

  if (createdGame) {
    return (
      <div className="px-4 sm:px-0">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Game Created!</h1>
        
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
          <p className="font-medium">✓ {createdGame.name} has been created successfully!</p>
        </div>

        <div className="bg-white shadow rounded-lg p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Share this link with others to let them enter their transactions:
            </label>
            <div className="flex space-x-2">
              <input
                type="text"
                readOnly
                value={publicLink}
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm bg-gray-50"
              />
              <button
                id="copy-button"
                type="button"
                onClick={() => copyToClipboard(publicLink)}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Copy Link
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Anyone with this link can view the game and enter their transactions without logging in.
            </p>
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="button"
              onClick={() => {
                setCreatedGame(null);
                onClose();
              }}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 sm:px-0">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Create New Game</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg p-6 space-y-6">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
            Game Name
          </label>
          <input
            type="text"
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="e.g., Poker Night 2024-01-15"
          />
        </div>

        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700">
            Date
          </label>
          <input
            type="date"
            id="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          />
        </div>


        <TransactionInput users={users} transactions={transactions} onChange={setTransactions} />

        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading || !isValid}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Game'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateGame;

