import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import type { TransportStage } from '@/types/container';
import { formatDurationHours } from '@/utils/temperature';
import styles from './index.module.scss';

interface StageTimelineProps {
  stages: TransportStage[];
  activeStage: number;
  onStageClick?: (index: number) => void;
  selectedStage?: number;
}

const StageTimeline: React.FC<StageTimelineProps> = ({ stages, activeStage, onStageClick, selectedStage }) => {
  const stageColors = ['#165DFF', '#722ED1', '#FF7D00', '#00B42A'];

  return (
    <View className={styles.timeline}>
      {stages.map((stage, idx) => {
        const isCompleted = idx < activeStage;
        const isActive = idx === activeStage;
        const isSelected = selectedStage === idx;
        const color = stageColors[idx];

        return (
          <View key={stage.stage} className={styles.stageItem}>
            <View className={styles.stageLeft}>
              <View
                className={classnames(
                  styles.stageDot,
                  isCompleted && styles.completed,
                  isActive && styles.active,
                  isSelected && styles.selected
                )}
                style={{ background: isCompleted || isActive ? color : undefined }}
              >
                {isCompleted && <Text className={styles.checkIcon}>✓</Text>}
                {isActive && <View className={styles.pulse} />}
              </View>
              {idx < stages.length - 1 && (
                <View
                  className={classnames(styles.stageLine, isCompleted && styles.lineDone)}
                  style={{
                    background: isCompleted ? color : undefined
                  }}
                />
              )}
            </View>

            <View
              className={classnames(styles.stageContent, isSelected && styles.contentSelected)}
              onClick={() => onStageClick?.(idx)}
            >
              <View className={styles.stageHeader}>
                <View className={styles.stageNameWrap}>
                  <View
                    className={styles.stageColorTag}
                    style={{ background: `${color}20`, color }}
                  >
                    {stage.stageName}
                  </View>
                  {(isCompleted || isActive) && (
                    <Text className={styles.stageDuration}>
                      耗时 {formatDurationHours(stage.durationHours)}
                    </Text>
                  )}
                </View>
              </View>

              <View className={styles.stageLocation}>
                <Text className={styles.locationLabel}>位置</Text>
                <Text className={styles.locationText}>{stage.location}</Text>
              </View>

              {(isCompleted || isActive) && (
                <View className={styles.stageStats}>
                  <View className={styles.statItem}>
                    <Text className={styles.statLabel}>最高</Text>
                    <Text className={styles.statValue}>{stage.maxTemp}℃</Text>
                  </View>
                  <View className={styles.statItem}>
                    <Text className={styles.statLabel}>最低</Text>
                    <Text className={styles.statValue}>{stage.minTemp}℃</Text>
                  </View>
                  <View className={styles.statItem}>
                    <Text className={styles.statLabel}>平均</Text>
                    <Text className={styles.statValue}>{stage.avgTemp}℃</Text>
                  </View>
                </View>
              )}

              <View className={styles.stageTime}>
                <Text className={styles.timeText}>{stage.startTime}</Text>
                {stage.endTime && <Text className={styles.timeText}>至 {stage.endTime}</Text>}
                {!stage.endTime && isActive && (
                  <Text className={classnames(styles.timeText, styles.ongoing)}>进行中</Text>
                )}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
};

export default StageTimeline;
