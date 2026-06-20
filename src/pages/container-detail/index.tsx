import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { getContainerByNo } from '@/data/containers';
import type { Container } from '@/types/container';
import TempGauge from '@/components/TempGauge';
import StageTimeline from '@/components/StageTimeline';
import StatusBadge from '@/components/StatusBadge';
import { formatDurationHours } from '@/utils/temperature';
import { useUserStore } from '@/store/userStore';
import styles from './index.module.scss';

const ContainerDetailPage: React.FC = () => {
  const router = useRouter();
  const id = router.params.id || '';
  const { profile } = useUserStore();
  const [container, setContainer] = useState<Container | null>(null);
  const [selectedStage, setSelectedStage] = useState<number>(-1);

  useEffect(() => {
    const c = getContainerByNo(id, profile.customerId);
    if (c) {
      setContainer(c);
      console.log('[ContainerDetail] loaded:', c.containerNo);
    } else {
      setContainer(null);
      console.warn('[ContainerDetail] not found or no permission:', id);
    }
  }, [id, profile.customerId]);

  const activeStageIdx = useMemo(() => {
      if (!container) return -1;
      const idx = container.stages.findIndex(s => !s.endTime);
      return idx >= 0 ? idx : container.stages.length - 1;
    }, [container]);

  if (!container) {
      return (
        <ScrollView scrollY className={styles.page}>
          <View className={styles.empty}>
            <Text className={styles.emptyIcon}>📦</Text>
            <Text className={styles.emptyText}>未找到该货柜信息</Text>
          </View>
        </ScrollView>
      );
    }

  const canReceipt = container.status === 'delivery' || container.status === 'port';

  const handleTemp = () => {
    Taro.switchTab({ url: '/pages/temperature/index' });
  };

  const handleReceipt = () => {
    Taro.switchTab({ url: '/pages/receipt/index' });
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.headerCard}>
        <View className={styles.noWrap}>
          <View className={styles.noLeft}>
            <Text className={styles.containerNo}>{container.containerNo}</Text>
            <Text className={styles.goodsName}>{container.goodsName}</Text>
          </View>
          <StatusBadge type='status' value={container.statusText} status={container.status} />
        </View>
        <View className={styles.infoGrid}>
          <View className={styles.infoCell}>
            <Text className={styles.infoLabel}>提单号</Text>
            <Text className={styles.infoValue}>{container.billNo}</Text>
          </View>
          <View className={styles.infoCell}>
            <Text className={styles.infoLabel}>订单号</Text>
            <Text className={styles.infoValue}>{container.orderNo}</Text>
          </View>
          <View className={styles.infoCell}>
            <Text className={styles.infoLabel}>当前位置</Text>
            <Text className={styles.infoValue}>{container.currentLocation}</Text>
          </View>
          <View className={styles.infoCell}>
            <Text className={styles.infoLabel}>预计到达</Text>
            <Text className={styles.infoValue}>{container.eta}</Text>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <TempGauge
          currentTemp={container.currentTemp}
          zone={container.tempZone}
          status={container.tempStatus}
        />
      </View>

      <View className={styles.quickActions}>
        <View className={styles.actionCard} onClick={handleTemp}>
          <View className={styles.actionIcon} style={{ background: 'linear-gradient(135deg, #FF7D00, #FF9E4D)' }}>
            <Text>📈</Text>
          </View>
          <View className={styles.actionTextWrap}>
            <Text className={styles.actionTitle}>温度曲线</Text>
            <Text className={styles.actionDesc}>全程温度监控记录</Text>
          </View>
        </View>
        <View
          className={styles.actionCard} onClick={handleReceipt}
          style={{ opacity: canReceipt ? 1 : 0.6 }}
        >
          <View className={styles.actionIcon} style={{ background: 'linear-gradient(135deg, #00B42A, #33D566)' }}>
            <Text>✅</Text>
          </View>
          <View className={styles.actionTextWrap}>
            <Text className={styles.actionTitle}>到货签收</Text>
            <Text className={styles.actionDesc}>{canReceipt ? '可发起签收流程' : '待进入送仓阶段签收'}</Text>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <View className={styles.sectionTitle}>
            <View className={styles.titleIcon} />
            <Text>运输阶段进度</Text>
          </View>
        </View>
        <View style={{ background: '#ffffff', borderRadius: '16rpx', padding: '32rpx', boxShadow: '0 2rpx 12rpx rgba(0,0,0,0.08)' }}>
          <StageTimeline
            stages={container.stages}
            activeStage={activeStageIdx >= 0 ? activeStageIdx : container.stages.length - 1}
            onStageClick={(idx) => setSelectedStage(selectedStage === idx ? -1 : idx)}
            selectedStage={selectedStage}
          />
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <View className={styles.sectionTitle}>
            <View className={styles.titleIcon} />
            <Text>详细信息</Text>
          </View>
        </View>
        <View className={styles.detailList}>
          <View className={styles.detailRow}>
            <Text className={styles.detailLabel}>承运商</Text>
            <Text className={styles.detailValue}>{container.carrier}</Text>
          </View>
          <View className={styles.detailRow}>
            <Text className={styles.detailLabel}>船名航次</Text>
            <Text className={styles.detailValue}>{container.vesselName} / {container.voyageNo}</Text>
          </View>
          <View className={styles.detailRow}>
            <Text className={styles.detailLabel}>铅封号</Text>
            <Text className={styles.detailValue}>{container.sealNo}</Text>
          </View>
          <View className={styles.detailRow}>
            <Text className={styles.detailLabel}>起运日期</Text>
            <Text className={styles.detailValue}>{container.departureTime}</Text>
          </View>
          <View className={styles.detailRow}>
            <Text className={styles.detailLabel}>目标仓库</Text>
            <Text className={styles.detailValue}>{container.destination}</Text>
          </View>
          <View className={styles.detailRow}>
            <Text className={styles.detailLabel}>总里程</Text>
            <Text className={styles.detailValue}>{container.totalDistance} 公里</Text>
          </View>
          <View className={styles.detailRow}>
            <Text className={styles.detailLabel}>最近上报</Text>
            <Text className={styles.detailValue}>{container.lastReportTime}</Text>
          </View>
          {selectedStage >= 0 && (
            <View className={styles.detailRow}>
              <Text className={styles.detailLabel}>选中阶段耗时</Text>
              <Text className={styles.detailValue}>
                {formatDurationHours(container.stages[selectedStage].durationHours)}
              </Text>
            </View>
          )}
        </View>
      </View>
      <View style={{ height: '160rpx' }} />
      <View className={styles.bar}>
        <View className={styles.btnGhost} onClick={handleTemp}>
          <Text>温度曲线</Text>
        </View>
        <View className={styles.btnPrimary} onClick={handleReceipt}
          style={{ opacity: canReceipt ? 1 : 0.5, pointerEvents: canReceipt ? 'auto' : 'none' }}
        >
          <Text>{canReceipt ? '去签收' : '暂未到签收时间'}</Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default ContainerDetailPage;
