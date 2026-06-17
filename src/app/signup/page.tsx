'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Building2, User, Eye, EyeOff, ArrowRight, Loader2, CheckCircle } from 'lucide-react';
import { moodleSignup } from '@/lib/moodle';
import { useAuth } from '@/contexts/AuthContext';

type Role = 'organization' | 'candidate';

export default function SignupPage() {
  const router = useRouter();
  const { isAuthenticated, userRole, isLoading } = useAuth();
  const [role, setRole] = useState<Role>('candidate');
  const [formData, setFormData] = useState({
    firstname: '',
    lastname: '',
    email: '',
    password: '',
    confirmPassword: '',
    company: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Auto-redirect already authenticated users
  useEffect(() => {
    if (!isLoading && isAuthenticated && userRole) {
      router.replace(userRole === 'organization' ? '/org' : '/candidate');
    }
  }, [isAuthenticated, userRole, isLoading, router]);

  function updateField(field: string, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validation.
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);

    try {
      await moodleSignup({
        username: formData.email.toLowerCase(), // Use full email address lowercase as username.
        password: formData.password,
        firstname: formData.firstname,
        lastname: formData.lastname,
        email: formData.email,
        role,
        company: formData.company,
      });

      setSuccess(true);
      setTimeout(() => router.replace('/login'), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-warm-sand via-cream to-warm-sand">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-cream/80 backdrop-blur-2xl rounded-3xl border border-ink/8 shadow-2xl p-10 text-center max-w-md"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring' }}
          >
            <CheckCircle size={64} className="text-sage mx-auto mb-4" />
          </motion.div>
          <h2 className="font-serif text-2xl font-bold text-ink mb-2">Account Created!</h2>
          <p className="text-ink/50 text-sm">Redirecting you to login...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-warm-sand via-cream to-warm-sand relative overflow-hidden py-12">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-sage/8 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-gold/8 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-lg mx-4"
      >
        <div className="bg-cream/80 backdrop-blur-2xl rounded-3xl border border-ink/8 shadow-2xl shadow-ink/5 p-8">
          {/* Logo */}
          <div className="flex items-center justify-center mb-6">
            <div className="flex items-center space-x-3">
              <svg viewBox="0 0 24 24" fill="none" className="w-10 h-10 text-sage" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z" className="opacity-20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                <path d="M2 12h20" className="opacity-20" />
              </svg>
              <span className="font-serif text-3xl font-bold text-ink tracking-tight">AuraHR</span>
            </div>
          </div>

          <h2 className="text-center font-sans text-lg text-ink/60 mb-6">Create your account</h2>

          {/* Role tabs */}
          <div className="flex bg-warm-sand/60 rounded-2xl p-1.5 mb-6">
            {(['candidate', 'organization'] as Role[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`flex-1 flex items-center justify-center space-x-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  role === r
                    ? 'bg-cream shadow-sm text-ink'
                    : 'text-ink/40 hover:text-ink/60'
                }`}
              >
                {r === 'candidate' ? <User size={16} /> : <Building2 size={16} />}
                <span className="capitalize">{r}</span>
              </button>
            ))}
          </div>

          {/* Error */}
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="mb-5 px-4 py-3 bg-rust/10 border border-rust/20 rounded-2xl text-rust text-sm"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="wait">
              {role === 'organization' && (
                <motion.div
                  key="company"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">Company Name</label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => updateField('company', e.target.value)}
                    placeholder="Acme Corp"
                    required={role === 'organization'}
                    className="w-full px-4 py-3 bg-warm-sand/60 border border-ink/8 rounded-2xl text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all text-sm"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            {/* Name fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">First Name</label>
                <input
                  type="text" value={formData.firstname}
                  onChange={(e) => updateField('firstname', e.target.value)}
                  placeholder="John" required
                  className="w-full px-4 py-3 bg-warm-sand/60 border border-ink/8 rounded-2xl text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">Last Name</label>
                <input
                  type="text" value={formData.lastname}
                  onChange={(e) => updateField('lastname', e.target.value)}
                  placeholder="Doe" required
                  className="w-full px-4 py-3 bg-warm-sand/60 border border-ink/8 rounded-2xl text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">Email</label>
              <input
                type="email" value={formData.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="john@company.com" required
                className="w-full px-4 py-3 bg-warm-sand/60 border border-ink/8 rounded-2xl text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'} value={formData.password}
                  onChange={(e) => updateField('password', e.target.value)}
                  placeholder="Min. 8 characters" required minLength={8}
                  className="w-full px-4 py-3 bg-warm-sand/60 border border-ink/8 rounded-2xl text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all text-sm pr-12"
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-ink/30 hover:text-ink/60 transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-ink/60 mb-1.5 ml-1">Confirm Password</label>
              <input
                type="password" value={formData.confirmPassword}
                onChange={(e) => updateField('confirmPassword', e.target.value)}
                placeholder="••••••••" required
                className="w-full px-4 py-3 bg-warm-sand/60 border border-ink/8 rounded-2xl text-ink placeholder:text-ink/30 focus:outline-none focus:ring-2 focus:ring-gold/40 transition-all text-sm"
              />
            </div>

            <motion.button
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center space-x-2 px-6 py-3.5 bg-ink text-cream rounded-2xl font-sans font-semibold text-sm hover:bg-ink/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors shadow-lg shadow-ink/10 mt-6"
            >
              {loading ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  <UserPlus size={18} />
                  <span>Create Account</span>
                  <ArrowRight size={16} />
                </>
              )}
            </motion.button>
          </form>

          <div className="flex items-center my-6">
            <div className="flex-1 h-px bg-ink/8" />
            <span className="px-3 text-xs text-ink/30 font-medium">ALREADY HAVE AN ACCOUNT?</span>
            <div className="flex-1 h-px bg-ink/8" />
          </div>

          <Link
            href="/login"
            className="block w-full text-center px-6 py-3 border border-ink/10 rounded-2xl text-sm font-medium text-ink/60 hover:bg-ink/3 hover:text-ink transition-all"
          >
            Sign in instead
          </Link>
        </div>
      </motion.div>
    </div>
  );
}
