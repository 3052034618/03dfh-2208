import React, { useState, useMemo } from 'react';
import { View, Text, Input, ScrollView, Textarea } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { getPendingArrival } from '@/data/containers';
import { getReceipts, createReceipt, mockReceipts } from '@/data/receipts';
import ReceiptCard from '@/components/ReceiptCard';
import { useUserStore } from '@/store/userStore';
import type { Container } from '@/types/container';
import classnames from 'classnames';
import styles from './index.module.scss';

const ReceiptPage: React.FC = () => {
  const { profile } = useUserStore();
  const [activeTab, setActiveTab] = useState<'pending' | 'form' | 'history'>('pending');

  const [containerNo, setContainerNo] = useState('');
  const [sealNo, setSealNo] = useState('');
  const [arrivalTemp, setArrivalTemp] = useState('');
  const [sealIntact, setSealIntact] = useState<boolean | null>(null);
  const [receiptType, setReceiptType] = useState<'normal' | 'inspection' | null>(null);
  const [remark, setRemark] = useState('');

  const pendingList = useMemo(() => getPendingArrival('CUST001'), []);
  const receiptHistory = useMemo(() => getReceipts(profile.id), [profile.id]);

  const fillFromContainer = (c: Container) => {
    setContainerNo(c.containerNo);
    setSealNo(c.sealNo);
    setArrivalTemp(String(c.currentTemp));
    setSealIntact(null);
    setReceiptType(null);
    setRemark('');
    setActiveTab('form');
    console.log('[ReceiptPage] filled from container:', c.containerNo);
  };

  const handleSelectSeal = (val: boolean) => {
    setSealIntact(val);
  };

  const handleSelectType = (val: 'normal' | 'inspection') => {
    setReceiptType(val);
  };

  const canSubmit = containerNo.trim() && sealNo.trim() && arrivalTemp && sealIntact !== null && receiptType;

  const handleReset = () => {
    setContainerNo('');
    setSealNo('');
    setArrivalTemp('');
    setSealIntact(null);
    setReceiptType(null);
    setRemark('');
  };

  const handleSubmit = () => {
    if (!canSubmit) {
      Taro.showToast({ title: '请完整填写签收信息', icon: 'none' });
      return;
    }

    const temp = parseFloat(arrivalTemp);
    if (isNaN(temp)) {
      Taro.showToast({ title: '请输入正确的温度值', icon: 'none' });
      return;
    }

    const zone = { min: -18, max: -12, label: '冷冻区' };
    const newReceipt = createReceipt({
      containerNo: containerNo.trim().toUpperCase(),
      billNo: '-',
      orderNo: '-',
      goodsName: '-',
      receiptOperator: profile.name,
      receiptRole: profile.role,
      arrivalTemp: temp,
      sealNo: sealNo.trim().toUpperCase(),
      sealIntact,
      status: receiptType,
      statusText: receiptType === 'normal' ? '正常收货' : '需质检复查',
      remark: remark.trim(),
      tempZone: zone,
      inTempRange: temp >= zone.min && temp <= zone.max
    });

    console.log('[ReceiptPage] submitted receipt:', newReceipt);
    Taro.showToast({ title: '签收成功', icon: 'success' });

    setTimeout(() => {
      Taro.navigateTo({ url: `/pages/receipt-detail/index?id=${newReceipt.id}` });
      handleReset();
      setActiveTab('history');
    }, 600);
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.tabs}>
        <View
          className={classnames(styles.tab, activeTab === 'pending' && styles.active)}
          onClick={() => setActiveTab('pending')}
        >
          <Text>待签收 ({pendingList.length})</Text>
        </View>
        <View
          className={classnames(styles.tab, activeTab === 'form' && styles.active)}
          onClick={() => setActiveTab('form')}
        >
          <Text>签收单</Text>
        </View>
        <View
          className={classnames(styles.tab, activeTab === 'history' && styles.active)}
          onClick={() => setActiveTab('history')}
        >
          <Text>历史记录 ({mockReceipts.length})</Text>
        </View>
      </View>

      {activeTab === 'pending' && (
        pendingList.length > 0 ? (
          pendingList.map(c => (
            <View key={c.id} className={styles.pendingCard}>
              <View className={styles.pendingHeader}>
                <Text className={styles.pendingNo}>{c.containerNo}</Text>
                <Text className={styles.pendingTag}>{c.statusText}</Text>
              </View>
              <Text className={styles.pendingGoods}>{c.goodsName}</Text>
              <View className={styles.pendingInfo}>
                <Text>目标温区：{c.tempZone.label}</Text>
                <Text>ETA：{c.eta}</Text>
              </View>
              <View className={styles.pendingActions}>
                <View className={styles.quickBtn} onClick={() => fillFromContainer(c)}>
                  <Text>一键填充签收</Text>
                </View>
                <View
                  className={classnames(styles.quickBtn, styles.primary)}
                  onClick={() => {
                    Taro.navigateTo({ url: `/pages/container-detail/index?id=${c.id}` });
                  }}
                >
                  <Text>查看详情</Text>
                </View>
              </View>
            </View>
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>✅</Text>
            <Text className={styles.emptyTitle}>暂无待签收货柜</Text>
            <Text className={styles.emptyDesc}>您的货柜均已完成签收，如有新货柜到达将在此处展示</Text>
          </View>
        )
      )}

      {activeTab === 'form' && (
        <>
          <View className={styles.formCard}>
            <View className={styles.formHeader}>
              <View>
                <Text className={styles.formTitle}>到货签收单</Text>
                <Text className={styles.formSubtitle}>签收人：{profile.name} · {profile.roleText}</Text>
              </View>
            </View>

            <View className={styles.formGroup}>
              <View className={styles.formLabel}>
                <Text className={styles.required}>*</Text>
                <Text>箱号</Text>
              </View>
              <Input
                className={styles.formInput}
                placeholder='请扫描或输入箱号'
                value={containerNo}
                onInput={e => setContainerNo(e.detail.value.toUpperCase())}
                maxlength={20}
              />
            </View>

            <View className={styles.formGroup}>
              <View className={styles.formLabel}>
                <Text className={styles.required}>*</Text>
                <Text>铅封号</Text>
              </View>
              <Input
                className={styles.formInput}
                placeholder='请输入铅封号核对'
                value={sealNo}
                onInput={e => setSealNo(e.detail.value.toUpperCase())}
                maxlength={20}
              />
            </View>

            <View className={styles.formGroup}>
              <View className={styles.formLabel}>
                <Text className={styles.required}>*</Text>
                <Text>到货温度</Text>
              </View>
              <View className={styles.inputWithUnit}>
                <Input
                  className={styles.formInput}
                  type='digit'
                  placeholder='请填写实际测量温度'
                  value={arrivalTemp}
                  onInput={e => setArrivalTemp(e.detail.value)}
                />
                <Text className={styles.inputUnit}>℃</Text>
              </View>
            </View>

            <View className={styles.formGroup}>
              <View className={styles.formLabel}>
                <Text className={styles.required}>*</Text>
                <Text>铅封状态</Text>
              </View>
              <View className={styles.segmentGroup}>
                <View
                  className={classnames(styles.segmentItem, sealIntact === true && styles.activeNormal)}
                  onClick={() => handleSelectSeal(true)}
                >
                  <Text className={styles.segmentIcon}>🔒</Text>
                  <Text className={styles.segmentLabel}>完好</Text>
                  <Text className={styles.segmentDesc}>铅封未破坏</Text>
                </View>
                <View
                  className={classnames(styles.segmentItem, sealIntact === false && styles.activeInspect)}
                  onClick={() => handleSelectSeal(false)}
                >
                  <Text className={styles.segmentIcon}>⚠️</Text>
                  <Text className={styles.segmentLabel}>异常</Text>
                  <Text className={styles.segmentDesc}>损坏或缺失</Text>
                </View>
              </View>
            </View>

            <View className={styles.formGroup}>
              <View className={styles.formLabel}>
                <Text className={styles.required}>*</Text>
                <Text>签收结果</Text>
              </View>
              <View className={styles.segmentGroup}>
                <View
                  className={classnames(styles.segmentItem, receiptType === 'normal' && styles.activeNormal)}
                  onClick={() => handleSelectType('normal')}
                >
                  <Text className={styles.segmentIcon}>✅</Text>
                  <Text className={styles.segmentLabel}>正常收货</Text>
                  <Text className={styles.segmentDesc}>温度/包装均合格</Text>
                </View>
                <View
                  className={classnames(styles.segmentItem, receiptType === 'inspection' && styles.activeInspect)}
                  onClick={() => handleSelectType('inspection')}
                >
                  <Text className={styles.segmentIcon}>🧪</Text>
                  <Text className={styles.segmentLabel}>需质检复查</Text>
                  <Text className={styles.segmentDesc}>抽样送检后处理</Text>
                </View>
              </View>
            </View>

            <View className={styles.formGroup}>
              <View className={styles.formLabel}>
                <Text>备注（选填）</Text>
              </View>
              <Textarea
                className={styles.textareaInput}
                placeholder='如：包装情况、温度异常、需质检项等信息说明...'
                value={remark}
                onInput={e => setRemark(e.detail.value)}
                maxlength={300}
              />
            </View>
          </View>
          <View style={{ height: '180rpx' }} />
        </>
      )}

      {activeTab === 'history' && (
        <>
          <View className={styles.section}>
            <View className={styles.sectionHeader}>
              <Text className={styles.sectionTitle}>签收历史</Text>
              <Text className={styles.count}>共 {receiptHistory.length} 条</Text>
            </View>
            {receiptHistory.length > 0 ? (
              receiptHistory.map(r => <ReceiptCard key={r.id} receipt={r} />)
            ) : (
              <View className={styles.emptyState}>
                <Text className={styles.emptyIcon}>📋</Text>
                <Text className={styles.emptyTitle}>暂无签收记录</Text>
                <Text className={styles.emptyDesc}>完成签收后将在此展示历史记录</Text>
              </View>
            )}
          </View>
        </>
      )}

      {activeTab === 'form' && (
        <View className={styles.submitBar}>
          <View className={styles.btnSecondary} onClick={handleReset}>
            <Text>重置</Text>
          </View>
          <View
            className={classnames(styles.btnPrimary, !canSubmit && styles.disabled)}
            onClick={handleSubmit}
          >
            <Text>提交签收并生成记录</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
};

export default ReceiptPage;
