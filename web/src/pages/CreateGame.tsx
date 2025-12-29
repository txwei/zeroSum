import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/client';
import { getBasePath } from '../utils/env';

interface CreateGameProps {
  groupId: string;
  onClose: () => void;
}

const CreateGame = ({ groupId, onClose }: CreateGameProps) => {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]); // Default to today
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');


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

    setLoading(true);

    try {
      // Create game with name and date
      const response = await apiClient.post('/games', {
        name: name.trim(),
        date,
        groupId,
      });
      
      // Redirect to the public game entry page
      if (!response.data.publicToken) {
        console.error('Game created but publicToken is missing:', response.data);
        setError('Game created successfully, but public link is not available. Please refresh and try again.');
        setLoading(false);
        return;
      }
      
      // Close the modal and navigate to the public game page
      onClose();
      const basePath = getBasePath();
      navigate(`${basePath}games/public/${response.data.publicToken}`);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create game');
      setLoading(false);
    }
  };

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
            Game Title
          </label>
          <input
            type="text"
            id="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="e.g., Poker Night"
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

        <p className="text-xs text-gray-500">
          After creating, you'll get a shareable link. Anyone with the link can add players and amounts.
        </p>

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
            disabled={loading}
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

