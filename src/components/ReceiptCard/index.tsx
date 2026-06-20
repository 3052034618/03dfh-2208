import React from 'react';
import { View, Text } from '@tarojs/components';
import Taro from '@tarojs/taro';
import classnames from 'classnames';
import type { ReceiptRecord } from '@/types/container';
import styles from './index.module.scss';

interface ReceiptCardProps {
  receipt: ReceiptRecord;
  onClick?: () => void;
}

const ReceiptCard: React.FC<ReceiptCardProps> = ({ receipt, onClick }) => {
  const handleClick = () => {
    if (onClick) onClick();
    else Taro.navigateTo({ url: `/pages/receipt-detail/index?id=${receipt.id}` });
  };

  return (
    <View className={styles.card} onClick={handleClick}>
      <View className={styles.header}>
        <View className={styles.leftInfo}>
          <Text className={styles.containerNo}>{receipt.containerNo}</Text>
          <View className={classnames(styles.statusTag, styles[receipt.status])}>
            <Text>{receipt.statusText}</Text>
          </View>
        </View>
        <Text className={styles.receiptTime}>{receipt.receiptTime}</Text>
      </View>

      <View className={styles.goodsInfo}>
        <Text className={styles.goodsName}>{receipt.goodsName}</Text>
      </View>

      <View className={styles.infoRow}>
        <View className={styles.infoCell}>
          <Text className={styles.infoLabel}>提单号</Text>
          <Text className={styles.infoValue}>{receipt.billNo}</Text>
        </View>
        <View className={styles.infoCell}>
          <Text className={styles.infoLabel}>到货温度</Text>
          <Text
            className={classnames(styles.infoValue, styles.tempValue)}
            style={{ color: receipt.inTempRange ? '#00B42A' : '#F53F3F' }}
          >
            {receipt.arrivalTemp}℃
          </Text>
        </View>
      </View>

      <View className={styles.infoRow}>
        <View className={styles.infoCell}>
          <Text className={styles.infoLabel}>铅封号</Text>
          <Text className={styles.infoValue}>{receipt.sealNo}</Text>
        </View>
        <View className={styles.infoCell}>
          <Text className={styles.infoLabel}>铅封状态</Text>
          <Text
            className={classnames(styles.infoValue)}
            style={{ color: receipt.sealIntact ? '#00B42A' : '#F53F3F' }}
          >
            {receipt.sealIntact ? '完好' : '异常'}
          </Text>
        </View>
      </View>

      <View className={styles.footer}>
        <View className={styles.operator}>
          <Text className={styles.operatorLabel}>签收人</Text>
          <Text className={styles.operatorValue}>{receipt.receiptOperator}</Text>
        </View>
        <Text className={styles.arrowText}>查看签收单 ›</Text>
      </View>
    </View>
  );
};

export default ReceiptCard;
