// src/components/ui/select.tsx
import React from 'react';

interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const Select = ({ value, onValueChange, children, className = '' }: SelectProps) => {
  return (
    <select
      value={value}
      onChange={(e) => onValueChange(e.target.value)}
      className={`border rounded-md px-3 py-2 ${className}`}
    >
      {children}
    </select>
  );
};

interface SelectTriggerProps {
  children: React.ReactNode;
  className?: string;
}

export const SelectTrigger = ({ children, className = '' }: SelectTriggerProps) => {
  return <div className={className}>{children}</div>;
};

interface SelectContentProps {
  children: React.ReactNode;
  className?: string;
}

export const SelectContent = ({ children, className = '' }: SelectContentProps) => {
  return <div className={className}>{children}</div>;
};

interface SelectItemProps {
  value: string;
  children: React.ReactNode;
}

export const SelectItem = ({ value, children }: SelectItemProps) => {
  return <option value={value}>{children}</option>;
};

interface SelectValueProps {
  children: React.ReactNode;
}

export const SelectValue = ({ children }: SelectValueProps) => {
  return <div>{children}</div>;
};