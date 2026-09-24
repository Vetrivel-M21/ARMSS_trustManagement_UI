import React from 'react';

interface FooterProps {
  className?: string;
  variant?: 'light' | 'dark';
}

export const Footer: React.FC<FooterProps> = ({ className = '', variant = 'light' }) => {
  const isDark = variant === 'dark';
  return (
    <footer
      className={`py-3 px-4 text-center text-xs ${
        isDark
          ? 'text-slate-400 border-t border-slate-800'
          : 'text-slate-500 border-t border-slate-200 bg-white/75'
      } ${className}`}
    >
      <span>Website designed and developed by </span>
      <span className={isDark ? 'font-bold text-blue-400' : 'font-bold text-blue-600'}>
        ARMSS INFO TECH
      </span>
    </footer>
  );
};

export default Footer;
