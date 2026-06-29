export interface User {
  id: string;
  email: string;
  username: string;
  role: 'user' | 'admin' | 'head_admin';
  joinDate: string;
  completedLessons: string[];
  savedTopics: string[];
  savedNotes: Note[];
  recentActivity: Activity[];
  botStars: Record<string, number>;
  trainingStats: {
    rebuttals: number;
    speeches: number;
    pois: number;
    keywordBattles: number;
    debates: number;
  };
  banned: boolean;
  unlockedLessonIds?: string[];
}

export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
}

export interface Activity {
  id: string;
  type: 'lesson' | 'battle' | 'training' | 'prep';
  title: string;
  timestamp: string;
  detail?: string;
}

export interface Lesson {
  id: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  title_en: string;
  title_vi: string;
  content_en: string;
  content_vi: string;
  order: number;
  pinned: boolean;
}

export interface Topic {
  id: string;
  category: string;
  title_en: string;
  title_vi: string;
  content_en: string;
  content_vi: string;
}

export interface BotPersonality {
  id: string;
  name: string;
  avatar: string;
  bio_en: string;
  bio_vi: string;
  displayStrength: number;
  hiddenPrompt: string;
  knowledge: number;
  logic: number;
  rebuttal: number;
  vocabulary: number;
  creativity: number;
  confidence: number;
}

export interface DebateMotion {
  id: string;
  motion_en: string;
  motion_vi: string;
  difficulty: 'easy' | 'intermediate' | 'hard';
  category: string;
}

export interface BattleState {
  motion: DebateMotion | null;
  side: 'for' | 'against';
  speakerOrder: '1st' | '2nd';
  speechTime: number;
  prepTime: number;
  language: 'en' | 'vi';
  bot: BotPersonality | null;
  customStrength: number;
  messages: ChatMessage[];
  notes: string;
  phase: 'setup' | 'prep' | 'debate' | 'judging' | 'finished';
  currentTurn: 'user' | 'ai';
  round: number;
  hintsUsed: number;
  timerRunning: boolean;
  timeRemaining: number;
}

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface Announcement {
  id: string;
  title_en: string;
  title_vi: string;
  content_en: string;
  content_vi: string;
  createdAt: string;
}
