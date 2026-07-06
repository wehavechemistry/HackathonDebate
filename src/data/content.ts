import type { LucideIcon } from 'lucide-react';
import { BookOpen, ClipboardList, Lightbulb, MessageSquare, Mic, Sparkles, Swords, Target } from 'lucide-react';

export const topicCategories = [
  { key: 'education', labelKey: 'topics.education', color: 'from-blue-500 to-cyan-500' },
  { key: 'technology', labelKey: 'topics.technology', color: 'from-purple-500 to-violet-500' },
  { key: 'environment', labelKey: 'topics.environment', color: 'from-green-500 to-emerald-500' },
  { key: 'economics', labelKey: 'topics.economics', color: 'from-yellow-500 to-amber-500' },
  { key: 'politics', labelKey: 'topics.politics', color: 'from-red-500 to-rose-500' },
  { key: 'society', labelKey: 'topics.society', color: 'from-teal-500 to-cyan-500' },
  { key: 'media', labelKey: 'topics.media', color: 'from-indigo-500 to-blue-500' },
  { key: 'culture', labelKey: 'topics.culture', color: 'from-pink-500 to-rose-500' },
  { key: 'misc', labelKey: 'topics.misc', color: 'from-slate-500 to-gray-500' },
] as const;

export const communityPostCategories = ['general', 'education', 'technology', 'environment', 'economics', 'politics', 'society', 'media', 'culture', 'misc'] as const;
export type CommunityCategory = (typeof communityPostCategories)[number];

export const battleDifficultyLevels = ['easy', 'intermediate', 'hard'] as const;
export const battleSpeakerOrders = ['1st', '2nd'] as const;
export const battleSides = ['for', 'against'] as const;

export interface FeatureCardConfig {
  to: string;
  icon: LucideIcon;
  titleKey: string;
  descKey: string;
  color: string;
}

export const homeFeatureCards: FeatureCardConfig[] = [
  { to: '/learn', icon: BookOpen, titleKey: 'home.features.learn', descKey: 'home.features.learn.desc', color: 'from-blue-500 to-cyan-500' },
  { to: '/battle', icon: Swords, titleKey: 'home.features.battle', descKey: 'home.features.battle.desc', color: 'from-red-500 to-orange-500' },
  { to: '/training', icon: Target, titleKey: 'home.features.training', descKey: 'home.features.training.desc', color: 'from-green-500 to-emerald-500' },
  { to: '/prep', icon: Lightbulb, titleKey: 'home.features.prep', descKey: 'home.features.prep.desc', color: 'from-purple-500 to-pink-500' },
];

export interface QuickLinkConfig {
  to: string;
  icon: LucideIcon;
  labelKey: string;
  color: string;
}

export const dashboardQuickLinks: QuickLinkConfig[] = [
  { to: '/learn', icon: BookOpen, labelKey: 'nav.learn', color: 'bg-blue-500/20 text-blue-400' },
  { to: '/battle', icon: Swords, labelKey: 'nav.battle', color: 'bg-red-500/20 text-red-400' },
  { to: '/training', icon: Target, labelKey: 'nav.training', color: 'bg-green-500/20 text-green-400' },
  { to: '/prep', icon: Lightbulb, labelKey: 'nav.prepare', color: 'bg-purple-500/20 text-purple-400' },
];

export interface TrainingModePreset {
  key: 'rebuttal' | 'speech' | 'poi' | 'framing';
  titleKey: string;
  descKey: string;
  color: string;
  icon: LucideIcon;
  xp: number;
  time: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export const trainingModePresets: TrainingModePreset[] = [
  { key: 'rebuttal', titleKey: 'training.rebuttal', descKey: 'training.rebuttal.desc', color: 'from-red-500 to-orange-500', icon: MessageSquare, xp: 25, time: '2-3 min', difficulty: 'Medium' },
  { key: 'speech', titleKey: 'training.speech', descKey: 'training.speech.desc', color: 'from-blue-500 to-cyan-500', icon: Mic, xp: 30, time: '3-5 min', difficulty: 'Medium' },
  { key: 'poi', titleKey: 'training.poi', descKey: 'training.poi.desc', color: 'from-green-500 to-emerald-500', icon: ClipboardList, xp: 20, time: '1-2 min', difficulty: 'Easy' },
  { key: 'framing', titleKey: 'training.framing', descKey: 'training.framing.desc', color: 'from-pink-500 to-rose-600', icon: Sparkles, xp: 25, time: '2-4 min', difficulty: 'Hard' },
];
