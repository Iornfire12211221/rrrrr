export interface DPSPost {
  id: string;
  description: string;
  latitude: number;
  longitude: number;
  address?: string;
  landmark?: string;
  timestamp: number;
  expiresAt: number;
  userId: string;
  userName: string;
  type: 'dps' | 'patrol' | 'accident' | 'camera' | 'roadwork' | 'animals' | 'other';
  severity: 'low' | 'medium' | 'high';
  likes?: number;
  likedBy?: string[];
  verified?: boolean;
  photo?: string;
  photos?: string[];
  needsModeration?: boolean;
  moderationReason?: string;
  autoApproved?: boolean;
  autoApprovalReason?: string;
  textApproved?: boolean;
  moderatedBy?: string;
  moderatedAt?: number;
  rejectedByAI?: boolean;
  aiRejectionReason?: string;
  isRelevant?: boolean;
  relevanceCheckedAt?: number;
  aiConfidence?: number;
  userFeedback?: 'positive' | 'negative';
  moderatorDecision?: 'approved' | 'rejected';
}

// Время жизни постов в миллисекундах
export const POST_LIFETIMES = {
  dps: 4 * 60 * 60 * 1000,        // 4 часа - пост ДПС может быть актуален несколько часов
  patrol: 2 * 60 * 60 * 1000,     // 2 часа - патруль обычно перемещается
  accident: 3 * 60 * 60 * 1000,   // 3 часа - ДТП может долго разбираться
  camera: 30 * 24 * 60 * 60 * 1000, // 30 дней - камеры стационарные
  roadwork: 7 * 24 * 60 * 60 * 1000, // 7 дней - ремонт дороги длится долго
  animals: 1 * 60 * 60 * 1000,    // 1 час - животные быстро уходят
  other: 2 * 60 * 60 * 1000,      // 2 часа - остальные события
} as const;

// Интервалы проверки актуальности в миллисекундах
export const RELEVANCE_CHECK_INTERVALS = {
  dps: 30 * 60 * 1000,        // каждые 30 минут
  patrol: 20 * 60 * 1000,     // каждые 20 минут
  accident: 45 * 60 * 1000,   // каждые 45 минут
  camera: 24 * 60 * 60 * 1000, // раз в день
  roadwork: 24 * 60 * 60 * 1000, // раз в день
  animals: 15 * 60 * 1000,    // каждые 15 минут
  other: 30 * 60 * 1000,      // каждые 30 минут
} as const;

export interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  telegramId?: number;
  telegramUsername?: string;
  firstName?: string;
  lastName?: string;
  languageCode?: string;
  isPremium?: boolean;
  photoUrl?: string;
  isAdmin?: boolean;
  isModerator?: boolean;
  registeredAt: number;
  isMuted?: boolean;
  mutedUntil?: number;
  mutedBy?: string;
  isBanned?: boolean;
  bannedUntil?: number;
  bannedBy?: string;
  banReason?: string;
  isKicked?: boolean;
  kickedAt?: number;
  kickedBy?: string;
  kickReason?: string;
}

export interface RegisterUserData {
  name: string;
  email: string;
  password: string;
}

export interface TelegramUserData {
  telegramId: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: boolean;
  photoUrl?: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  userId: string;
  userName: string;
  timestamp: number;
  isDeleted?: boolean;
  deletedBy?: string;
  deletedAt?: number;
}

export interface TrafficStats {
  totalPosts: number;
  activePosts: number;
  verifiedPosts: number;
  averageResponseTime: number;
}

export interface SpeedCamera {
  id: string;
  latitude: number;
  longitude: number;
  speedLimit: number;
  type: 'fixed' | 'mobile';
  direction?: string;
}

export interface WeatherInfo {
  temperature: number;
  condition: string;
  visibility: number;
  roadCondition: 'dry' | 'wet' | 'icy' | 'snow';
}

export interface AITrainingData {
  id: string;
  postId: string;
  postType: string;
  description: string;
  hasPhoto: boolean;
  aiDecision: 'approve' | 'reject';
  aiConfidence: number;
  moderatorDecision?: 'approved' | 'rejected';
  userFeedback?: 'positive' | 'negative';
  timestamp: number;
  timeOfDay: 'morning' | 'day' | 'evening' | 'night';
  season: 'winter' | 'spring' | 'summer' | 'autumn';
}

export interface AIModelStats {
  totalDecisions: number;
  correctDecisions: number;
  falsePositives: number;
  falseNegatives: number;
  accuracy: number;
  lastTrainingDate: number;
  modelVersion: string;
}