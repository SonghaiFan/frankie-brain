import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

export const Button = ({ 
  variant = 'primary', 
  size = 'md', 
  fullWidth = false,
  className = '', 
  children,
  ...props 
}: ButtonProps) => {
  const baseStyles = "rounded-[4px] font-medium uppercase tracking-widest transition-[transform,background-color,border-color,color,opacity,box-shadow] duration-[var(--motion-fast)] ease-[var(--ease-standard)] active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const variants = {
    primary: "bg-primary text-white hover:bg-primary-hover shadow-sm",
    secondary: "bg-secondary text-ink hover:bg-secondary-hover",
    ghost: "bg-transparent text-ink-light hover:bg-secondary",
    outline: "border border-secondary text-ink hover:bg-surface"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-[10px]",
    md: "px-4 py-3 text-xs",
    lg: "px-6 py-4 text-sm"
  };

  return (
    <button 
      className={`
        ${baseStyles} 
        ${variants[variant]} 
        ${sizes[size]} 
        ${fullWidth ? 'w-full' : ''} 
        ${className}
      `}
      {...props}
    >
      {children}
    </button>
  );
};
