import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchAPI } from '../api/client';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { ShieldCheck } from 'lucide-react';

export const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await fetchAPI<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });

    setLoading(false);

    if (res.success && res.data) {
      login(res.data.token, res.data.user);
      navigate('/dashboard');
    } else {
      setError(res.error?.message || 'Login failed. Please check credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-emerald-600 text-white font-bold text-2xl shadow-xl shadow-emerald-900/50 mb-2">
            TM
          </div>
          <h1 className="text-2xl font-bold text-white tracking-wide">
            TRUST MANAGEMENT SYSTEM
          </h1>
          <p className="text-sm text-slate-400">
            Internal Office Donation Accounting & Ledger Portal
          </p>
        </div>

        <Card className="shadow-2xl border-slate-800 bg-white">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-semibold text-rose-700">
                {error}
              </div>
            )}

            <Input
              label="Username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter staff or admin username"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              required
            />

            <Button type="submit" className="w-full py-2.5" isLoading={loading}>
              Sign In to Office Portal
            </Button>
          </form>
        </Card>

        <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Server-Side Closed-Day Protection & Audit Enabled</span>
        </div>
      </div>
    </div>
  );
};
