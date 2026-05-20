"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    router.push('/dashboard');
  };

  return (
    <div className="min-h-screen bg-warm-sand flex flex-col items-center justify-center p-6 sm:p-12 relative overflow-hidden">
      {/* Abstract background hints */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-gold/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-rust/5 blur-[120px] rounded-full pointer-events-none" />
      
      <Link href="/" className="absolute top-8 left-8 font-serif text-2xl font-bold text-ink">
        Aura<span className="text-gold">HR</span>
      </Link>

      <div className="w-full max-w-md bento-card p-8 sm:p-12 z-10">
        <div className="text-center mb-10">
          <h1 className="font-serif text-4xl text-ink mb-2">Welcome back</h1>
          <p className="font-sans text-ink/60 text-sm">Enter your details to access your dashboard.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="font-mono text-xs uppercase tracking-wider text-ink/80 block">Email</label>
            <input 
              type="email" 
              required
              defaultValue="admin@aurahr.com"
              className="w-full bg-warm-sand border border-ink/10 rounded-lg px-4 py-3 text-ink focus:outline-none focus:border-ink/30 focus:ring-1 focus:ring-ink/30 transition-all font-sans placeholder:text-ink/30"
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="font-mono text-xs uppercase tracking-wider text-ink/80 block">Password</label>
              <a href="#" className="font-sans text-xs text-ink/60 hover:text-ink underline decoration-ink/30 underline-offset-2">Forgot?</a>
            </div>
            <input 
              type="password" 
              required
              defaultValue="password123"
              className="w-full bg-warm-sand border border-ink/10 rounded-lg px-4 py-3 text-ink focus:outline-none focus:border-ink/30 focus:ring-1 focus:ring-ink/30 transition-all font-sans"
            />
          </div>

          <button type="submit" className="w-full bg-ink text-cream hover:opacity-90 py-3.5 rounded-full font-medium transition-all flex items-center justify-center font-sans tracking-wide">
            Continue <span className="ml-2">→</span>
          </button>
        </form>

        <div className="my-8 flex items-center justify-between">
          <hr className="w-full border-ink/10" />
          <span className="px-4 font-mono text-xs text-ink/40 uppercase tracking-widest">Or</span>
          <hr className="w-full border-ink/10" />
        </div>

        <button type="button" onClick={handleLogin} className="w-full bg-transparent border border-ink/20 text-ink hover:bg-ink/5 py-3.5 rounded-full font-medium transition-all flex items-center justify-center gap-3 font-sans">
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Sign in with Google
        </button>

        <p className="mt-8 text-center text-sm text-ink/60 font-sans">
          Don't have an account? <a href="#" className="text-ink font-medium underline decoration-ink/30 underline-offset-2">Sign up</a>
        </p>
      </div>
    </div>
  );
}
