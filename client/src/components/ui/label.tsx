// src/components/ui/label.tsx
import React from 'react';

interface LabelProps {
  htmlFor?: string; // htmlFor를 선택적으로 변경
  children: React.ReactNode;
}

export const Label = ({ htmlFor, children }: LabelProps) => {
  return (
    <label htmlFor={htmlFor} className="block text-sm font-medium text-gray-700">
      {children}
    </label>
  );
};