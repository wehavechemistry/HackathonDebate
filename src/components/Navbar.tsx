import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon, Globe, User, LogOut, Settings, Shield, LayoutDashboard, UserCircle, Wrench, Sparkles } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../i18n';
import CoachCrab from './CoachCrab';

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { theme, toggleTheme, language, toggleLanguage, currentUser, logout } = useStore();
  const location = useLocation();

  const navLinks = [
    { to: '/', label: t('nav.home', language) },
    { to: '/learn', label: t('nav.learn', language) },
    { to: '/battle', label: t('nav.battle', language) },
    { to: '/training', label: t('nav.training', language) },
    { to: '/prep', label: t('nav.prepare', language) },
    { to: '/topics', label: t('nav.topics', language) },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'head_admin';

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.04] bg-[#0a0a0f]/80 backdrop-blur-2xl shadow-2xl shadow-black/40">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <CoachCrab size={34} animate={false} />
            <span className="text-xl font-extrabold font-display bg-gradient-to-r from-amber-500 to-amber-300 bg-clip-text text-transparent tracking-tight">DebateCrab</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-2">
            {navLinks.map(link => {
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'text-amber-400 bg-amber-400/8'
                      : 'text-[#9494a8] hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active-bg"
                      className="absolute inset-0 bg-amber-400/8 rounded-lg -z-10"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleLanguage}
              className="p-2 rounded-lg text-[#9494a8] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
              title={language === 'en' ? 'Switch to Vietnamese' : 'Chuyển sang Tiếng Anh'}
            >
              <Globe size={18} />
              <span className="ml-1 text-xs font-semibold">{language.toUpperCase()}</span>
            </button>
            <button
              onClick={toggleTheme}
              className="p-2 rounded-lg text-[#9494a8] hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-white/[0.06] cursor-pointer ${
                    isAdmin ? 'text-amber-400' : 'text-[#9494a8]'
                  }`}
                >
                  <User size={16} />
                  <span className="hidden sm:inline max-w-[120px] truncate">{currentUser.username}</span>
                  {isAdmin && <Shield size={14} className="text-amber-400" />}
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      className="absolute right-0 mt-2 w-48 bg-[#0a0a0f]/95 backdrop-blur-2xl border border-white/[0.06] rounded-xl shadow-2xl shadow-black/40 overflow-hidden"
                    >
                      <Link
                        to="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-[#9494a8] hover:bg-white/[0.04] hover:text-white transition-colors"
                      >
                        <LayoutDashboard size={14} />
                        {t('nav.dashboard', language)}
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-[#9494a8] hover:bg-white/[0.04] hover:text-white transition-colors"
                      >
                        <UserCircle size={14} />
                        {t('nav.profile', language)}
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-[#9494a8] hover:bg-white/[0.04] hover:text-white transition-colors"
                      >
                        <Wrench size={14} />
                        {t('nav.settings', language)}
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-3 text-sm text-amber-400 hover:bg-white/[0.04] hover:text-amber-300 transition-colors"
                        >
                          <Shield size={14} />
                          {t('nav.admin', language)}
                        </Link>
                      )}
                        <button
                          onClick={() => { logout(); setUserMenuOpen(false); }}
                          className="flex items-center gap-2 w-full px-4 py-3 text-sm text-red-400 hover:bg-red-500/8 hover:text-red-300 transition-colors cursor-pointer text-left"
                        >
                        <LogOut size={14} />
                        {t('nav.logout', language)}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-3 py-1.5 text-sm text-[#9494a8] hover:text-white transition-colors font-medium"
                >
                  {t('nav.login', language)}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-1.5 text-sm bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-medium rounded-lg shadow-lg shadow-amber-500/15 transition-all hover:scale-105 active:scale-95"
                >
                  {t('nav.register', language)}
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="md:hidden p-2 rounded-lg text-[#9494a8] hover:text-white hover:bg-white/5"
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Mobile Nav */}
        <AnimatePresence>
          {mobileOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="md:hidden overflow-hidden border-t border-white/[0.04] bg-[#0a0a0f]/95"
            >
              <div className="py-3 space-y-1">
                {navLinks.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={`block px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      isActive(link.to)
                        ? 'text-amber-400 bg-amber-400/8 border-l-2 border-amber-500'
                        : 'text-[#9494a8] hover:text-white hover:bg-white/[0.03]'
                    }`}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </nav>
  );
}
