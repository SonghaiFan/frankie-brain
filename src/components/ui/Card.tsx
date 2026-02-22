import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  onClick?: () => void;
  hoverable?: boolean;
}

export const Card = ({ children, className = '', onClick, hoverable = false, ...props }: CardProps) => {
  const Component = onClick ? 'button' : 'div';
  
  return (
    // @ts-ignore
    <Component 
      onClick={onClick}
      className={`
        bg-surface border border-secondary rounded-md overflow-hidden relative
        ${(onClick || hoverable) ? 'text-left hover:bg-surface-hover active:scale-[0.99] transition-[transform,background-color,border-color,color,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-standard)] cursor-pointer' : ''}
        ${onClick ? 'w-full' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </Component>
  );
};

export const CardHeader = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-4 pb-2 ${className}`}>{children}</div>
);

export const CardContent = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <div className={`p-4 pt-0 ${className}`}>{children}</div>
);
