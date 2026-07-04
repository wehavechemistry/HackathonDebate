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
    fallacySpotting: number;
    weighing: number;
    caseBuilding: number;
    framing: number;
  };
  trainingScores: {
    rebuttals: number;
    speeches: number;
    pois: number;
    keywordBattles: number;
    debates: number;
    fallacySpotting: number;
    weighing: number;
    caseBuilding: number;
    framing: number;
  };
  totalXp: number;
  streak: number;
  lastTrainingDate: string | null;
  tier: 'bronze' | 'silver' | 'gold' | 'diamond';
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
  type?: 'static' | 'interactive';
  level: 'beginner' | 'intermediate' | 'advanced';
  title_en: string;
  title_vi: string;
  content_en: string;
  content_vi: string;
  order: number;
  pinned: boolean;
  description?: string;
  xpReward?: number;
  coachId?: string;
  coachName?: string;
  steps?: LessonStep[];
}

export interface LessonStep {
  id: string;
  type: 'text' | 'quiz' | 'essay' | 'end';
  coachText: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  placeholder?: string;
  nextId: string | null;
}

export interface LessonScript {
  id: string;
  title: string;
  level: 'beginner' | 'intermediate' | 'advanced';
  description: string;
  xpReward: number;
  coachId?: string;
  coachName?: string;
  steps: LessonStep[];
}

export interface Topic {
  id: string;
  category: string;
  title_en: string;
  title_vi: string;
  content_en: string;
  content_vi: string;
  image_id?: string;
}

export interface BotPersonality {
  id: string;
  name: string;
  avatar: string;
  avatarUrl?: string;
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
  order_num?: number;
  voice_style?: 'man' | 'woman' | 'boy' | 'girl' | 'default';
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

export interface AiApiKey {
  id: string;
  api_key: string;
  model: string;
  priority: number;
  enabled: boolean;
}

export interface Post {
  id: string;
  title_en: string;
  title_vi: string;
  content_en: string;
  content_vi: string;
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at: string;
  language: string;
  upvotes: number;
  downvotes: number;
  category: string;
  reply_count?: number;
  user_vote?: number;
}

export interface Reply {
  id: string;
  post_id: string;
  parent_id: string | null;
  content_en: string;
  content_vi: string;
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at: string;
  language: string;
  upvotes: number;
  downvotes: number;
  user_vote?: number;
}

export interface VoteResult {
  success: boolean;
  score: number;
  count: number;
  user_vote: number;
}