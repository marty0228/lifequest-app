import type { UserAchievement } from '../types/achievement';
import { ACHIEVEMENTS } from '../constants/achievements';

interface AchievementProgress {
  currentStreak: number;
  questCompletionsByCategory: Record<string, number>;
  totalQuestsCompleted: number;
  currentLevel: number;
  perfectDaysCount: number;
}

export function calculateAchievementProgress(
  quests: any[],
  level: number
): AchievementProgress {
  const completedQuests = quests.filter((q) => q.completed);
  
  const questCompletionsByCategory: Record<string, number> = {};
  completedQuests.forEach((quest) => {
    const category = quest.category || '기타';
    questCompletionsByCategory[category] = (questCompletionsByCategory[category] || 0) + 1;
  });

  const currentStreak = Math.floor(completedQuests.length / 5);
  const perfectDaysCount = Math.floor(completedQuests.length / 10);

  return {
    currentStreak,
    questCompletionsByCategory,
    totalQuestsCompleted: completedQuests.length,
    currentLevel: level,
    perfectDaysCount,
  };
}

export function checkAchievements(
  progress: AchievementProgress
): UserAchievement[] {
  return ACHIEVEMENTS.map((achievement) => {
    let currentProgress = 0;

    switch (achievement.category) {
      case 'streak':
        currentProgress = progress.currentStreak;
        break;
      case 'quest':
        if (achievement.id.includes('total')) {
          currentProgress = progress.totalQuestsCompleted;
        } else if (achievement.id.includes('study')) {
          currentProgress = progress.questCompletionsByCategory['학업'] || 0;
        } else if (achievement.id.includes('health')) {
          currentProgress = progress.questCompletionsByCategory['건강'] || 0;
        } else if (achievement.id.includes('social')) {
          currentProgress = progress.questCompletionsByCategory['사회 활동'] || 0;
        }
        break;
      case 'level':
        currentProgress = progress.currentLevel;
        break;
      case 'perfect':
        currentProgress = progress.perfectDaysCount;
        break;
    }

    return {
      achievementId: achievement.id,
      progress: currentProgress,
      isUnlocked: currentProgress >= achievement.requirement,
      unlockedAt: currentProgress >= achievement.requirement ? new Date() : undefined,
    };
  });
}
