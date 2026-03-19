import { useState, useEffect, type ReactNode } from 'react';
import { hydrateCache } from '../lib/db';

interface Props {
  children: ReactNode;
}

export default function AppLoader({ children }: Props) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    hydrateCache()
      .then(() => setStatus('ready'))
      .catch((err) => {
        console.error('Failed to hydrate from Supabase:', err);
        setErrorMsg(String(err?.message ?? err));
        setStatus('error');
      });
  }, []);

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-[#0E0E0E] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-10 h-10 border-2 border-[#CCF472]/30 border-t-[#CCF472] rounded-full animate-spin mx-auto" />
          <p className="text-sm text-gray-500 font-medium tracking-wide uppercase">Loading your data…</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen bg-[#0E0E0E] flex items-center justify-center px-6">
        <div className="glass p-8 max-w-md w-full text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <svg className="w-6 h-6 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h2 className="text-lg font-bold text-white">Connection Error</h2>
          <p className="text-sm text-gray-500">Could not connect to the database. Check your Supabase configuration.</p>
          {errorMsg && (
            <pre className="text-xs text-red-400/70 bg-white/[0.02] rounded p-3 overflow-auto text-left">{errorMsg}</pre>
          )}
          <button
            onClick={() => { setStatus('loading'); hydrateCache().then(() => setStatus('ready')).catch(() => setStatus('error')); }}
            className="glow-btn px-6 py-2.5 text-sm font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
