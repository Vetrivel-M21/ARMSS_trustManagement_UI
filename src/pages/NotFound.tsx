import React from 'react';
import { Link } from 'react-router-dom';
import { FileQuestion } from 'lucide-react';

export const NotFound: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center space-y-3">
      <FileQuestion className="w-12 h-12 text-slate-300" />
      <h1 className="text-lg font-bold text-slate-800">Page not found</h1>
      <p className="text-sm text-slate-500">The page you're looking for doesn't exist or has moved.</p>
      <Link to="/dashboard" className="text-sm font-medium text-emerald-600 hover:text-emerald-700 mt-2">
        Back to Dashboard
      </Link>
    </div>
  );
};
