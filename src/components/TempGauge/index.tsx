import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import type { TempStatus, TempZone } from '@/types/container';
import { getTempStatusColor, getTempStatusText } from '@/utils/temperature';
import styles from './index.module.scss';

interface TempGaugeProps {
  currentTemp: number;
  zone: TempZone;
  status: TempStatus;
  size?: 'sm' | 'lg';
}

const TempGauge: React.FC<TempGaugeProps> = ({ currentTemp, zone, status, size = 'lg' }) => {
  const statusColor = getTempStatusColor(status);
  const statusText = getTempStatusText(status);
  const range = zone.max - zone.min;
  const center = (zone.min + zone.max) / 2;
  const clampedTemp = Math.max(zone.min - range * 0.5, Math.min(zone.max + range * 0.5, currentTemp));
  const progress = ((clampedTemp - (zone.min - range * 0.5)) / (range * 2)) * 100;

  return (
    <View className={classnames(styles.gauge, styles[size])}>
      <View className={styles.zoneLabel}>
        <Text className={styles.zoneText}>{zone.label}</Text>
      </View>

      <View className={styles.tempDisplay}>
        <Text className={styles.tempValue} style={{ color: statusColor }}>
          {currentTemp > 0 ? '+' : ''}{currentTemp}
        </Text>
        <Text className={styles.tempUnit} style={{ color: statusColor }}>℃</Text>
      </View>

      <View className={styles.statusLabel}>
        <View className={styles.statusDot} style={{ background: statusColor }} />
        <Text className={styles.statusText} style={{ color: statusColor }}>{statusText}</Text>
      </View>

      <View className={styles.scale}>
        <View className={styles.scaleTrack}>
          <View
            className={styles.safeZone}
            style={{
              left: `${((zone.min - (zone.min - range * 0.5)) / (range * 2)) * 100}%`,
              width: `${(range / (range * 2)) * 100}%`
            }}
          />
          <View
            className={styles.pointer}
            style={{ left: `${progress}%` }}
          />
        </View>
        <View className={styles.scaleLabels}>
          <Text className={styles.scaleLabel}>{zone.min - Math.round(range * 0.5)}℃</Text>
          <Text className={styles.scaleLabel}>{zone.min}℃</Text>
          <Text className={styles.scaleLabel}>{Math.round(center)}℃</Text>
          <Text className={styles.scaleLabel}>{zone.max}℃</Text>
          <Text className={styles.scaleLabel}>{zone.max + Math.round(range * 0.5)}℃</Text>
        </View>
      </View>
    </View>
  );
};

export default TempGauge;
