import React from 'react';
import { View, Text } from '@tarojs/components';
import classnames from 'classnames';
import styles from './index.module.scss';

interface StatusBadgeProps {
  type: 'status' | 'temp';
  value: string;
  status?: 'normal' | 'warn' | 'danger' | string;
  size?: 'sm' | 'md';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ type, value, status = 'normal', size = 'md' }) => {
  let colorKey = status;
  if (type === 'status') {
    const map: Record<string, string> = {
      loading: 'loading',
      transit: 'transit',
      port: 'port',
      delivery: 'delivery',
      arrived: 'arrived'
    };
    colorKey = map[status] || 'transit';
  }

  return (
    <View className={classnames(styles.badge, styles[colorKey], styles[size])}>
      <View className={styles.dot} />
      <Text className={styles.text}>{value}</Text>
    </View>
  );
};

export default StatusBadge;
