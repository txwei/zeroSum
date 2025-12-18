import { useState, useEffect } from 'react';

interface User {
  id: string;
  username: string;
  displayName: string;
}

interface Transaction {
  userId: string | { _id?: string; id?: string };
  amount: number;
}

interface TransactionInputProps {
  users: User[];
  transactions: Transaction[];
  onChange: (transactions: Transaction[]) => void;
}

const TransactionInput: React.FC<TransactionInputProps> = ({
  users,
  transactions,
  onChange,
}) => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [amounts, setAmounts] = useState<Record<string, number>>({});

  // Helper to extract userId string from either string or object
  const getUserIdString = (userId: string | { _id?: string; id?: string }): string => {
    if (typeof userId === 'string') {
      return userId;
    }
    return userId?._id || userId?.id || '';
  };

  useEffect(() => {
    // Initialize amounts from transactions (only on mount)
    if (transactions.length > 0) {
      const initialAmounts: Record<string, number> = {};
      const initialSelectedUsers = transactions.map((t) => getUserIdString(t.userId)).filter(Boolean);
      transactions.forEach((t) => {
        const userId = getUserIdString(t.userId);
        if (userId) {
          initialAmounts[userId] = t.amount;
        }
      });
      setAmounts(initialAmounts);
      setSelectedUsers(initialSelectedUsers);
    }
  }, []);

  const handleUserToggle = (userId: string) => {
    let newSelectedUsers: string[];
    let newAmounts: Record<string, number>;

    if (selectedUsers.includes(userId)) {
      newSelectedUsers = selectedUsers.filter((id) => id !== userId);
      newAmounts = { ...amounts };
      delete newAmounts[userId];
    } else {
      newSelectedUsers = [...selectedUsers, userId];
      newAmounts = { ...amounts, [userId]: 0 };
    }

    setSelectedUsers(newSelectedUsers);
    setAmounts(newAmounts);

    // Update parent
    const newTransactions: Transaction[] = newSelectedUsers.map((id) => ({
      userId: id,
      amount: newAmounts[id] || 0,
    }));
    onChange(newTransactions);
  };

  const handleAmountChange = (userId: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    const newAmounts = { ...amounts, [userId]: isNaN(numValue) ? 0 : numValue };
    setAmounts(newAmounts);

    // Update parent
    const newTransactions: Transaction[] = selectedUsers.map((id) => ({
      userId: id,
      amount: newAmounts[id] || 0,
    }));
    onChange(newTransactions);
  };

  const calculateSum = () => {
    return selectedUsers.reduce((sum, userId) => sum + (amounts[userId] || 0), 0);
  };

  const sum = calculateSum();
  const isValid = Math.abs(sum) < 0.01;

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Participants
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
          {users.map((user) => (
            <label
              key={user.id}
              className="flex items-center space-x-2 p-2 border rounded cursor-pointer hover:bg-gray-50"
            >
              <input
                type="checkbox"
                checked={selectedUsers.includes(user.id)}
                onChange={() => handleUserToggle(user.id)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">{user.displayName}</span>
            </label>
          ))}
        </div>
      </div>

      {selectedUsers.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter Amounts
          </label>
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Participant
                    </th>
                    <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedUsers.map((userId) => {
                    const user = users.find((u) => u.id === userId);
                    return (
                      <tr key={userId}>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                          {user?.displayName}
                        </td>
                        <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                          <input
                            type="number"
                            step="0.01"
                            value={amounts[userId] || ''}
                            onChange={(e) => handleAmountChange(userId, e.target.value)}
                            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                            placeholder="0.00"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td className="px-3 sm:px-4 py-3 text-sm font-medium text-gray-900">Total</td>
                    <td className="px-3 sm:px-4 py-3 whitespace-nowrap">
                      <span
                        className={`text-sm font-medium ${
                          isValid ? 'text-green-600' : 'text-red-600'
                        }`}
                      >
                        {new Intl.NumberFormat('en-US', {
                          style: 'currency',
                          currency: 'USD',
                        }).format(sum)}
                      </span>
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          <div className="mt-2">
            {isValid ? (
              <p className="text-sm text-green-600">✓ Sum equals zero - ready to save!</p>
            ) : (
              <p className="text-sm text-red-600">
                Sum must equal zero. Current sum:{' '}
                {new Intl.NumberFormat('en-US', {
                  style: 'currency',
                  currency: 'USD',
                }).format(sum)}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionInput;

