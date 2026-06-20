import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { getContainersByCustomer } from '@/data/containers';
import type { Container } from '@/types/container';
import TempChart from '@/components/TempChart';
import TempGauge from '@/components/TempGauge';
import StatusBadge from '@/components/StatusBadge';
import { formatDurationHours } from '@/utils/temperature';
import { useUserStore } from '@/store/userStore';
import styles from './index.module.scss';
import classnames from 'classnames';

const stageColorMap: Record<string, string> = {
  loading: '#165DFF',
  transit: '#722ED1',
  port: '#FF7D00',
  delivery: '#00B42A'
};

const TemperaturePage: React.FC = () => {
  const { profile } = useUserStore();
  const allContainers = useMemo(() => getContainersByCustomer(profile.customerId), [profile.customerId]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<number>(-1);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerKeyword, setPickerKeyword] = useState('');

  useEffect(() => {
    if (!selectedId && allContainers.length > 0) {
      setSelectedId(allContainers[0].id);
    }
  }, [allContainers, selectedId]);

  const selectedContainer = useMemo<Container | undefined>(() => {
    return allContainers.find(c => c.id === selectedId);
  }, [selectedId, allContainers]);

  const summaryStats = useMemo(() => {
    if (!selectedContainer) return null;
    const allTemps = selectedContainer.stages.flatMap(s => s.tempPoints.map(p => p.temperature));
    const totalHours = selectedContainer.stages.reduce((acc, s) => acc + s.durationHours, 0);
    const anomalyCount = allTemps.filter(t =>
      t < selectedContainer.tempZone.min || t > selectedContainer.tempZone.max
    ).length;
    return {
      max: Math.max(...allTemps),
      min: Math.min(...allTemps),
      avg: Math.round((allTemps.reduce((a, b) => a + b, 0) / allTemps.length) * 10) / 10,
      totalHours: Math.round(totalHours),
      anomalyCount
    };
  }, [selectedContainer]);

  const filteredPickerList = useMemo(() => {
    if (!pickerKeyword.trim()) return allContainers;
    const k = pickerKeyword.toUpperCase();
    return allContainers.filter(c =>
      c.containerNo.toUpperCase().includes(k) ||
      c.goodsName.includes(pickerKeyword) ||
      c.billNo.toUpperCase().includes(k)
    );
  }, [pickerKeyword, allContainers]);

  const handleSelectContainer = (id: string) => {
    setSelectedId(id);
    setShowPicker(false);
    setSelectedStage(-1);
    console.log('[TemperaturePage] selected container:', id);
  };

  const navigateToDetail = () => {
    if (selectedContainer) {
      Taro.navigateTo({ url: `/pages/container-detail/index?id=${selectedContainer.id}` });
    }
  };

  if (!selectedContainer) {
    return (
      <ScrollView scrollY className={styles.page}>
        <View style={{ padding: '200rpx 0', textAlign: 'center' }}>
          <Text style={{ fontSize: '100rpx', opacity: 0.3 }}>🌡️</Text>
          <Text style={{ marginTop: '32rpx', fontSize: '28rpx', color: '#86909C' }}>暂无货柜数据</Text>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.selector}>
        <Text className={styles.selectorLabel}>选择货柜查看温度曲线</Text>
        <View className={styles.selectorBody}>
          <View className={styles.selectorValue} onClick={() => setShowPicker(true)}>
            <Text>{selectedContainer.containerNo}</Text>
            <StatusBadge
              type='status'
              value={selectedContainer.statusText}
              status={selectedContainer.status}
              size='sm'
            />
          </View>
          <View className={styles.selectorBtn} onClick={navigateToDetail}>
            <Text>详情</Text>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <TempGauge
          currentTemp={selectedContainer.currentTemp}
          zone={selectedContainer.tempZone}
          status={selectedContainer.tempStatus}
          size='lg'
        />
      </View>

      {summaryStats && (
        <View className={styles.summary}>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryValue}>{summaryStats.max}℃</Text>
            <Text className={styles.summaryLabel}>全程最高</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryValue}>{summaryStats.min}℃</Text>
            <Text className={styles.summaryLabel}>全程最低</Text>
          </View>
          <View className={styles.summaryItem}>
            <Text className={styles.summaryValue}>{summaryStats.avg}℃</Text>
            <Text className={styles.summaryLabel}>平均温度</Text>
          </View>
          <View className={styles.summaryItem} style={{ background: summaryStats.anomalyCount > 0 ? 'rgba(255,125,0,0.08)' : undefined }}>
            <Text className={styles.summaryValue} style={{ color: summaryStats.anomalyCount > 0 ? '#FF7D00' : undefined }}>
              {summaryStats.anomalyCount}
            </Text>
            <Text className={styles.summaryLabel}>异常点</Text>
          </View>
        </View>
      )}

      <View className={styles.section}>
        <Text className={styles.sectionTitle}>全程温度趋势</Text>
        <TempChart
          stages={selectedContainer.stages}
          zone={selectedContainer.tempZone}
          height={420}
          selectedStage={selectedStage}
          onStageSelect={setSelectedStage}
        />
      </View>

      <View className={styles.stageList}>
        <Text className={styles.stageListTitle}>各阶段温度详情</Text>
        {selectedContainer.stages.map((stage, idx) => {
          const isDone = !!stage.endTime;
          return (
            <View
              key={stage.stage}
              className={styles.stageRow}
              onClick={() => setSelectedStage(selectedStage === idx ? -1 : idx)}
            >
              <View className={styles.stageLeft}>
                <View
                  className={styles.stageDot}
                  style={{
                    background: isDone ? stageColorMap[stage.stage] : '#C9CDD4',
                    boxShadow: !isDone ? `0 0 0 8rpx ${stageColorMap[stage.stage]}20` : undefined
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text className={styles.stageName}>{stage.stageName}</Text>
                  <Text className={styles.stageTime}>
                    {formatDurationHours(stage.durationHours)} · {stage.location}
                  </Text>
                </View>
              </View>
              <View className={styles.stageTemps}>
                <View className={styles.stageTempItem}>
                  <Text className={styles.stageTempLabel}>最高</Text>
                  <Text className={styles.stageTempValue}>{stage.maxTemp}℃</Text>
                </View>
                <View className={styles.stageTempItem}>
                  <Text className={styles.stageTempLabel}>最低</Text>
                  <Text className={styles.stageTempValue}>{stage.minTemp}℃</Text>
                </View>
                <View className={styles.stageTempItem}>
                  <Text className={styles.stageTempLabel}>平均</Text>
                  <Text className={styles.stageTempValue}>{stage.avgTemp}℃</Text>
                </View>
              </View>
            </View>
          );
        })}
      </View>

      {showPicker && (
        <View className={styles.containerPicker}>
          <View className={styles.pickerMask} onClick={() => setShowPicker(false)} />
          <View className={styles.pickerPanel}>
            <View className={styles.pickerHeader}>
              <Text className={styles.pickerTitle}>选择货柜</Text>
              <Text className={styles.pickerClose} onClick={() => setShowPicker(false)}>×</Text>
            </View>
            <Input
              className={styles.pickerSearch}
              placeholder='搜索箱号/货物/提单号'
              value={pickerKeyword}
              onInput={e => setPickerKeyword(e.detail.value)}
            />
            <ScrollView scrollY className={styles.pickerList}>
              {filteredPickerList.map(c => (
                <View
                  key={c.id}
                  className={classnames(styles.pickerItem, selectedId === c.id && styles.selected)}
                  onClick={() => handleSelectContainer(c.id)}
                >
                  <View>
                    <Text className={styles.pickerNo}>{c.containerNo}</Text>
                    <Text className={styles.pickerGoods}>{c.goodsName} · {c.statusText}</Text>
                  </View>
                  {selectedId === c.id && <Text className={styles.pickerCheck}>✓</Text>}
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default TemperaturePage;
