import { create } from 'zustand';
import type { User, Lesson, Topic, BotPersonality, DebateMotion, Announcement, AiApiKey, Post, Reply, VoteResult } from './types';

interface AppState {
  theme: 'dark' | 'light';
  language: 'en' | 'vi';
  currentUser: User | null;
  users: User[];
  lessons: Lesson[];
  topics: Topic[];
  bots: BotPersonality[];
  motions: DebateMotion[];
  announcements: Announcement[];
  aiConfigured: boolean;
  apiModel: string;
  aiKeys: AiApiKey[];
  isLoading: boolean;
  posts: Post[];
  replies: Reply[];
  currentPostId: string | null;
  
  initApp: () => Promise<void>;
  fetchAiKeys: () => Promise<void>;
  addAiKey: (apiKey: string, model?: string, priority?: number) => Promise<boolean>;
  updateAiKey: (id: string, updates: Partial<AiApiKey>) => Promise<boolean>;
  deleteAiKey: (id: string) => Promise<boolean>;
  saveAiConfig: (apiKey: string, model: string) => Promise<boolean>;
  setTheme: (t: 'dark' | 'light') => void;
  toggleTheme: () => void;
  setLanguage: (l: 'en' | 'vi') => void;
  toggleLanguage: () => void;
  
  login: (email: string, password: string) => Promise<boolean>;
  register: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  
  updateUser: (userId: string, updates: Partial<User>) => Promise<void>;
  updateCurrentUser: (updates: Partial<User>) => Promise<void>;
  
  addLesson: (lesson: Lesson) => Promise<void>;
  updateLesson: (id: string, updates: Partial<Lesson>) => Promise<void>;
  deleteLesson: (id: string) => Promise<void>;
  
  addTopic: (topic: Topic) => Promise<void>;
  updateTopic: (id: string, updates: Partial<Topic>) => Promise<void>;
  deleteTopic: (id: string) => Promise<void>;
  
  addBot: (bot: BotPersonality) => Promise<void>;
  updateBot: (id: string, updates: Partial<BotPersonality>) => Promise<void>;
  deleteBot: (id: string) => Promise<void>;
  
  banUser: (userId: string) => Promise<void>;
  unbanUser: (userId: string) => Promise<void>;
  createAdminAccount: (email: string, password: string, username: string) => Promise<{ success: boolean; error?: string }>;
  
  addAnnouncement: (a: Announcement) => Promise<void>;
  deleteAnnouncement: (id: string) => Promise<void>;
  
  completeLesson: (lessonId: string) => Promise<void>;
  addActivity: (activity: { type: 'lesson' | 'battle' | 'training' | 'prep'; title: string; detail?: string }) => Promise<void>;
  clearActivity: () => Promise<void>;
  addNote: (title: string, content: string) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
  setBotStars: (botId: string, stars: number) => Promise<void>;
  incrementTrainingStat: (stat: 'rebuttals' | 'speeches' | 'pois' | 'keywordBattles' | 'debates' | 'fallacySpotting' | 'weighing' | 'caseBuilding' | 'framing') => Promise<void>;
  addTrainingScore: (stat: 'rebuttals' | 'speeches' | 'pois' | 'keywordBattles' | 'debates' | 'fallacySpotting' | 'weighing' | 'caseBuilding' | 'framing', xp: number) => Promise<void>;
  updateStreak: () => Promise<void>;
  penalizeTraining: (xp: number) => Promise<void>;
  fetchUsers: () => Promise<void>;
isLessonUnlocked: (lessonId: string) => boolean;
   getNextLesson: (lessonId: string) => Lesson | null;
   
   fetchPosts: (page?: number, limit?: number, language?: string) => Promise<{ posts: Post[]; total: number }>;
   createPost: (title_en: string, title_vi: string, content_en: string, content_vi: string, language: string, category?: string) => Promise<boolean>;
   fetchReplies: (postId: string) => Promise<Reply[]>;
   createReply: (postId: string, content_en: string, content_vi: string, parent_id?: string, language?: string) => Promise<boolean>;
   votePost: (postId: string, vote: 1 | -1) => Promise<VoteResult>;
   voteReply: (replyId: string, vote: 1 | -1) => Promise<VoteResult>;
   voteAnnouncement: (announcementId: string, vote: 1 | -1) => Promise<VoteResult>;
   deletePost: (postId: string) => Promise<boolean>;
   updatePost: (postId: string, updates: Partial<Post>) => Promise<boolean>;
   updateAnnouncement: (announcementId: string, updates: { title_en?: string; title_vi?: string; content_en?: string; content_vi?: string }) => Promise<boolean>;
   changePassword: (oldPassword: string, newPassword: string) => Promise<{ success: boolean; error?: string }>;
   reorderLessons: (ids: string[]) => Promise<boolean>;
   reorderBots: (ids: string[]) => Promise<boolean>;
   reorderTopics: (ids: string[]) => Promise<boolean>;
   deleteUser: (userId: string) => Promise<boolean>;
}

const STORAGE_KEY = 'debatecrab_config';

function loadLocalConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

function saveLocalConfig(config: { theme?: string; language?: string }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  } catch {}
}

const localConfig = loadLocalConfig();

export const useStore = create<AppState>((set, get) => ({
  theme: (localConfig.theme as 'dark' | 'light') || 'dark',
  language: (localConfig.language as 'en' | 'vi') || 'en',
  currentUser: null,
  users: [],
  lessons: [],
  topics: [],
  bots: [],
  motions: [],
  announcements: [],
  aiConfigured: false,
  apiModel: 'openrouter/auto',
aiKeys: [],
   isLoading: true,
   posts: [],
   replies: [],
   currentPostId: null,

   initApp: async () => {
    try {
      set({ isLoading: true });
      const userRes = await fetch('/api/auth/me');
      const userData = await userRes.json();
      if (userData.user) {
        set({ currentUser: userData.user });
      }

      const aiRes = await fetch('/api/ai/config');
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        set({
          aiConfigured: !!aiData.configured,
          apiModel: aiData.model || 'openrouter/auto',
        });
      }

      const contentRes = await fetch('/api/content');
      const contentData = await contentRes.json();
      if (contentData) {
        set({
          lessons: contentData.lessons || [],
          topics: contentData.topics || [],
          bots: contentData.bots || [],
          motions: contentData.motions || [],
          announcements: contentData.announcements || [],
        });
      }
    } catch (e) {
      console.error('Error initializing app', e);
    } finally {
      set({ isLoading: false });
    }
  },

  setTheme: (t) => {
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(t);
    set({ theme: t });
    saveLocalConfig({
      theme: t,
      language: get().language,
    });
  },
  toggleTheme: () => {
    const newTheme = get().theme === 'dark' ? 'light' : 'dark';
    document.documentElement.classList.remove('dark', 'light');
    document.documentElement.classList.add(newTheme);
    set({ theme: newTheme });
    saveLocalConfig({
      theme: newTheme,
      language: get().language,
    });
  },
  setLanguage: (l) => {
    set({ language: l });
    saveLocalConfig({
      theme: get().theme,
      language: l,
    });
  },
  toggleLanguage: () => {
    const newLang = get().language === 'en' ? 'vi' : 'en';
    set({ language: newLang });
    saveLocalConfig({
      theme: get().theme,
      language: newLang,
    });
  },

  login: async (email, password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      if (response.ok) {
        const data = await response.json();
        set({ currentUser: data.user });
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  },

  register: async (email, password, username) => {
    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        set({ currentUser: data.user });
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (e) {
      console.error(e);
      return { success: false, error: 'Network error occurred' };
    }
  },

  logout: async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      console.error(e);
    }
    set({ currentUser: null });
  },

  updateUser: async (userId, updates) => {
    // If updating current user
    if (get().currentUser?.id === userId) {
      await get().updateCurrentUser(updates);
    }
  },

  updateCurrentUser: async (updates) => {
    const state = get();
    if (!state.currentUser) return;
    try {
      const updatedUser = { ...state.currentUser, ...updates };
      const response = await fetch('/api/auth/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: updatedUser }),
      });
      if (response.ok) {
        const data = await response.json();
        set({ currentUser: data.user });
      }
    } catch (e) {
      console.error(e);
    }
  },

  fetchUsers: async () => {
    try {
      const response = await fetch('/api/admin/users');
      if (response.ok) {
        const data = await response.json();
        set({ users: data.users || [] });
      }
    } catch (e) {
      console.error(e);
    }
  },

  addLesson: async (lesson) => {
    try {
      const res = await fetch('/api/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lesson }),
      });
      if (res.ok) {
        set({ lessons: [...get().lessons, lesson] });
      }
    } catch (e) {
      console.error(e);
    }
  },
  updateLesson: async (id, updates) => {
    try {
      const res = await fetch(`/api/lessons/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (res.ok) {
        set({ lessons: get().lessons.map(l => l.id === id ? { ...l, ...updates } : l) });
      }
    } catch (e) {
      console.error(e);
    }
  },
  deleteLesson: async (id) => {
    try {
      const res = await fetch(`/api/lessons/${id}`, { method: 'DELETE' });
      if (res.ok) {
        set({ lessons: get().lessons.filter(l => l.id !== id) });
      }
    } catch (e) {
      console.error(e);
    }
  },

  addTopic: async (topic) => {
    try {
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic }),
      });
      if (res.ok) {
        set({ topics: [...get().topics, topic] });
      }
    } catch (e) {
      console.error(e);
    }
  },
  updateTopic: async (id, updates) => {
    try {
      const res = await fetch(`/api/topics/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (res.ok) {
        set({ topics: get().topics.map(t => t.id === id ? { ...t, ...updates } : t) });
      }
    } catch (e) {
      console.error(e);
    }
  },
  deleteTopic: async (id) => {
    try {
      const res = await fetch(`/api/topics/${id}`, { method: 'DELETE' });
      if (res.ok) {
        set({ topics: get().topics.filter(t => t.id !== id) });
      }
    } catch (e) {
      console.error(e);
    }
  },

  addBot: async (bot) => {
    try {
      const res = await fetch('/api/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bot }),
      });
      if (res.ok) {
        set({ bots: [...get().bots, bot] });
      }
    } catch (e) {
      console.error(e);
    }
  },
  updateBot: async (id, updates) => {
    try {
      const res = await fetch(`/api/bots/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      if (res.ok) {
        set({ bots: get().bots.map(b => b.id === id ? { ...b, ...updates } : b) });
      }
    } catch (e) {
      console.error(e);
    }
  },
  deleteBot: async (id) => {
    try {
      const res = await fetch(`/api/bots/${id}`, { method: 'DELETE' });
      if (res.ok) {
        set({ bots: get().bots.filter(b => b.id !== id) });
      }
    } catch (e) {
      console.error(e);
    }
  },

  fetchAiKeys: async () => {
    try {
      const [keysRes, aiRes] = await Promise.all([
        fetch('/api/admin/ai-keys'),
        fetch('/api/ai/config'),
      ]);
      if (keysRes.ok) {
        const data = await keysRes.json();
        set({ aiKeys: data.keys || [] });
      }
      if (aiRes.ok) {
        const aiData = await aiRes.json();
        set({
          aiConfigured: !!aiData.configured,
          apiModel: aiData.model || 'openrouter/auto',
        });
      }
    } catch (e) {
      console.error(e);
    }
  },

  addAiKey: async (apiKey, model, priority) => {
    try {
      const res = await fetch('/api/admin/ai-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: apiKey, model: model || 'openrouter/auto', priority: priority ?? 0 }),
      });
      if (res.ok) {
        await get().fetchAiKeys();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  },

  updateAiKey: async (id, updates) => {
    try {
      const res = await fetch(`/api/admin/ai-keys/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        await get().fetchAiKeys();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  },

  deleteAiKey: async (id) => {
    try {
      const res = await fetch(`/api/admin/ai-keys/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await get().fetchAiKeys();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  },

  saveAiConfig: async (apiKey: string, model: string) => {
    try {
      const state = get();
      // Add key if none exist, otherwise update the first key
      if (state.aiKeys.length === 0) {
        const ok = await state.addAiKey(apiKey, model, 0);
        if (ok) {
          set({ apiModel: model, aiConfigured: true });
        }
        return ok;
      } else {
        const firstKey = state.aiKeys[0];
        const ok = await state.updateAiKey(firstKey.id, { api_key: apiKey, model });
        if (ok) {
          set({ apiModel: model, aiConfigured: true });
        }
        return ok;
      }
    } catch (e) {
      console.error(e);
      return false;
    }
  },

  banUser: async (userId) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned: true }),
      });
      if (res.ok) {
        set({ users: get().users.map(u => u.id === userId ? { ...u, banned: true } : u) });
      }
    } catch (e) {
      console.error(e);
    }
  },
unbanUser: async (userId) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/ban`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ banned: false }),
      });
      if (res.ok) {
        set({ users: get().users.map(u => u.id === userId ? { ...u, banned: false } : u) });
      }
    } catch (e) {
      console.error(e);
    }
  },

  createAdminAccount: async (email, password, username) => {
    try {
      const response = await fetch('/api/admin/create-admin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, username }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (e) {
      console.error(e);
      return { success: false, error: 'Network error occurred' };
    }
  },

  addAnnouncement: async (a) => {
    try {
      const res = await fetch('/api/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcement: a }),
      });
      if (res.ok) {
        set({ announcements: [a, ...get().announcements] });
      }
    } catch (e) {
      console.error(e);
    }
  },
  deleteAnnouncement: async (id) => {
    try {
      const res = await fetch(`/api/announcements/${id}`, { method: 'DELETE' });
      if (res.ok) {
        set({ announcements: get().announcements.filter(a => a.id !== id) });
      }
    } catch (e) {
      console.error(e);
    }
  },

  fetchPosts: async (page = 1, limit = 20, language?: string) => {
    try {
      const url = new URL('/api/community/posts', window.location.origin);
      url.searchParams.set('page', String(page));
      url.searchParams.set('limit', String(limit));
      if (language) url.searchParams.set('language', language);
      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        set({ posts: data.posts || [] });
        return { posts: data.posts || [], total: data.total || 0 };
      }
      return { posts: [], total: 0 };
    } catch (e) {
      console.error(e);
      return { posts: [], total: 0 };
    }
  },
  createPost: async (title_en, title_vi, content_en, content_vi, language, category) => {
    try {
      const res = await fetch('/api/community/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title_en, title_vi, content_en, content_vi, language, category }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          set({ posts: [data, ...get().posts] });
          return true;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  },
  fetchReplies: async (postId) => {
    try {
      const res = await fetch(`/api/community/posts/${postId}/replies`);
      if (res.ok) {
        const data = await res.json();
        set({ replies: data.replies || [] });
        return data.replies || [];
      }
      return [];
    } catch (e) {
      console.error(e);
      return [];
    }
  },
  createReply: async (postId, content_en, content_vi, parent_id?: string, language?: string) => {
    try {
      const res = await fetch(`/api/community/posts/${postId}/replies`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content_en, content_vi, parent_id, language }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          set({ replies: [...get().replies, data] });
          return true;
        }
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  },
  votePost: async (postId, vote) => {
    try {
      const res = await fetch(`/api/community/posts/${postId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const posts = get().posts.map(p => p.id === postId ? { ...p, upvotes: p.upvotes + vote, downvotes: p.downvotes + (vote === 1 ? 0 : 1) } : p);
          set({ posts });
          const post = posts.find(p => p.id === postId);
          return { success: true, score: post ? post.upvotes - post.downvotes : 0, count: 0, user_vote: vote };
        }
      }
    } catch (e) {
      console.error(e);
    }
    return { success: false, score: 0, count: 0, user_vote: 0 };
  },
  voteReply: async (replyId, vote) => {
    try {
      const res = await fetch(`/api/community/replies/${replyId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          const replies = get().replies.map(r => r.id === replyId ? { ...r, upvotes: r.upvotes + vote, downvotes: r.downvotes + (vote === 1 ? 0 : 1) } : r);
          set({ replies });
          const reply = replies.find(r => r.id === replyId);
          return { success: true, score: reply ? reply.upvotes - reply.downvotes : 0, count: 0, user_vote: vote };
        }
      }
    } catch (e) {
      console.error(e);
    }
    return { success: false, score: 0, count: 0, user_vote: 0 };
  },
  voteAnnouncement: async (announcementId, vote) => {
    try {
      const res = await fetch(`/api/announcements/${announcementId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vote }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          return { success: true, score: 0, count: 0, user_vote: vote };
        }
      }
    } catch (e) {
      console.error(e);
    }
    return { success: false, score: 0, count: 0, user_vote: 0 };
  },
  deletePost: async (postId) => {
    try {
      const res = await fetch(`/api/admin/posts/${postId}`, { method: 'DELETE' });
      if (res.ok) {
        set({ posts: get().posts.filter(p => p.id !== postId) });
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  },
  updatePost: async (postId, updates) => {
    try {
      const res = await fetch(`/api/admin/posts/${postId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const posts = get().posts.map(p => p.id === postId ? { ...p, ...updates } : p);
        set({ posts });
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  },
  updateAnnouncement: async (announcementId, updates) => {
    try {
      const res = await fetch(`/api/admin/announcements/${announcementId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      if (res.ok) {
        const announcements = get().announcements.map(a => a.id === announcementId ? { ...a, ...updates } : a);
        set({ announcements });
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  },
  changePassword: async (oldPassword, newPassword) => {
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_password: oldPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (e) {
      console.error(e);
      return { success: false, error: 'Network error occurred' };
    }
  },
  reorderLessons: async (ids) => {
    try {
      const res = await fetch('/api/admin/reorder/lessons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) await get().fetchUsers();
      return res.ok;
    } catch (e) {
      console.error(e);
    }
    return false;
  },
  reorderBots: async (ids) => {
    try {
      const res = await fetch('/api/admin/reorder/bots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) await get().fetchUsers();
      return res.ok;
    } catch (e) {
      console.error(e);
    }
    return false;
  },
  reorderTopics: async (ids) => {
    try {
      const res = await fetch('/api/admin/reorder/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      });
      if (res.ok) await get().fetchUsers();
      return res.ok;
    } catch (e) {
      console.error(e);
    }
    return false;
  },
  deleteUser: async (userId) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        set({ users: get().users.filter(u => u.id !== userId) });
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  },

  completeLesson: async (lessonId) => {
    const state = get();
    if (!state.currentUser) return;
    if (state.currentUser.completedLessons.includes(lessonId)) return;
    const updated = {
      ...state.currentUser,
      completedLessons: [...state.currentUser.completedLessons, lessonId],
    };
    await state.updateCurrentUser(updated);
  },

  addActivity: async (activity) => {
    const state = get();
    if (!state.currentUser) return;
    const newActivity = {
      id: 'act_' + Date.now(),
      ...activity,
      timestamp: new Date().toISOString(),
    };
    const activities = [newActivity, ...state.currentUser.recentActivity].slice(0, 4);
    const updated = { ...state.currentUser, recentActivity: activities };
    await state.updateCurrentUser(updated);
  },

  clearActivity: async () => {
    const state = get();
    if (!state.currentUser) return;
    const updated = { ...state.currentUser, recentActivity: [] };
    await state.updateCurrentUser(updated);
  },

  addNote: async (title, content) => {
    const state = get();
    if (!state.currentUser) return;
    const note = { id: 'note_' + Date.now(), title, content, createdAt: new Date().toISOString() };
    const updated = { ...state.currentUser, savedNotes: [...state.currentUser.savedNotes, note] };
    await state.updateCurrentUser(updated);
  },

  deleteNote: async (noteId) => {
    const state = get();
    if (!state.currentUser) return;
    const updated = { ...state.currentUser, savedNotes: state.currentUser.savedNotes.filter(n => n.id !== noteId) };
    await state.updateCurrentUser(updated);
  },

  setBotStars: async (botId, stars) => {
    const state = get();
    if (!state.currentUser) return;
    const currentStars = state.currentUser.botStars[botId] || 0;
    if (stars <= currentStars) return;
    const updated = { ...state.currentUser, botStars: { ...state.currentUser.botStars, [botId]: stars } };
    await state.updateCurrentUser(updated);
  },

  incrementTrainingStat: async (stat) => {
    const state = get();
    if (!state.currentUser) return;
    const current = state.currentUser.trainingStats[stat] || 0;
    const updated = {
      ...state.currentUser,
      trainingStats: {
        ...state.currentUser.trainingStats,
        [stat]: current + 1,
      },
    };
    await state.updateCurrentUser(updated);
  },

  addTrainingScore: async (stat, xp) => {
    const state = get();
    if (!state.currentUser) return;
    const curScore = state.currentUser.trainingScores[stat] || 0;
    const newTotal = Math.max(0, (state.currentUser.totalXp || 0) + xp);
    const tier = newTotal < 100 ? 'bronze' as const : newTotal < 500 ? 'silver' as const : newTotal < 2000 ? 'gold' as const : 'diamond' as const;

    // streak
    const today = new Date().toISOString().slice(0, 10);
    const last = state.currentUser.lastTrainingDate;
    let streak = state.currentUser.streak || 0;
    if (last !== today) {
      if (last === yesterday()) {
        streak += 1;
      } else {
        streak = 1;
      }
    }

    const updated = {
      ...state.currentUser,
      totalXp: newTotal,
      tier,
      streak,
      lastTrainingDate: today,
      trainingScores: {
        ...state.currentUser.trainingScores,
        [stat]: curScore + Math.max(0, xp),
      },
    };
    await state.updateCurrentUser(updated);
  },

  updateStreak: async () => {
    // merged into addTrainingScore — kept for API compat, no-op
  },

  penalizeTraining: async (xp) => {
    const state = get();
    if (!state.currentUser) return;
    const newTotal = Math.max(0, (state.currentUser.totalXp || 0) - Math.abs(xp));
    const tier = newTotal < 100 ? 'bronze' as const : newTotal < 500 ? 'silver' as const : newTotal < 2000 ? 'gold' as const : 'diamond' as const;
    const updated = {
      ...state.currentUser,
      totalXp: newTotal,
      tier,
    };
    await state.updateCurrentUser(updated);
  },

  // Lesson progression
  isLessonUnlocked: (lessonId: string) => {
    const state = get();
    if (!state.currentUser) return false;
    const lesson = state.lessons.find(l => l.id === lessonId);
    if (!lesson) return false;
    
    // First lesson of each level is always unlocked
    const firstLessonOfLevel = state.lessons
      .filter(l => l.level === lesson.level)
      .sort((a, b) => a.order - b.order)[0];
    if (firstLessonOfLevel?.id === lessonId) return true;
    
    // Check if user has completed the previous lesson in the same level
    const prevLesson = state.lessons
      .filter(l => l.level === lesson.level && l.order < lesson.order)
      .sort((a, b) => b.order - a.order)[0];
    if (prevLesson && state.currentUser.completedLessons.includes(prevLesson.id)) return true;
    
    // Check if explicitly unlocked
    if (state.currentUser.unlockedLessonIds?.includes(lessonId)) return true;
    
    return false;
  },

  getNextLesson: (lessonId: string) => {
    const state = get();
    const lesson = state.lessons.find(l => l.id === lessonId);
    if (!lesson) return null;
    
    const nextLesson = state.lessons
      .filter(l => l.level === lesson.level && l.order > lesson.order)
      .sort((a, b) => a.order - b.order)[0];
    
    return nextLesson || null;
  },
}));