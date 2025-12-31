import React, { useEffect, useRef } from 'react';

interface MathKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
  onEvaluate?: (value: string) => void;
}

const MathKeyboard: React.FC<MathKeyboardProps> = ({ value, onChange, onClose, inputRef, onEvaluate }) => {
  const keyboardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (
        keyboardRef.current &&
        !keyboardRef.current.contains(target) &&
        inputRef.current &&
        !inputRef.current.contains(target) &&
        !target.closest('.math-keyboard')
      ) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose, inputRef]);

  const handleKeyPress = (key: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (inputRef.current) {
      const input = inputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const newValue = value.slice(0, start) + key + value.slice(end);
      onChange(newValue);
      
      // Set cursor position after the inserted character
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.setSelectionRange(start + key.length, start + key.length);
          inputRef.current.focus();
        }
      }, 0);
    }
  };

  const handleBackspace = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (inputRef.current) {
      const input = inputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      
      if (start === end && start > 0) {
        // Delete one character
        const newValue = value.slice(0, start - 1) + value.slice(start);
        onChange(newValue);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(start - 1, start - 1);
            inputRef.current.focus();
          }
        }, 0);
      } else if (start !== end) {
        // Delete selected text
        const newValue = value.slice(0, start) + value.slice(end);
        onChange(newValue);
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.setSelectionRange(start, start);
            inputRef.current.focus();
          }
        }, 0);
      }
    }
  };

  const handleFlipSign = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (inputRef.current) {
      const input = inputRef.current;
      const start = input.selectionStart || 0;
      const end = input.selectionEnd || 0;
      const selectedText = value.slice(start, end);
      
      if (selectedText) {
        // Flip sign of selected expression
        const numValue = parseFloat(selectedText);
        if (!isNaN(numValue)) {
          const newValue = value.slice(0, start) + (-numValue).toString() + value.slice(end);
          onChange(newValue);
        } else {
          // Wrap in parentheses and negate
          const newValue = value.slice(0, start) + `-(${selectedText})` + value.slice(end);
          onChange(newValue);
        }
      } else {
        // Flip sign at cursor position
        if (value.startsWith('-')) {
          onChange(value.slice(1));
        } else {
          onChange('-' + value);
        }
      }
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
        }
      }, 0);
    }
  };

  const handleClear = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    onChange('');
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  const handleEquals = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (onEvaluate && value.trim()) {
      onEvaluate(value);
    }
  };

  return (
    <div
      ref={keyboardRef}
      className="math-keyboard fixed bottom-0 left-0 right-0 bg-black z-50 sm:hidden"
      style={{ maxHeight: '35vh' }}
      onMouseDown={(e) => e.preventDefault()}
      onTouchStart={(e) => e.preventDefault()}
    >
      <div className="p-1 space-y-1">
        {/* First row: Parentheses and operators */}
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={(e) => handleKeyPress('(', e)}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2 py-2 text-lg font-light bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white rounded-lg transition-colors touch-manipulation"
          >
            (
          </button>
          <button
            onClick={(e) => handleKeyPress(')', e)}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2 py-2 text-lg font-light bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white rounded-lg transition-colors touch-manipulation"
          >
            )
          </button>
          <button
            onClick={(e) => handleClear(e)}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2 py-2 text-base font-medium bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white rounded-lg transition-colors touch-manipulation"
          >
            C
          </button>
          <button
            onClick={(e) => handleBackspace(e)}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2 py-2 text-lg font-light bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white rounded-lg transition-colors touch-manipulation"
          >
            ⌫
          </button>
        </div>
        
        {/* Second row: 7, 8, 9, ÷ */}
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={(e) => handleKeyPress('7', e)}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2 py-2 text-xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-lg transition-colors touch-manipulation"
          >
            7
          </button>
          <button
            onClick={(e) => handleKeyPress('8', e)}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2 py-2 text-xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-lg transition-colors touch-manipulation"
          >
            8
          </button>
          <button
            onClick={(e) => handleKeyPress('9', e)}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2 py-2 text-xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-lg transition-colors touch-manipulation"
          >
            9
          </button>
          <button
            onClick={(e) => handleKeyPress('/', e)}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2 py-2 text-xl font-light bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white rounded-lg transition-colors touch-manipulation"
          >
            ÷
          </button>
        </div>
        
        {/* Third row: 4, 5, 6, × */}
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={(e) => handleKeyPress('4', e)}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2 py-2 text-xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-lg transition-colors touch-manipulation"
          >
            4
          </button>
          <button
            onClick={(e) => handleKeyPress('5', e)}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2 py-2 text-xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-lg transition-colors touch-manipulation"
          >
            5
          </button>
          <button
            onClick={(e) => handleKeyPress('6', e)}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2 py-2 text-xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-lg transition-colors touch-manipulation"
          >
            6
          </button>
          <button
            onClick={(e) => handleKeyPress('*', e)}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2 py-2 text-xl font-light bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white rounded-lg transition-colors touch-manipulation"
          >
            ×
          </button>
        </div>
        
        {/* Fourth row: 1, 2, 3, - */}
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={(e) => handleKeyPress('1', e)}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2 py-2 text-xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-lg transition-colors touch-manipulation"
          >
            1
          </button>
          <button
            onClick={(e) => handleKeyPress('2', e)}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2 py-2 text-xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-lg transition-colors touch-manipulation"
          >
            2
          </button>
          <button
            onClick={(e) => handleKeyPress('3', e)}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2 py-2 text-xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-lg transition-colors touch-manipulation"
          >
            3
          </button>
          <button
            onClick={(e) => handleKeyPress('-', e)}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2 py-2 text-xl font-light bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white rounded-lg transition-colors touch-manipulation"
          >
            −
          </button>
        </div>
        
        {/* Fifth row: 0, ., ±, + */}
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={(e) => handleKeyPress('0', e)}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2 py-2 text-xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-lg transition-colors touch-manipulation"
          >
            0
          </button>
          <button
            onClick={(e) => handleKeyPress('.', e)}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2 py-2 text-xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-lg transition-colors touch-manipulation"
          >
            .
          </button>
          <button
            onClick={(e) => handleFlipSign(e)}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2 py-2 text-lg font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-lg transition-colors touch-manipulation"
            title="Flip sign"
          >
            ±
          </button>
          <button
            onClick={(e) => handleKeyPress('+', e)}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2 py-2 text-xl font-light bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white rounded-lg transition-colors touch-manipulation"
          >
            +
          </button>
        </div>
        
        {/* Sixth row: Equals and Done */}
        <div className="grid grid-cols-2 gap-1">
          <button
            onClick={(e) => handleEquals(e)}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2 py-2 text-xl font-medium bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white rounded-lg transition-colors touch-manipulation"
          >
            =
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onClose();
            }}
            onMouseDown={(e) => e.preventDefault()}
            className="px-2 py-2 text-base font-medium bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white rounded-lg transition-colors touch-manipulation"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default MathKeyboard;

