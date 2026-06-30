import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useStore } from '../store';
import { t } from '../i18n';
import CoachCrab from '../components/CoachCrab';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [error, setError] = useState('');
  const { register, language } = useStore();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (username.length < 2) {
      setError(language === 'vi' ? 'Tên người dùng phải có ít nhất 2 ký tự.' : 'Username must be at least 2 characters.');
      return;
    }
    const result = await register(email, password, username);
    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || t('auth.email_exists', language));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <CoachCrab size={80} />
          <h1 className="text-2xl font-bold text-white mt-4">{t('auth.register', language)}</h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{t('auth.username', language)}</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{t('auth.email', language)}</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">{t('auth.password', language)}</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            />
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-semibold rounded-lg transition-all hover:scale-[1.02] shadow-lg shadow-orange-500/25"
          >
            {t('auth.register', language)}
          </button>

          <p className="text-center text-sm text-slate-400">
            {t('auth.has_account', language)}{' '}
            <Link to="/login" className="text-orange-400 hover:text-orange-300 font-medium">
              {t('auth.login', language)}
            </Link>
          </p>
        </form>
      </motion.div>
    </div>
  );
}
