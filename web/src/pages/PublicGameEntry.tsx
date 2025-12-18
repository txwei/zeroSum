import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import apiClient from '../api/client';
import QuickSignup from '../components/QuickSignup';

interface Game {
  _id: string;
  name: string;
  date: string;
  publicToken: string;
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
    _id?: string;
    userId: {
      _id: string;
      username: string;
      displayName: string;
    };
    amount: number;
  }>;
}

interface Member {
  _id: string;
  id?: string;
  username: string;
  displayName: string;
}

const PublicGameEntry = () => {
  const { token } = useParams<{ token: string }>();
  const [game, setGame] = useState<Game | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showQuickSignup, setShowQuickSignup] = useState(false);

  useEffect(() => {
    if (token) {
      fetchGame();
      fetchMembers();
    }
  }, [token]);

  const fetchGame = async () => {
    try {
      const response = await apiClient.get(`/games/public/${token}`);
      setGame(response.data);
      setLoading(false);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load game');
      setLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const response = await apiClient.get(`/games/public/${token}/members`);
      setMembers(response.data);
    } catch (err: any) {
      console.error('Failed to load members:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!selectedUserId) {
      setError('Please select a user');
      return;
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) {
      setError('Please enter a valid amount');
      return;
    }

    setSubmitting(true);

    try {
      const response = await apiClient.post(`/games/public/${token}/transactions`, {
        userId: selectedUserId,
        amount: amountNum,
      });
      setGame(response.data);
      setSuccess('Transaction updated successfully!');
      setAmount(''); // Clear amount but keep user selected
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update transaction');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickSignupSuccess = (newUser: Member) => {
    setMembers([...members, newUser]);
    setSelectedUserId(newUser._id || newUser.id || '');
    setShowQuickSignup(false);
    setSuccess('Account created! You can now enter your transaction.');
    setTimeout(() => setSuccess(''), 3000);
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error && !game) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      </div>
    );
  }

  if (!game) {
    return null;
  }

  const sum = game.transactions.reduce((acc, t) => acc + t.amount, 0);
  const isValid = Math.abs(sum) < 0.01;

  // Get current user's transaction if exists
  const currentUserTransaction = game.transactions.find(
    (t) => t.userId._id === selectedUserId
  );

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">{game.name}</h1>
            <p className="text-sm text-gray-500 mt-1">{formatDate(game.date)}</p>
            <p className="text-sm text-gray-500 mt-1">
              Group: {game.groupId?.name || 'Unknown Group'}
            </p>
          </div>

          <div className="px-6 py-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
                {success}
              </div>
            )}

            <div className="mb-6">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  isValid ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}
              >
                {isValid ? '✓ Valid (sum equals zero)' : `Invalid (sum: ${formatCurrency(sum)})`}
              </span>
            </div>

            <h2 className="text-lg font-medium text-gray-900 mb-4">Existing Transactions</h2>
            {game.transactions.length === 0 ? (
              <p className="text-gray-500 mb-6">No transactions recorded yet.</p>
            ) : (
              <div className="overflow-x-auto mb-6">
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
                      <tr key={transaction._id || transaction.userId._id}>
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

            <div className="border-t border-gray-200 pt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Enter Your Transaction</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label htmlFor="userId" className="block text-sm font-medium text-gray-700 mb-2">
                    Who are you?
                  </label>
                  <div className="flex space-x-2">
                    <select
                      id="userId"
                      value={selectedUserId}
                      onChange={(e) => {
                        setSelectedUserId(e.target.value);
                        // Update amount field if user has existing transaction
                        const userTransaction = game.transactions.find(
                          (t) => t.userId._id === e.target.value
                        );
                        setAmount(userTransaction ? userTransaction.amount.toString() : '');
                      }}
                      className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    >
                      <option value="">Select a user...</option>
                      {members.map((member) => (
                        <option key={member._id || member.id} value={member._id || member.id}>
                          {member.displayName} ({member.username})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => setShowQuickSignup(true)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Quick Signup
                    </button>
                  </div>
                </div>

                {selectedUserId && (
                  <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                      Amount
                    </label>
                    <input
                      type="number"
                      id="amount"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      placeholder="Enter amount (positive = you owe, negative = you're owed)"
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    />
                    <p className="mt-1 text-xs text-gray-500">
                      Positive = you owe money, Negative = you're owed money
                    </p>
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={submitting || !selectedUserId || !amount}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitting ? 'Submitting...' : currentUserTransaction ? 'Update Transaction' : 'Add Transaction'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {showQuickSignup && (
        <QuickSignup
          token={token || ''}
          onSuccess={handleQuickSignupSuccess}
          onClose={() => setShowQuickSignup(false)}
        />
      )}
    </div>
  );
};

export default PublicGameEntry;

