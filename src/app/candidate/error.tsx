'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full p-6">
      <div className="bento-card p-8 max-w-md w-full text-center border-rust/20 border">
        <div className="w-12 h-12 rounded-full bg-rust/10 text-rust flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h2 className="text-xl font-serif font-bold text-ink mb-2">Something went wrong!</h2>
        <p className="text-sm text-ink/60 mb-6">
          We encountered an error while loading this page. Please try again.
        </p>
        <button
          onClick={() => reset()}
          className="bg-rust text-white font-semibold py-2 px-6 rounded-xl hover:bg-rust/90 transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-rust/50 focus:ring-offset-2"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
