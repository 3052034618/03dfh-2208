import React, { useState, useMemo, useEffect } from 'react';
import { View, Text, Input, ScrollView, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { getContainersByCustomer, detectAnomalies, createAnomalyHandling, updateAnomalyHandling, responsiblePartyTextMap } from '@/data/containers';
import type { Container, TemperatureAnomaly, AnomalyResponsibleParty, AnomalyHandlingStatus } from '@/types/container';
import TempChart from '@/components/TempChart';
import TempGauge from '@/components/TempGauge';
import StatusBadge from '@/components/StatusBadge';
import { formatDurationHours } from '@/utils/temperature';
import { useUserStore } from '@/store/userStore';
import styles from './index.module.scss';
import classnames from 'classnames';

const handlingStatusTextMap: Record<AnomalyHandlingStatus, string> = {
  pending: '待处理',
  in_progress: '处理中',
  closed: '已关闭'
};

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
  const [showAnomalyDetail, setShowAnomalyDetail] = useState(false);
  const [selectedAnomaly, setSelectedAnomaly] = useState<TemperatureAnomaly | null>(null);
  const [showHandlingForm, setShowHandlingForm] = useState(false);
  const [handlingCause, setHandlingCause] = useState('');
  const [handlingSolution, setHandlingSolution] = useState('');
  const [handlingParty, setHandlingParty] = useState<AnomalyResponsibleParty>('carrier');
  const [handlingStatus, setHandlingStatus] = useState<AnomalyHandlingStatus>('in_progress');
  const [handlingHandler, setHandlingHandler] = useState('');
  const [handlingRemark, setHandlingRemark] = useState('');
  const [handlingRefresh, setHandlingRefresh] = useState(0);
  const [anomalyFilter, setAnomalyFilter] = useState<string>('all');

  useEffect(() => {
    if (allContainers.length > 0) {
      const stillExists = allContainers.find(c => c.id === selectedId);
      if (!stillExists) {
        setSelectedId(allContainers[0].id);
        setSelectedStage(-1);
        setPickerKeyword('');
      }
    } else if (selectedId) {
      setSelectedId('');
      setSelectedStage(-1);
      setPickerKeyword('');
    }
  }, [profile.customerId, allContainers]);

  const selectedContainer = useMemo<Container | undefined>(() => {
    return allContainers.find(c => c.id === selectedId);
  }, [selectedId, allContainers]);

  const customerAnomalies = useMemo(() => {
    let total = 0, pending = 0, inProgress = 0, closed = 0;
    const containerList: Array<{
      container: Container;
      anomalyCount: number;
      pending: number;
      inProgress: number;
      closed: number;
      worstStatus: AnomalyHandlingStatus | 'none';
    }> = [];
    allContainers.forEach(c => {
      const anomalies = detectAnomalies(c);
      if (anomalies.length === 0) return;
      let p = 0, ip = 0, cl = 0;
      anomalies.forEach(a => {
        total++;
        if (!a.handling || a.handling.status === 'pending') { p++; pending++; }
        else if (a.handling.status === 'in_progress') { ip++; inProgress++; }
        else if (a.handling.status === 'closed') { cl++; closed++; }
      });
      let worstStatus: AnomalyHandlingStatus | 'none' = 'closed';
      if (p > 0) worstStatus = 'pending';
      else if (ip > 0) worstStatus = 'in_progress';
      else if (cl > 0) worstStatus = 'closed';
      containerList.push({ container: c, anomalyCount: anomalies.length, pending: p, inProgress: ip, closed: cl, worstStatus });
    });
    return { total, pending, inProgress, closed, containerList };
  }, [allContainers, handlingRefresh]);

  const filteredAnomalyContainers = useMemo(() => {
    if (anomalyFilter === 'all') return customerAnomalies.containerList;
    return customerAnomalies.containerList.filter(item => {
      if (anomalyFilter === 'pending') return item.pending > 0;
      if (anomalyFilter === 'in_progress') return item.inProgress > 0;
      if (anomalyFilter === 'closed') return item.closed > 0 && item.pending === 0 && item.inProgress === 0;
      return true;
    });
  }, [customerAnomalies, anomalyFilter]);

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

  const anomalies = useMemo(() => {
    if (!selectedContainer) return [];
    return detectAnomalies(selectedContainer);
  }, [selectedContainer, handlingRefresh]);

  const handleAnomalyClick = (anomaly: TemperatureAnomaly) => {
    setSelectedAnomaly(anomaly);
    setShowAnomalyDetail(true);
  };

  const handleOpenHandlingForm = (anomaly: TemperatureAnomaly) => {
    setSelectedAnomaly(anomaly);
    if (anomaly.handling) {
      setHandlingCause(anomaly.handling.cause);
      setHandlingSolution(anomaly.handling.solution);
      setHandlingParty(anomaly.handling.responsibleParty);
      setHandlingStatus(anomaly.handling.status);
      setHandlingHandler(anomaly.handling.handler);
      setHandlingRemark(anomaly.handling.remark || '');
    } else {
      setHandlingCause('');
      setHandlingSolution('');
      setHandlingParty('carrier');
      setHandlingStatus('in_progress');
      setHandlingHandler(profile.name);
      setHandlingRemark('');
    }
    setShowHandlingForm(true);
  };

  const handleSubmitHandling = () => {
    if (!selectedAnomaly || !selectedContainer) return;
    if (!handlingCause.trim()) {
      Taro.showToast({ title: '请填写原因说明', icon: 'none' });
      return;
    }
    if (!handlingSolution.trim()) {
      Taro.showToast({ title: '请填写处置方案', icon: 'none' });
      return;
    }
    if (!handlingHandler.trim()) {
      Taro.showToast({ title: '请填写处理人', icon: 'none' });
      return;
    }

    try {
      if (selectedAnomaly.handling) {
        updateAnomalyHandling({
          anomalyId: selectedAnomaly.id,
          status: handlingStatus,
          cause: handlingCause.trim(),
          solution: handlingSolution.trim(),
          responsibleParty: handlingParty,
          handler: handlingHandler.trim(),
          remark: handlingRemark.trim(),
          customerId: profile.customerId
        });
      } else {
        createAnomalyHandling({
          anomalyId: selectedAnomaly.id,
          containerNo: selectedContainer.containerNo,
          customerId: profile.customerId,
          cause: handlingCause.trim(),
          solution: handlingSolution.trim(),
          responsibleParty: handlingParty,
          handler: handlingHandler.trim(),
          remark: handlingRemark.trim()
        });
      }

      console.log('[TemperaturePage] handling submitted');
      Taro.showToast({ title: '处置单已保存', icon: 'success' });
      setHandlingRefresh(t => t + 1);
      setShowHandlingForm(false);
    } catch (e: any) {
      console.error('[TemperaturePage] handling error:', e);
      Taro.showToast({ title: e?.message || '保存失败', icon: 'none', duration: 2500 });
    }
  };

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
      {customerAnomalies.total > 0 && (
        <View className={styles.anomalyOverview}>
          <View className={styles.overviewHeader}>
            <Text className={styles.overviewTitle}>
              <Text style={{ marginRight: '8rpx' }}>⚠️</Text>
              异常处置一览
            </Text>
            <Text className={styles.overviewSub}>
              共 {customerAnomalies.total} 次异常 · {customerAnomalies.containerList.length} 个货柜
            </Text>
          </View>

          <View className={styles.overviewStats}>
            <View
              className={classnames(styles.overviewStatItem, anomalyFilter === 'all' && styles.active)}
              onClick={() => setAnomalyFilter('all')}
            >
              <Text className={styles.overviewStatNum}>{customerAnomalies.total}</Text>
              <Text className={styles.overviewStatLabel}>全部</Text>
            </View>
            <View
              className={classnames(styles.overviewStatItem, styles.pending, anomalyFilter === 'pending' && styles.active)}
              onClick={() => setAnomalyFilter('pending')}
            >
              <Text className={styles.overviewStatNum}>{customerAnomalies.pending}</Text>
              <Text className={styles.overviewStatLabel}>待处理</Text>
            </View>
            <View
              className={classnames(styles.overviewStatItem, styles.inProgress, anomalyFilter === 'in_progress' && styles.active)}
              onClick={() => setAnomalyFilter('in_progress')}
            >
              <Text className={styles.overviewStatNum}>{customerAnomalies.inProgress}</Text>
              <Text className={styles.overviewStatLabel}>处理中</Text>
            </View>
            <View
              className={classnames(styles.overviewStatItem, styles.closed, anomalyFilter === 'closed' && styles.active)}
              onClick={() => setAnomalyFilter('closed')}
            >
              <Text className={styles.overviewStatNum}>{customerAnomalies.closed}</Text>
              <Text className={styles.overviewStatLabel}>已关闭</Text>
            </View>
          </View>

          {filteredAnomalyContainers.length > 0 && (
            <View className={styles.anomalyContainerList}>
              {filteredAnomalyContainers.map(item => (
                <View
                  key={item.container.id}
                  className={classnames(styles.anomalyContainerItem, selectedId === item.container.id && styles.selected)}
                  onClick={() => {
                    setSelectedId(item.container.id);
                    setSelectedStage(-1);
                  }}
                >
                  <View className={styles.acLeft}>
                    <Text className={styles.acNo}>{item.container.containerNo}</Text>
                    <Text className={styles.acDesc}>
                      {item.container.goodsName} · {item.container.currentLocation}
                    </Text>
                  </View>
                  <View className={styles.acRight}>
                    <View className={classnames(styles.acStatusTag, styles[item.worstStatus])}>
                      <Text>{handlingStatusTextMap[item.worstStatus as AnomalyHandlingStatus]}</Text>
                    </View>
                    <Text className={styles.acCount}>
                      {item.anomalyCount} 次异常
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {filteredAnomalyContainers.length === 0 && (
            <View className={styles.anomalyEmpty}>
              <Text>该状态下暂无异常货柜</Text>
            </View>
          )}
        </View>
      )}

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

      {anomalies.length > 0 && (
        <View className={styles.anomalySection}>
          <Text className={styles.anomalyTitle}>
            <Text style={{ marginRight: '8rpx' }}>⚠️</Text>
            温度异常事件（共 {anomalies.length} 次）
          </Text>
          {anomalies.map((anomaly, idx) => (
            <View
              key={anomaly.id}
              className={classnames(styles.anomalyItem, styles[anomaly.severity])}
              onClick={() => handleAnomalyClick(anomaly)}
            >
              <View className={styles.anomalyLeft}>
                <View className={styles.anomalySeverityDot} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ display: 'flex', alignItems: 'center', gap: '12rpx', marginBottom: '4rpx' }}>
                    <Text className={styles.anomalyStage} style={{ flexShrink: 0 }}>
                      {anomaly.stageName}
                    </Text>
                    {anomaly.handling && (
                      <View className={classnames(styles.anomalyStatusBadge, styles[anomaly.handling.status])}>
                        <Text>
                          {anomaly.handling.status === 'pending' ? '待处理' : anomaly.handling.status === 'in_progress' ? '处理中' : '已关闭'}
                        </Text>
                      </View>
                    )}
                    {!anomaly.handling && (
                      <View className={classnames(styles.anomalyStatusBadge, styles.pending)}>
                        <Text>未处置</Text>
                      </View>
                    )}
                  </View>
                  <Text className={styles.anomalyTime}>
                    {formatDurationHours(anomaly.durationHours)} · 偏离 {anomaly.deviation.toFixed(1)}℃
                  </Text>
                </View>
              </View>
              <View className={styles.anomalyRight}>
                <Text className={styles.anomalyPeak}>{anomaly.peakTemp}℃</Text>
                <Text className={styles.anomalyArrow}>›</Text>
              </View>
            </View>
          ))}
        </View>
      )}

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

      {showHandlingForm && selectedAnomaly && (
        <View className={styles.handlingModal}>
          <View className={styles.modalMask} onClick={() => setShowHandlingForm(false)} />
          <View className={styles.handlingPanel}>
            <View className={styles.handlingPanelHeader}>
              <Text className={styles.handlingPanelTitle}>
                <Text style={{ marginRight: '8rpx' }}>📋</Text>
                {selectedAnomaly.handling ? '编辑异常处置单' : '发起异常处置'}
              </Text>
              <Text className={styles.handlingPanelClose} onClick={() => setShowHandlingForm(false)}>×</Text>
            </View>

            <ScrollView scrollY className={styles.handlingFormBody}>
              <View className={styles.formGroup}>
                <View className={styles.formLabel}>
                  <Text className={styles.required}>*</Text>
                  <Text>处置状态</Text>
                </View>
                <View className={styles.statusSegmentGroup}>
                  <View
                    className={classnames(styles.statusSegmentItem, handlingStatus === 'pending' && styles.activePending)}
                    onClick={() => setHandlingStatus('pending')}
                  >
                    <Text>⏳ 待处理</Text>
                  </View>
                  <View
                    className={classnames(styles.statusSegmentItem, handlingStatus === 'in_progress' && styles.activeProgress)}
                    onClick={() => setHandlingStatus('in_progress')}
                  >
                    <Text>🔄 处理中</Text>
                  </View>
                  <View
                    className={classnames(styles.statusSegmentItem, handlingStatus === 'closed' && styles.activeClosed)}
                    onClick={() => setHandlingStatus('closed')}
                  >
                    <Text>✅ 已关闭</Text>
                  </View>
                </View>
              </View>

              <View className={styles.formGroup}>
                <View className={styles.formLabel}>
                  <Text className={styles.required}>*</Text>
                  <Text>责任方</Text>
                </View>
                <View className={styles.partyGrid}>
                  {(Object.keys(responsiblePartyTextMap) as AnomalyResponsibleParty[]).map(key => (
                    <View
                      key={key}
                      className={classnames(styles.partyItem, handlingParty === key && styles.partyActive)}
                      onClick={() => setHandlingParty(key)}
                    >
                      <Text>{responsiblePartyTextMap[key]}</Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className={styles.formGroup}>
                <View className={styles.formLabel}>
                  <Text className={styles.required}>*</Text>
                  <Text>原因说明</Text>
                </View>
                <Textarea
                  className={styles.textareaInput}
                  placeholder='请描述异常发生的可能原因，如设备故障、环境温度过高、操作失误等...'
                  value={handlingCause}
                  onInput={e => setHandlingCause(e.detail.value)}
                  maxlength={200}
                />
              </View>

              <View className={styles.formGroup}>
                <View className={styles.formLabel}>
                  <Text className={styles.required}>*</Text>
                  <Text>处置方案</Text>
                </View>
                <Textarea
                  className={styles.textareaInput}
                  placeholder='请描述已采取或计划采取的处置措施，如联系承运商、加急检测、调整运输方式等...'
                  value={handlingSolution}
                  onInput={e => setHandlingSolution(e.detail.value)}
                  maxlength={200}
                />
              </View>

              <View className={styles.formGroup}>
                <View className={styles.formLabel}>
                  <Text className={styles.required}>*</Text>
                  <Text>处理人</Text>
                </View>
                <Input
                  className={styles.formInput}
                  placeholder='请输入处理人姓名'
                  value={handlingHandler}
                  onInput={e => setHandlingHandler(e.detail.value)}
                  maxlength={20}
                />
              </View>

              <View className={styles.formGroup}>
                <View className={styles.formLabel}>
                  <Text>备注（选填）</Text>
                </View>
                <Textarea
                  className={styles.textareaInput}
                  placeholder='其他需要补充说明的信息...'
                  value={handlingRemark}
                  onInput={e => setHandlingRemark(e.detail.value)}
                  maxlength={200}
                />
              </View>

              <View style={{ height: '180rpx' }} />
            </ScrollView>

            <View className={styles.handlingFormBar}>
              <View className={styles.btnSecondary} onClick={() => setShowHandlingForm(false)}>
                <Text>取消</Text>
              </View>
              <View
                className={classnames(styles.btnPrimary, (!handlingCause.trim() || !handlingSolution.trim() || !handlingHandler.trim()) && styles.disabled)}
                onClick={handleSubmitHandling}
              >
                <Text>保存处置单</Text>
              </View>
            </View>
          </View>
        </View>
      )}

      {showAnomalyDetail && selectedAnomaly && (
        <View className={styles.anomalyModal}>
          <View className={styles.modalMask} onClick={() => setShowAnomalyDetail(false)} />
          <View className={classnames(styles.modalPanel, styles[selectedAnomaly.severity])}>
            <View className={styles.modalHeader}>
              <Text className={styles.modalTitle}>异常事件详情</Text>
              <Text className={styles.modalClose} onClick={() => setShowAnomalyDetail(false)}>×</Text>
            </View>

            <View className={styles.modalSeverity}>
              <View className={styles.modalSeverityIcon}>
                <Text>{selectedAnomaly.severity === 'danger' ? '🚨' : '⚠️'}</Text>
              </View>
              <View>
                <Text className={styles.modalSeverityText}>
                  {selectedAnomaly.severity === 'danger' ? '温度超限' : '温度预警'}
                </Text>
                <Text className={styles.modalSeveritySub}>
                  {selectedAnomaly.direction === 'overheat' ? '温度偏高' : '温度偏低'} · {selectedAnomaly.stageName}
                </Text>
              </View>
            </View>

            <View className={styles.modalGrid}>
              <View className={styles.modalCell}>
                <Text className={styles.modalCellLabel}>发生阶段</Text>
                <Text className={styles.modalCellValue}>{selectedAnomaly.stageName}</Text>
              </View>
              <View className={styles.modalCell}>
                <Text className={styles.modalCellLabel}>持续时长</Text>
                <Text className={styles.modalCellValue}>{formatDurationHours(selectedAnomaly.durationHours)}</Text>
              </View>
              <View className={styles.modalCell}>
                <Text className={styles.modalCellLabel}>峰值温度</Text>
                <Text className={styles.modalCellValue}>{selectedAnomaly.peakTemp}℃</Text>
              </View>
              <View className={styles.modalCell}>
                <Text className={styles.modalCellLabel}>偏离程度</Text>
                <Text className={styles.modalCellValue}>{selectedAnomaly.deviation.toFixed(1)}℃</Text>
              </View>
              <View className={styles.modalCell}>
                <Text className={styles.modalCellLabel}>目标温区</Text>
                <Text className={styles.modalCellValue}>{selectedAnomaly.tempZone.label}</Text>
              </View>
              <View className={styles.modalCell}>
                <Text className={styles.modalCellLabel}>采样点数</Text>
                <Text className={styles.modalCellValue}>{selectedAnomaly.pointCount} 个</Text>
              </View>
            </View>

            <View className={styles.modalTimeRow}>
              <Text className={styles.modalTimeLabel}>时间范围</Text>
              <Text className={styles.modalTimeValue}>
                {selectedAnomaly.startTime} ~ {selectedAnomaly.endTime}
              </Text>
            </View>

            <View className={styles.handlingSection}>
              <View className={styles.handlingSectionHeader}>
                <Text className={styles.handlingSectionTitle}>
                  <Text style={{ marginRight: '8rpx' }}>📋</Text>
                  异常处置
                </Text>
                <View
                  className={styles.handlingEditBtn}
                  onClick={() => {
                    setShowAnomalyDetail(false);
                    handleOpenHandlingForm(selectedAnomaly);
                  }}
                >
                  <Text>{selectedAnomaly.handling ? '编辑处置' : '发起处置'}</Text>
                </View>
              </View>

              {selectedAnomaly.handling ? (
                <View className={styles.handlingContent}>
                  <View className={styles.handlingRow}>
                    <Text className={styles.handlingLabel}>处置状态</Text>
                    <View className={classnames(styles.handlingStatusTag, styles[selectedAnomaly.handling.status])}>
                      <Text>
                        {selectedAnomaly.handling.status === 'pending' ? '待处理' : selectedAnomaly.handling.status === 'in_progress' ? '处理中' : '已关闭'}
                      </Text>
                    </View>
                  </View>
                  <View className={styles.handlingRow}>
                    <Text className={styles.handlingLabel}>责任方</Text>
                    <Text className={styles.handlingValue}>{selectedAnomaly.handling.responsiblePartyText}</Text>
                  </View>
                  <View className={styles.handlingRow}>
                    <Text className={styles.handlingLabel}>处理人</Text>
                    <Text className={styles.handlingValue}>{selectedAnomaly.handling.handler}</Text>
                  </View>
                  <View className={styles.handlingRow}>
                    <Text className={styles.handlingLabel}>原因说明</Text>
                    <Text className={styles.handlingValue}>{selectedAnomaly.handling.cause}</Text>
                  </View>
                  <View className={styles.handlingRow}>
                    <Text className={styles.handlingLabel}>处置方案</Text>
                    <Text className={styles.handlingValue}>{selectedAnomaly.handling.solution}</Text>
                  </View>
                  {selectedAnomaly.handling.remark && (
                    <View className={styles.handlingRow}>
                      <Text className={styles.handlingLabel}>备注</Text>
                      <Text className={styles.handlingValue}>{selectedAnomaly.handling.remark}</Text>
                    </View>
                  )}
                  <View className={styles.handlingRow}>
                    <Text className={styles.handlingLabel}>更新时间</Text>
                    <Text className={styles.handlingValue}>{selectedAnomaly.handling.updateTime}</Text>
                  </View>
                </View>
              ) : (
                <View className={styles.handlingEmpty}>
                  <Text style={{ fontSize: '48rpx', marginBottom: '16rpx' }}>📝</Text>
                  <Text className={styles.handlingEmptyTitle}>尚未发起处置</Text>
                  <Text className={styles.handlingEmptyDesc}>点击右上角发起处置，记录原因、方案和责任方</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default TemperaturePage;
