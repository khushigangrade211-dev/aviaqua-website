import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Lock, Mail } from 'lucide-react';
import { BrandLogo } from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleLogin = async (targetEmail: string, targetPassword: string) => {
    setError('');
    setSubmitting(true);
    try {
      const user = await login(targetEmail, targetPassword);
      if (user.role === 'ADMIN') navigate('/admin');
      else if (user.role === 'EMPLOYEE') navigate('/employee');
      else navigate('/customer');
    } catch (err: any) {
      setError(err.message || 'Sign in failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLogin(email, password);
  };

  return (
    <div className="min-h-screen bg-[#0A1628] flex flex-col justify-center py-12 px-4 sm:px-6">
      <div className="max-w-md w-full mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 text-xs text-slate-300 hover:text-teal-300">
            <ArrowLeft className="w-4 h-4" />
            Back to Website
          </Link>
          <BrandLogo dark />
        </div>

        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl border border-slate-200">
          <h1 className="font-display text-2xl font-bold text-slate-900">Sign In to NewEdgeEngineeringAndWorks</h1>
          <p className="mt-1 text-sm text-slate-600">
            Access your Customer, Employee, or Administrator portal.
          </p>

          {error && (
            <div className="mt-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-teal-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-2.5 rounded-lg bg-[#0A1628] hover:bg-teal-700 text-white text-sm font-semibold transition-colors disabled:opacity-60"
            >
              {submitting ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <p className="mt-5 text-center text-xs text-slate-600">
            New customer?{' '}
            <Link to="/register" className="text-teal-700 font-semibold hover:underline">
              Create a Customer Account
            </Link>
          </p>

          {/* Sample Test Accounts Helper */}
          <div className="mt-6 pt-5 border-t border-slate-200">
            <p className="text-[11px] font-semibold text-slate-500 mb-2.5">
              Sample Test Accounts (Demo Environment)
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleLogin('admin@aviaqua.in', 'Admin@123')}
                className="px-2.5 py-2 rounded-lg border border-slate-200 hover:border-teal-600 text-xs font-semibold text-slate-700 hover:text-teal-700 transition-colors"
              >
                Admin
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleLogin('engineer@aviaqua.in', 'Staff@123')}
                className="px-2.5 py-2 rounded-lg border border-slate-200 hover:border-teal-600 text-xs font-semibold text-slate-700 hover:text-teal-700 transition-colors"
              >
                Employee
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => handleLogin('customer@aviaqua.in', 'Client@123')}
                className="px-2.5 py-2 rounded-lg border border-slate-200 hover:border-teal-600 text-xs font-semibold text-slate-700 hover:text-teal-700 transition-colors"
              >
                Customer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
