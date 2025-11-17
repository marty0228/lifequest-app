export type AchievementCategory = 'streak' | 'quest' | 'level' | 'perfect';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'platinum';

export interface Achievement {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  tier: AchievementTier;
  icon: string;
  requirement: number;
  reward: number;
}

export interface UserAchievement {
  achievementId: string;
  progress: number;
  isUnlocked: boolean;
  unlockedAt?: Date;
}
