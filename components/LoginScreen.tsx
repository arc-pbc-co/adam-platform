import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Lock, User, ArrowLeft, AlertCircle } from 'lucide-react';

interface LoginScreenProps {
  onLogin: (user: { username: string; role: string }) => void;
  onBack: () => void;
}

// Simple hardcoded admin credentials
const ADMIN_USER = {
  username: 'admin',
  password: 'admin123',
  role: 'admin',
};

export function LoginScreen({ onLogin, onBack }: LoginScreenProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    if (username === ADMIN_USER.username && password === ADMIN_USER.password) {
      onLogin({ username: ADMIN_USER.username, role: ADMIN_USER.role });
    } else {
      setError('Invalid username or password');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[400px] h-[400px] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-1/4 right-1/4 w-[300px] h-[300px] bg-purple-500/10 blur-[100px] rounded-full" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative w-full max-w-md"
      >
        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute -top-12 left-0 flex items-center gap-2 text-gray-500 hover:text-white transition-colors text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to home
        </button>

        {/* Login card */}
        <div className="bg-[#111] border border-[#2a2a2a] rounded-lg overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-[#2a2a2a] text-center">
            <div className="w-16 h-16 bg-[#1a1a1a] border border-[#2a2a2a] rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-blue-500" />
            </div>
            <h1 className="text-xl font-bold text-white mb-1">ADAM Platform</h1>
            <p className="text-sm text-gray-500">Sign in to access the control center</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                {error}
              </motion.div>
            )}

            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                Username
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Enter username"
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-lg pl-10 pr-4 py-3 text-white placeholder-gray-600 focus:outline-none focus:border-blue-500 transition-colors"
                  placeholder="Enter password"
                  autoComplete="current-password"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                'Sign In'
              )}
            </button>
          </form>

          {/* Footer hint */}
          <div className="px-6 pb-6">
            <div className="p-3 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg">
              <p className="text-[10px] text-gray-500 text-center font-mono">
                Demo credentials: admin / admin123
              </p>
            </div>
          </div>
        </div>

        {/* Version info */}
        <div className="text-center mt-6">
          <p className="text-[10px] text-gray-600 font-mono">
            ADAM Platform v2.0 • ARC Impact
          </p>
        </div>
      </motion.div>
    </div>
  );
}
