import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Sun, Moon, User, LogOut, Settings, Shield, LayoutDashboard, UserCircle, Wrench, Sparkles, Home, BookOpen, Swords, Dumbbell, FileText, FolderOpen, Users, Megaphone } from 'lucide-react';
import { useStore } from '../store';
import { t } from '../i18n';
import CoachCrab from './CoachCrab';

const iconMap: Record<string, any> = {
  home: Home,
  book: BookOpen,
  swords: Swords,
  dumbbell: Dumbbell,
  'file-text': FileText,
  'folder-open': FolderOpen,
  users: Users,
  megaphone: Megaphone,
};

function NavIcon({ name }: { name: string }) {
  const Icon = iconMap[name];
  if (!Icon) return null;
  return <Icon size={16} />;
}

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { theme, toggleTheme, language, toggleLanguage, currentUser, logout } = useStore();
  const location = useLocation();
  const navigate = useNavigate();
  const isDark = theme === 'dark';

  const navLinks = [
    { to: '/', label: t('nav.home', language), icon: 'home' },
    { to: '/learn', label: t('nav.learn', language), icon: 'book' },
    { to: '/battle', label: t('nav.battle', language), icon: 'swords' },
    { to: '/training', label: t('nav.training', language), icon: 'dumbbell' },
    { to: '/prep', label: t('nav.prepare', language), icon: 'file-text' },
    { to: '/topics', label: t('nav.topics', language), icon: 'folder-open' },
    { to: '/community', label: t('nav.community', language), icon: 'users' },
    { to: '/announcements', label: t('nav.announcements', language), icon: 'megaphone' },
  ];

  const isActive = (path: string) => location.pathname === path;
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'head_admin';

  const linkBase = isDark ? 'text-[#9494a8]' : 'text-slate-600';
  const linkHover = isDark ? 'hover:text-white hover:bg-white/[0.03]' : 'hover:text-slate-900 hover:bg-black/[0.04]';
  const linkActive = isDark ? 'text-amber-400 bg-amber-400/8' : 'text-orange-600 bg-orange-500/10';
  const activeBg = isDark ? 'bg-amber-400/8' : 'bg-orange-500/10';

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-2xl shadow-2xl ${isDark ? 'border-white/[0.04] bg-[#0a0a0f]/80 shadow-black/40' : 'border-black/[0.06] bg-white/80 shadow-black/5'}`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <CoachCrab size={34} animate={false} />
            <span className="text-xl font-extrabold font-display bg-gradient-to-r from-amber-500 to-amber-300 bg-clip-text text-transparent tracking-tight">DebateCrab</span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => {
              const active = isActive(link.to);
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`relative px-2 py-2 rounded-lg text-xs font-medium transition-all duration-200 flex items-center gap-1.5 ${
                    active
                      ? `${linkActive}`
                      : `${linkBase} ${linkHover}`
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="nav-active-bg"
                      className={`absolute inset-0 rounded-lg -z-10 ${activeBg}`}
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <NavIcon name={link.icon || ''} />
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-2">
            <div className={`flex items-center rounded-lg p-1 ${isDark ? 'bg-white/5' : 'bg-black/5'}`}>
              <button
                onClick={() => language !== 'en' ? toggleLanguage() : undefined}
                className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${
                  language === 'en'
                    ? isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-orange-500/15 text-orange-600'
                    : isDark ? 'text-[#9494a8] hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                EN
              </button>
              <button
                onClick={() => language !== 'vi' ? toggleLanguage() : undefined}
                className={`px-2 py-1 rounded-md text-xs font-bold transition-all ${
                  language === 'vi'
                    ? isDark ? 'bg-amber-500/20 text-amber-300' : 'bg-orange-500/15 text-orange-600'
                    : isDark ? 'text-[#9494a8] hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                VI
              </button>
            </div>
            <button
              onClick={toggleTheme}
              className={`p-2 rounded-lg transition-all cursor-pointer ${isDark ? 'text-[#9494a8] hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-900 hover:bg-black/5'}`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>

            {currentUser ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all hover:bg-white/[0.06] cursor-pointer ${
                    isAdmin ? (isDark ? 'text-amber-400' : 'text-orange-600') : (isDark ? 'text-[#9494a8]' : 'text-slate-600')
                  }`}
                >
                  <User size={16} />
                  <span className="hidden sm:inline max-w-[120px] truncate">{currentUser.username}</span>
                  {isAdmin && <Shield size={14} className={isDark ? 'text-amber-400' : 'text-orange-500'} />}
                </button>
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.95 }}
                      className={`absolute right-0 mt-2 w-48 rounded-xl shadow-2xl overflow-hidden ${isDark ? 'bg-[#0a0a0f]/95 backdrop-blur-2xl border border-white/[0.06] shadow-black/40' : 'bg-white/95 backdrop-blur-2xl border border-black/[0.06] shadow-black/10'}`}
                    >
                      <Link
                        to="/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors ${isDark ? 'text-[#9494a8] hover:bg-white/[0.04] hover:text-white' : 'text-slate-600 hover:bg-black/[0.04] hover:text-slate-900'}`}
                      >
                        <LayoutDashboard size={14} />
                        {t('nav.dashboard', language)}
                      </Link>
                      <Link
                        to="/profile"
                        onClick={() => setUserMenuOpen(false)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors ${isDark ? 'text-[#9494a8] hover:bg-white/[0.04] hover:text-white' : 'text-slate-600 hover:bg-black/[0.04] hover:text-slate-900'}`}
                      >
                        <UserCircle size={14} />
                        {t('nav.profile', language)}
                      </Link>
                      <Link
                        to="/settings"
                        onClick={() => setUserMenuOpen(false)}
                        className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors ${isDark ? 'text-[#9494a8] hover:bg-white/[0.04] hover:text-white' : 'text-slate-600 hover:bg-black/[0.04] hover:text-slate-900'}`}
                      >
                        <Wrench size={14} />
                        {t('nav.settings', language)}
                      </Link>
                      {isAdmin && (
                        <Link
                          to="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className={`flex items-center gap-2 px-4 py-3 text-sm transition-colors ${isDark ? 'text-amber-400 hover:bg-white/[0.04] hover:text-amber-300' : 'text-orange-600 hover:bg-black/[0.04] hover:text-orange-500'}`}
                        >
                          <Shield size={14} />
                          {t('nav.admin', language)}
                        </Link>
                      )}
                        <button
                          onClick={() => { logout(); setUserMenuOpen(false); navigate('/'); }}
                          className={`flex items-center gap-2 w-full px-4 py-3 text-sm transition-colors cursor-pointer text-left ${isDark ? 'text-red-400 hover:bg-red-500/8 hover:text-red-300' : 'text-red-600 hover:bg-red-500/8 hover:text-red-500'}`}
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
                  className={`px-3 py-1.5 text-sm font-medium transition-colors ${isDark ? 'text-[#9494a8] hover:text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  {t('nav.login', language)}
                </Link>
                <Link
                  to="/register"
                  className={`px-4 py-1.5 text-sm font-medium rounded-lg shadow-lg transition-all hover:scale-105 active:scale-95 ${isDark ? 'bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white shadow-amber-500/15' : 'bg-gradient-to-r from-orange-600 to-orange-500 hover:from-orange-500 hover:to-orange-400 text-white shadow-orange-500/15'}`}
                >
                  {t('nav.register', language)}
                </Link>
              </div>
            )}

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className={`md:hidden p-2 rounded-lg transition-all ${isDark ? 'text-[#9494a8] hover:text-white hover:bg-white/5' : 'text-slate-600 hover:text-slate-900 hover:bg-black/5'}`}
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
              className={`md:hidden overflow-hidden border-t ${isDark ? 'border-white/[0.04] bg-[#0a0a0f]/95' : 'border-black/[0.06] bg-white/95'}`}
            >
                <div className="py-3 space-y-1">
                {navLinks.map(link => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                      isActive(link.to)
                        ? `${linkActive} border-l-2 ${isDark ? 'border-amber-500' : 'border-orange-500'}`
                        : `${linkBase} ${linkHover}`
                    }`}
                  >
                    <NavIcon name={link.icon || ''} />
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
