import { useState } from 'react';
import AchievementCard from './AchievementCard';
import type { UserAchievement, AchievementCategory } from '../types/achievement';
import { ACHIEVEMENTS, CATEGORY_LABELS } from '../constants/achievements';
import './AchievementsSection.css';

interface AchievementsSectionProps {
  userAchievements: UserAchievement[];
}

export default function AchievementsSection({ userAchievements }: AchievementsSectionProps) {
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all');

  const filteredAchievements = ACHIEVEMENTS.filter(
    (achievement) =>
      selectedCategory === 'all' || achievement.category === selectedCategory
  );

  const unlockedCount = userAchievements.filter((ua) => ua.isUnlocked).length;
  const totalCount = ACHIEVEMENTS.length;

  return (
    <div className="achievements-section">
      <div className="achievements-header">
        <h2>🏆 업적</h2>
        <div className="achievements-stats">
          <span className="unlocked-count">
            {unlockedCount} / {totalCount}
          </span>
          <div className="completion-bar">
            <div
              className="completion-fill"
              style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <div className="category-filters">
        <button
          className={selectedCategory === 'all' ? 'active' : ''}
          onClick={() => setSelectedCategory('all')}
        >
          전체
        </button>
        {(Object.entries(CATEGORY_LABELS) as [AchievementCategory, string][]).map(([key, label]) => (
          <button
            key={key}
            className={selectedCategory === key ? 'active' : ''}
            onClick={() => setSelectedCategory(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="achievements-grid">
        {filteredAchievements.map((achievement) => {
          const userAchievement = userAchievements.find(
            (ua) => ua.achievementId === achievement.id
          ) || {
            achievementId: achievement.id,
            progress: 0,
            isUnlocked: false,
          };

          return (
            <AchievementCard
              key={achievement.id}
              achievement={achievement}
              userAchievement={userAchievement}
            />
          );
        })}
      </div>
    </div>
  );
}
