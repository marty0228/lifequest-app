import type { Achievement, UserAchievement } from '../types/achievement';
import { TIER_COLORS } from '../constants/achievements';
import './AchievementCard.css';

interface AchievementCardProps {
  achievement: Achievement;
  userAchievement: UserAchievement;
}

export default function AchievementCard({
  achievement,
  userAchievement,
}: AchievementCardProps) {
  const progressPercentage = Math.min(
    (userAchievement.progress / achievement.requirement) * 100,
    100
  );

  return (
    <div
      className={`achievement-card ${userAchievement.isUnlocked ? 'unlocked' : 'locked'}`}
      style={{ borderColor: TIER_COLORS[achievement.tier] }}
    >
      <div className="achievement-icon">{achievement.icon}</div>
      <div className="achievement-content">
        <h3 className="achievement-title">{achievement.title}</h3>
        <p className="achievement-description">{achievement.description}</p>
        <div className="achievement-progress">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{
                width: `${progressPercentage}%`,
                backgroundColor: TIER_COLORS[achievement.tier],
              }}
            />
          </div>
          <span className="progress-text">
            {userAchievement.progress} / {achievement.requirement}
          </span>
        </div>
        {userAchievement.isUnlocked && (
          <div className="achievement-reward">
            +{achievement.reward} XP
          </div>
        )}
      </div>
      {userAchievement.isUnlocked && (
        <div className="achievement-badge">✓</div>
      )}
    </div>
  );
}
