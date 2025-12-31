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

  const handleKeyPress = (key: string) => {
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

  const handleBackspace = () => {
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

  const handleFlipSign = () => {
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

  const handleClear = () => {
    onChange('');
    setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }, 0);
  };

  const handleEquals = () => {
    if (onEvaluate && value.trim()) {
      onEvaluate(value);
    }
  };

  return (
    <div
      ref={keyboardRef}
      className="math-keyboard fixed bottom-0 left-0 right-0 bg-black z-50 sm:hidden"
      style={{ maxHeight: '50vh' }}
    >
      <div className="p-1.5 space-y-1.5">
        {/* First row: Parentheses and operators */}
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => handleKeyPress('(')}
            className="px-3 py-4 text-xl font-light bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white rounded-xl transition-colors"
          >
            (
          </button>
          <button
            onClick={() => handleKeyPress(')')}
            className="px-3 py-4 text-xl font-light bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white rounded-xl transition-colors"
          >
            )
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-4 text-lg font-medium bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white rounded-xl transition-colors"
          >
            C
          </button>
          <button
            onClick={handleBackspace}
            className="px-3 py-4 text-xl font-light bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white rounded-xl transition-colors"
          >
            ⌫
          </button>
        </div>
        
        {/* Second row: 7, 8, 9, ÷ */}
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => handleKeyPress('7')}
            className="px-3 py-4 text-2xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-xl transition-colors"
          >
            7
          </button>
          <button
            onClick={() => handleKeyPress('8')}
            className="px-3 py-4 text-2xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-xl transition-colors"
          >
            8
          </button>
          <button
            onClick={() => handleKeyPress('9')}
            className="px-3 py-4 text-2xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-xl transition-colors"
          >
            9
          </button>
          <button
            onClick={() => handleKeyPress('/')}
            className="px-3 py-4 text-2xl font-light bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white rounded-xl transition-colors"
          >
            ÷
          </button>
        </div>
        
        {/* Third row: 4, 5, 6, × */}
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => handleKeyPress('4')}
            className="px-3 py-4 text-2xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-xl transition-colors"
          >
            4
          </button>
          <button
            onClick={() => handleKeyPress('5')}
            className="px-3 py-4 text-2xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-xl transition-colors"
          >
            5
          </button>
          <button
            onClick={() => handleKeyPress('6')}
            className="px-3 py-4 text-2xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-xl transition-colors"
          >
            6
          </button>
          <button
            onClick={() => handleKeyPress('*')}
            className="px-3 py-4 text-2xl font-light bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white rounded-xl transition-colors"
          >
            ×
          </button>
        </div>
        
        {/* Fourth row: 1, 2, 3, - */}
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => handleKeyPress('1')}
            className="px-3 py-4 text-2xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-xl transition-colors"
          >
            1
          </button>
          <button
            onClick={() => handleKeyPress('2')}
            className="px-3 py-4 text-2xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-xl transition-colors"
          >
            2
          </button>
          <button
            onClick={() => handleKeyPress('3')}
            className="px-3 py-4 text-2xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-xl transition-colors"
          >
            3
          </button>
          <button
            onClick={() => handleKeyPress('-')}
            className="px-3 py-4 text-2xl font-light bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white rounded-xl transition-colors"
          >
            −
          </button>
        </div>
        
        {/* Fifth row: 0, ., ±, + */}
        <div className="grid grid-cols-4 gap-1.5">
          <button
            onClick={() => handleKeyPress('0')}
            className="px-3 py-4 text-2xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-xl transition-colors"
          >
            0
          </button>
          <button
            onClick={() => handleKeyPress('.')}
            className="px-3 py-4 text-2xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-xl transition-colors"
          >
            .
          </button>
          <button
            onClick={handleFlipSign}
            className="px-3 py-4 text-xl font-light bg-gray-700 hover:bg-gray-600 active:bg-gray-500 text-white rounded-xl transition-colors"
            title="Flip sign"
          >
            ±
          </button>
          <button
            onClick={() => handleKeyPress('+')}
            className="px-3 py-4 text-2xl font-light bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white rounded-xl transition-colors"
          >
            +
          </button>
        </div>
        
        {/* Sixth row: Equals and Done */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={handleEquals}
            className="px-3 py-4 text-2xl font-medium bg-orange-500 hover:bg-orange-400 active:bg-orange-600 text-white rounded-xl transition-colors"
          >
            =
          </button>
          <button
            onClick={onClose}
            className="px-3 py-4 text-lg font-medium bg-gray-800 hover:bg-gray-700 active:bg-gray-600 text-white rounded-xl transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default MathKeyboard;

