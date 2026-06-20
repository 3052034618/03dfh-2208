import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import type { Container } from '@/types/container';
import StatusBadge from '@/components/StatusBadge';
import styles from './index.module.scss';

interface ContainerCardProps {
  container: Container;
  onClick?: () => void;
}

const ContainerCard: React.FC<ContainerCardProps> = ({ container, onClick }) => {
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      Taro.navigateTo({
        url: `/pages/container-detail/index?id=${container.id}`
      });
    }
  };

  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.header}>
        <View className={styles.containerNoWrap}>
          <Text className={styles.containerNo}>{container.containerNo}</Text>
          <StatusBadge type='status' value={container.statusText} status={container.status} size='sm' />
        </View>
        <View className={styles.tempBadge}>
          <Text className={styles.tempValue}>{container.currentTemp > 0 ? '' : ''}{container.currentTemp}℃</Text>
          <StatusBadge type='temp' value='' status={container.tempStatus} size='sm' />
        </View>
      </View>

      <View className={styles.goodsRow}>
        <Text className={styles.goodsLabel}>货物</Text>
        <Text className={styles.goodsName}>{container.goodsName}</Text>
      </View>

      <View className={styles.infoGrid}>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>提单号</Text>
          <Text className={styles.infoValue}>{container.billNo}</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>温区</Text>
          <Text className={styles.infoValue}>{container.tempZone.label}</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>当前位置</Text>
          <Text className={styles.infoValue}>{container.currentLocation}</Text>
        </View>
        <View className={styles.infoItem}>
          <Text className={styles.infoLabel}>预计到达</Text>
          <Text className={styles.infoValue}>{container.eta}</Text>
        </View>
      </View>

      <View className={styles.footer}>
        <Text className={styles.reportTime}>最近上报 {container.lastReportTime}</Text>
        <View className={styles.arrow}>
          <Text>查看详情 ›</Text>
        </View>
      </View>
    </View>
  );
};

export default ContainerCard;
