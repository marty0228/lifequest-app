// src/components/ui/button.tsx
import React from 'react';

interface ButtonProps {
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'primary' | 'secondary' | 'destructive';
}

export const Button = ({
  onClick,
  className = '',
  children,
  size = 'md',
  variant = 'primary',
}: ButtonProps) => {
  const baseStyles = 'px-4 py-2 rounded-md focus:outline-none transition-all';
  const sizeStyles = size === 'sm' ? 'text-sm' : size === 'lg' ? 'text-lg' : 'text-base';
  const variantStyles =
    variant === 'primary'
      ? 'bg-indigo-600 text-white hover:bg-indigo-700'
      : variant === 'secondary'
      ? 'bg-gray-200 text-gray-800 hover:bg-gray-300'
      : 'bg-red-600 text-white hover:bg-red-700';

  return (
    <button
      onClick={onClick}
      className={`${baseStyles} ${sizeStyles} ${variantStyles} ${className}`}
    >
      {children}
    </button>
  );
};