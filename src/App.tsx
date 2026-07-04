import { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import { useStore } from './store';
import Navbar from './components/Navbar';
import ToastContainer from './components/ToastContainer';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Learn from './pages/Learn';
import Battle from './pages/Battle';
import Training from './pages/Training';
import Prep from './pages/Prep';
import Topics from './pages/Topics';
import Profile from './pages/Profile';
import Settings from './pages/Settings';
import Admin from './pages/Admin';
import Community from './pages/Community';
import Announcements from './pages/Announcements';

export default function App() {
  const { theme, initApp, isLoading, currentUser } = useStore();

  useEffect(() => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(theme);
  }, [theme]);

  useEffect(() => {
    initApp();
  }, [initApp]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-slate-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-orange-500 mb-4"></div>
        <p className="text-sm font-medium text-slate-400">Loading DebateCrab...</p>
      </div>
    );
  }

  return (
    <HashRouter>
      <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-gray-50 text-gray-900'}`}>
        <Navbar />
        <ToastContainer />
        <main className="pt-16">
          <Routes>
            {currentUser ? <Route path="/" element={<Dashboard />} /> : <Route path="/" element={<Home />} />}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/learn" element={<Learn />} />
            <Route path="/learn/:lessonId" element={<Learn />} />
            <Route path="/battle" element={<Battle />} />
            <Route path="/training" element={<Training />} />
            <Route path="/prep" element={<Prep />} />
            <Route path="/topics" element={<Topics />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/community" element={<Community />} />
            <Route path="/announcements" element={<Announcements />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}
