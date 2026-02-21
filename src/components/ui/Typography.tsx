import React from 'react';

export const Heading = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <h2 className={`font-sans text-3xl font-bold tracking-tighter text-ink ${className}`}>{children}</h2>
);

export const SubHeading = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <h3 className={`font-sans text-xl font-medium text-ink ${className}`}>{children}</h3>
);

export const Label = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <span className={`font-sans text-[10px] font-bold uppercase tracking-widest text-ink-lighter ${className}`}>{children}</span>
);

export const Mono = ({ children, className = '' }: { children: React.ReactNode, className?: string }) => (
  <span className={`font-mono text-ink ${className}`}>{children}</span>
);

export const Text = ({ children, className = '', size = 'sm' }: { children: React.ReactNode, className?: string, size?: 'xs' | 'sm' | 'base' | 'lg' }) => {
  const sizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    base: 'text-base',
    lg: 'text-lg'
  };
  return <p className={`font-sans text-ink-light ${sizes[size]} ${className}`}>{children}</p>;
};
