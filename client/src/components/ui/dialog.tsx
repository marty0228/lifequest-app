// src/components/ui/dialog.tsx
import React from 'react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export const Dialog = ({ open, onOpenChange, children }: DialogProps) => {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="bg-white rounded-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
};

export const DialogContent = ({
  children,
  className = '',
}: { children: React.ReactNode; className?: string }) => {
  return <div className={`p-6 ${className}`}>{children}</div>;
};

export const DialogHeader = ({ children }: { children: React.ReactNode }) => {
  return <div className="mb-4 text-xl font-semibold">{children}</div>;
};

export const DialogTitle = ({ children }: { children: React.ReactNode }) => {
  return <h2>{children}</h2>;
};