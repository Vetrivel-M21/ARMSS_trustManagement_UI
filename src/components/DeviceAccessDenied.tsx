import React from 'react';

// Deliberately a plain, generic 404 — no mention of "desktop client" or
// device tokens. Revealing that such a restriction exists (and how it works)
// to a browser visitor would just invite them to go find a way around it.
export const DeviceAccessDenied: React.FC = () => (
  <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
    <div className="text-center space-y-3 max-w-md">
      <div className="text-7xl font-bold text-slate-700">404</div>
      <h1 className="text-xl font-semibold text-white">Page Not Found</h1>
      <p className="text-sm text-slate-400">The page you are looking for doesn't exist or has been moved.</p>
    </div>
  </div>
);
