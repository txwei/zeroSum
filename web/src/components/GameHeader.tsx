/**
 * Game Header Component
 * Displays and allows editing of game name and date
 */
import { Game } from '../types/api';
import { formatDateForDisplay } from '../utils/date';
import { getBasePath } from '../utils/env';

interface GameHeaderProps {
  game: Game;
  gameName: string;
  gameDate: string;
  editingName: boolean;
  editingDate: boolean;
  isSettled: boolean;
  onNameChange: (name: string) => void;
  onNameBlur: (name: string) => void;
  onDateChange: (date: string) => void;
  onDateBlur: (date: string) => void;
  onEditName: () => void;
  onEditDate: () => void;
  onStopEditName: () => void;
  onStopEditDate: () => void;
  onCopyLink: () => void;
  onBackToGroup?: () => void;
}

export function GameHeader({
  game,
  gameName,
  gameDate,
  editingName,
  editingDate,
  isSettled,
  onNameChange,
  onNameBlur,
  onDateChange,
  onDateBlur,
  onEditName,
  onEditDate,
  onStopEditName,
  onStopEditDate,
  onCopyLink,
  onBackToGroup,
}: GameHeaderProps) {
  return (
    <div className="px-4 py-3 sm:px-6 sm:py-4 border-b border-gray-200">
      {game?.groupId && onBackToGroup && (
        <div className="mb-2 sm:mb-3">
          <button
            onClick={onBackToGroup}
            className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 flex items-center"
          >
            ← Back to {game.groupId.name}
          </button>
        </div>
      )}
      {editingName && !isSettled ? (
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={gameName}
            onChange={(e) => onNameChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                onNameBlur(gameName);
                onStopEditName();
                e.preventDefault();
              }
            }}
            onBlur={(e) => {
              onNameBlur(e.target.value);
              onStopEditName();
            }}
            className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm sm:text-base"
            placeholder="Game title"
            autoFocus
          />
          <button
            onClick={() => {
              onNameBlur(gameName);
              onStopEditName();
            }}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            Done
          </button>
        </div>
      ) : (
        <div>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 sm:gap-0 mb-2">
            <h1 
              className={`text-xl sm:text-2xl font-bold text-gray-900 break-words ${!isSettled ? 'cursor-pointer hover:text-blue-600' : ''}`}
              onClick={() => !isSettled && onEditName()}
              title={!isSettled ? "Click to edit" : ""}
            >
              {gameName}
            </h1>
            <button
              onClick={onCopyLink}
              className="flex items-center justify-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1 text-xs sm:text-sm text-blue-600 hover:text-blue-700 border border-blue-300 rounded-md hover:bg-blue-50 whitespace-nowrap self-start sm:self-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="hidden sm:inline">Copy Game URL</span>
              <span className="sm:hidden">Copy URL</span>
            </button>
          </div>
          {editingDate && !isSettled ? (
            <div className="flex items-center space-x-2">
              <input
                type="date"
                value={gameDate}
                onChange={(e) => onDateChange(e.target.value)}
                onBlur={(e) => {
                  onDateBlur(e.target.value);
                  onStopEditDate();
                }}
                className="rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                autoFocus
              />
              <button
                onClick={onStopEditDate}
                className="px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Done
              </button>
            </div>
          ) : (
            <div 
              className={`text-xs sm:text-sm text-gray-500 ${!isSettled ? 'cursor-pointer hover:text-blue-600' : ''}`}
              onClick={() => !isSettled && onEditDate()}
              title={!isSettled ? "Click to edit" : ""}
            >
              {gameDate ? formatDateForDisplay(gameDate) : 'No date set'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

