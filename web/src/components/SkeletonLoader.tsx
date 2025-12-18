import React from 'react';

interface SkeletonLoaderProps {
  className?: string;
  lines?: number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ className = '', lines = 1 }) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-gray-200 rounded mb-2"
          style={{ width: i === lines - 1 ? '75%' : '100%' }}
        />
      ))}
    </div>
  );
};

export const GroupCardSkeleton: React.FC = () => {
  return (
    <div className="bg-white shadow rounded-lg p-6 animate-pulse">
      <div className="flex justify-between items-start mb-4">
        <div className="flex-1">
          <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
        </div>
        <div className="h-10 bg-gray-200 rounded w-20 ml-4"></div>
      </div>
    </div>
  );
};

export const GameCardSkeleton: React.FC = () => {
  return (
    <li className="bg-white shadow rounded-lg p-4 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
        </div>
        <div className="h-8 bg-gray-200 rounded w-16"></div>
      </div>
    </li>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; cols?: number }> = ({ rows = 5, cols = 4 }) => {
  return (
    <div className="animate-pulse">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="h-12 bg-gray-200"></div>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="h-16 border-b border-gray-200 flex items-center px-6">
            {Array.from({ length: cols }).map((_, j) => (
              <div
                key={j}
                className="h-4 bg-gray-200 rounded mr-4"
                style={{ width: `${100 / cols}%` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

