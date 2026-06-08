'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { LogIn, Eye, EyeOff, ArrowRight, Loader2 } from 'lucide-react';
import { moodleLogin } from '@/lib/moodle';
import { useAuth } from '@/contexts/AuthContext';

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, userRole, isLoading } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Auto-redirect already authenticated users
  useEffect(() => {
    if (!isLoading && isAuthenticated && userRole) {
      router.replace(userRole === 'organization' ? '/org' : '/candidate');
    }
  }, [isAuthenticated, userRole, isLoading, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { token, user } = await moodleLogin(email, password);
      login(token, user);
      
      // Automatic RBAC based on department field stored during signup
      router.replace(user.role === 'organization' ? '/org' : '/candidate');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-warm-sand via-cream to-warm-sand relative overflow-hidden">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-gold/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-sage/8 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-rust/3 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="relative w-full max-w-md mx-4"
      >
        {/* Card */}
        <div className="bg-cream/80 backdrop-blur-2xl rounded-3xl border border-ink/8 shadow-2xl shadow-ink/5 p-8">
          {/* Logo */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-3">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                className="w-10 h-10 text-sage"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" className="opacity-20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                <path d="M2 12h20" className="opacity-20" />
              </svg>
              <span className="font-serif text-3xl font-bold text-ink tracking-tight">AuraHR</span>
            </div>
          </div>

          <h2 className="text-center font-sans text-lg text-ink/60 mb-8">
            Welcome back. Sign in to continue.
          </h2>

          {/* Error message */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-6 px-4 py-3 bg-rust/10 border border-rust/20 rounded-2xl text-rust text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Username / Email */}
            <div>
              <label className="block text-sm font-medium text-ink/60 mb-2 ml-1">
                Username or Email
              </label>
              <input
                type="text"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.email@company.com"
                required
                className="w-full px-4 py-3.5 bg-warm-sand/60 border border-ink/8 rounded-2xl text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/40 transition-all text-sm"
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-ink/60 mb-2 ml-1">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••"
                  required
                  className="w-full px-4 py-3.5 bg-warm-sand/60 border border-ink/8 rounded-2xl text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-gold/40 focus:border-gold/40 transition-all text-sm pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3.5 bg-ink text-cream rounded-2xl font-sans font-semibold text-sm hover:bg-ink/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-lg shadow-ink/10"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <LogIn size={18} />
                  <span>Sign In</span>
                  <ArrowRight size={16} className="ml-1" />
                </>
              )}
            </motion.button>
          </form>

          {/* Divider */}
          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-ink/8" />
            <span className="px-3 text-xs text-ink/30 font-medium">NEW HERE?</span>
            <div className="flex-1 h-px bg-ink/8" />
          </div>

          {/* Sign up link */}
          <Link
            href="/signup"
            className="block w-full text-center px-6 py-3 border border-ink/10 rounded-2xl text-sm font-medium text-ink/60 hover:bg-ink/3 hover:text-ink hover:border-ink/20 transition-all"
          >
            Create a new account
          </Link>
        </div>

        {/* Dev credentials note */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-4 text-center text-xs text-ink/30"
        >
          Development mode — Connect to Moodle at{' '}
          <code className="font-mono bg-ink/5 px-1.5 py-0.5 rounded">localhost/moodle</code>
        </motion.div>
      </motion.div>
    </div>
  );
}
