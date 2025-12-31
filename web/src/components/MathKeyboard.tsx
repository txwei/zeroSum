import React, { useEffect, useRef } from 'react';

interface MathKeyboardProps {
  value: string;
  onChange: (value: string) => void;
  onClose: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}

const MathKeyboard: React.FC<MathKeyboardProps> = ({ value, onChange, onClose, inputRef }) => {
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

  return (
    <div
      ref={keyboardRef}
      className="math-keyboard fixed bottom-0 left-0 right-0 bg-white border-t border-gray-300 shadow-lg z-50 sm:hidden"
      style={{ maxHeight: '50vh' }}
    >
      <div className="p-2 space-y-2">
        {/* First row: Numbers and operators */}
        <div className="grid grid-cols-5 gap-1">
          {['7', '8', '9', '(', ')'].map((key) => (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              className="px-3 py-3 text-lg font-medium bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-md transition-colors"
            >
              {key}
            </button>
          ))}
        </div>
        
        {/* Formula row */}
        <div className="grid grid-cols-5 gap-1">
          <button
            onClick={() => handleKeyPress('=')}
            className="px-3 py-2 text-sm font-medium bg-blue-100 hover:bg-blue-200 active:bg-blue-300 text-blue-700 rounded-md transition-colors"
            title="Start formula"
          >
            =
          </button>
          <div className="col-span-4"></div>
        </div>
        
        {/* Second row: Numbers */}
        <div className="grid grid-cols-5 gap-1">
          {['4', '5', '6', '+', '-'].map((key) => (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              className="px-3 py-3 text-lg font-medium bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-md transition-colors"
            >
              {key}
            </button>
          ))}
        </div>
        
        {/* Third row: Numbers and operators */}
        <div className="grid grid-cols-5 gap-1">
          {['1', '2', '3', '*', '/'].map((key) => (
            <button
              key={key}
              onClick={() => handleKeyPress(key)}
              className="px-3 py-3 text-lg font-medium bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-md transition-colors"
            >
              {key === '*' ? '×' : key === '/' ? '÷' : key}
            </button>
          ))}
        </div>
        
        {/* Fourth row: Special keys */}
        <div className="grid grid-cols-5 gap-1">
          <button
            onClick={() => handleKeyPress('0')}
            className="px-3 py-3 text-lg font-medium bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-md transition-colors"
          >
            0
          </button>
          <button
            onClick={() => handleKeyPress('.')}
            className="px-3 py-3 text-lg font-medium bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-md transition-colors"
          >
            .
          </button>
          <button
            onClick={handleFlipSign}
            className="px-3 py-3 text-sm font-medium bg-gray-100 hover:bg-gray-200 active:bg-gray-300 rounded-md transition-colors"
            title="Flip sign"
          >
            ±
          </button>
          <button
            onClick={handleBackspace}
            className="px-3 py-3 text-lg font-medium bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-700 rounded-md transition-colors"
          >
            ⌫
          </button>
          <button
            onClick={handleClear}
            className="px-3 py-3 text-sm font-medium bg-red-100 hover:bg-red-200 active:bg-red-300 text-red-700 rounded-md transition-colors"
          >
            Clear
          </button>
        </div>
        
        {/* Close button */}
        <div className="pt-2 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 active:bg-gray-400 rounded-md text-sm font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default MathKeyboard;

