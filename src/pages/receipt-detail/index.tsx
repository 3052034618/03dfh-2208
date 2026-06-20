import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro, { useRouter } from '@tarojs/taro';
import { getReceiptById, resultTextMap } from '@/data/receipts';
import { getContainerByNo, detectAnomalies, getAnomalyStatsByCustomer } from '@/data/containers';
import { useUserStore } from '@/store/userStore';
import type { ReceiptRecord, InspectionResult, Container } from '@/types/container';
import classnames from 'classnames';
import styles from './index.module.scss';

const ReceiptDetailPage: React.FC = () => {
  const router = useRouter();
  const id = router.params.id || '';
  const { profile } = useUserStore();
  const [receipt, setReceipt] = useState<ReceiptRecord | null>(null);
  const [container, setContainer] = useState<Container | null>(null);
  const [hasPermission, setHasPermission] = useState<boolean>(true);

  useEffect(() => {
    const r = getReceiptById(id);
    if (!r) {
      setReceipt(null);
      setContainer(null);
      setHasPermission(true);
      console.error('[ReceiptDetail] not found:', id);
      return;
    }
    const c = getContainerByNo(r.containerNo, profile.customerId);
    if (!c) {
      setReceipt(r);
      setContainer(null);
      setHasPermission(false);
      console.warn('[ReceiptDetail] no permission for receipt:', id);
      return;
    }
    setReceipt(r);
    setContainer(c);
    setHasPermission(true);
    console.log('[ReceiptDetail] loaded:', r.id);
  }, [id, profile.customerId]);

  const anomalyInfo = useMemo(() => {
    if (!container) return { count: 0, pending: 0, inProgress: 0, closed: 0 };
    const anomalies = detectAnomalies(container);
    let pending = 0, inProgress = 0, closed = 0;
    anomalies.forEach(a => {
      if (!a.handling) pending++;
      else if (a.handling.status === 'pending') pending++;
      else if (a.handling.status === 'in_progress') inProgress++;
      else if (a.handling.status === 'closed') closed++;
    });
    return { count: anomalies.length, pending, inProgress, closed };
  }, [container]);

  const shareText = useMemo(() => {
    if (!receipt || !hasPermission) return '';
    const lines: string[] = [];
    lines.push('【冷链签收单】');
    lines.push('─────────────────');
    lines.push(`签收编号：${receipt.id}`);
    lines.push(`箱  号：${receipt.containerNo}`);
    lines.push(`货  物：${receipt.goodsName}`);
    lines.push(`提单号：${receipt.billNo}`);
    lines.push(`目标温区：${receipt.tempZone.label}`);
    lines.push('');
    lines.push('【到货情况】');
    const tempOK = receipt.arrivalTemp >= receipt.tempZone.min && receipt.arrivalTemp <= receipt.tempZone.max;
    lines.push(`到货温度：${receipt.arrivalTemp}℃  (${tempOK ? '合格' : '异常'})`);
    lines.push(`铅封状态：${receipt.sealIntact ? '完好' : '异常'}`);
    lines.push(`签收结果：${receipt.statusText}`);
    lines.push(`签收时间：${receipt.receiptTime}`);
    lines.push(`签收人：${receipt.receiptOperator}`);
    lines.push('');
    if (receipt.inspection) {
      lines.push('【质检结论】');
      lines.push(`质检结果：${resultTextMap[receipt.inspection.result]}`);
      lines.push(`处理人：${receipt.inspection.handler}`);
      lines.push(`处理时间：${receipt.inspection.handleTime}`);
      if (receipt.inspection.remark) {
        lines.push(`质检备注：${receipt.inspection.remark}`);
      }
      lines.push('');
    }
    if (anomalyInfo.count > 0) {
      lines.push('【温度异常处置】');
      lines.push(`异常次数：${anomalyInfo.count} 次`);
      lines.push(`待处理：${anomalyInfo.pending}  处理中：${anomalyInfo.inProgress}  已关闭：${anomalyInfo.closed}`);
      lines.push('');
    }
    if (receipt.remark) {
      lines.push('【备注】');
      lines.push(receipt.remark);
      lines.push('');
    }
    lines.push('─────────────────');
    lines.push('冷链运输监控系统 生成');
    return lines.join('\n');
  }, [receipt, hasPermission, anomalyInfo]);

  if (!receipt) {
    return (
      <ScrollView scrollY className={styles.page}>
        <View style={{ padding: '200rpx 0', textAlign: 'center' }}>
          <Text style={{ fontSize: '100rpx', opacity: 0.3 }}>📋</Text>
          <Text style={{ marginTop: '32rpx', fontSize: '28rpx', color: '#86909C' }}>签收记录不存在</Text>
        </View>
      </ScrollView>
    );
  }

  if (!hasPermission) {
    return (
      <ScrollView scrollY className={styles.page}>
        <View className={styles.receipt}>
          <View className={styles.receiptHeader}>
            <View className={styles.headerLogo}>❄️</View>
            <View className={styles.headerTitle}>冷 链 签 收 单</View>
            <View className={styles.headerSub}>COLD CHAIN DELIVERY RECEIPT</View>
            <View className={styles.receiptId}>签收编号 {receipt.id}</View>
          </View>
        </View>
        <View style={{ padding: '120rpx 64rpx', textAlign: 'center' }}>
          <Text style={{ fontSize: '120rpx', opacity: 0.25 }}>🔒</Text>
          <Text style={{ display: 'block', marginTop: '48rpx', fontSize: '32rpx', fontWeight: 600, color: '#4E5969' }}>
            无权限查看该签收单
          </Text>
          <Text style={{ display: 'block', marginTop: '20rpx', fontSize: '26rpx', color: '#86909C', lineHeight: 1.6 }}>
            该签收单所属客户与当前登录账户不匹配{'\n'}如需查看请联系对应客户或切换登录身份
          </Text>
        </View>
      </ScrollView>
    );
  }

  const handleCopy = async () => {
    try {
      await Taro.setClipboardData({ data: shareText });
      Taro.showToast({ title: '已复制签收信息', icon: 'success' });
      console.log('[ReceiptDetail] copied receipt');
    } catch (e) {
      console.error('[ReceiptDetail] copy error:', e);
    }
  };

  const handleShare = async () => {
    try {
      await Taro.setClipboardData({ data: shareText });
      Taro.showModal({
        title: '转发签收单',
        content: '签收信息已复制到剪贴板，可直接粘贴发送给采购、质检或承运商。',
        showCancel: false,
        confirmText: '好的'
      });
      console.log('[ReceiptDetail] shared receipt');
    } catch (e) {
      console.error('[ReceiptDetail] share error:', e);
    }
  };

  const tempInRange = receipt.arrivalTemp >= receipt.tempZone.min && receipt.arrivalTemp <= receipt.tempZone.max;

  const handleGoInspection = () => {
    Taro.switchTab({ url: '/pages/receipt/index' });
    setTimeout(() => {
      Taro.showToast({ title: '请在历史记录中找到该单据补充质检', icon: 'none', duration: 2500 });
    }, 300);
  };

  const getInspectionResultColor = (result: InspectionResult) => {
    switch (result) {
      case 'passed': return '#00B42A';
      case 'conditional': return '#FF7D00';
      case 'rejected': return '#F53F3F';
    }
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.receipt}>
        <View className={styles.receiptHeader}>
          <View className={styles.headerLogo}>❄️</View>
          <View className={styles.headerTitle}>冷 链 签 收 单</View>
          <View className={styles.headerSub}>COLD CHAIN DELIVERY RECEIPT</View>
          <View className={styles.receiptId}>签收编号 {receipt.id}</View>
        </View>

        <View className={styles.receiptBody}>
          <View className={classnames(styles.statusBanner, styles[receipt.status])}>
            <View className={styles.statusLeft}>
              <Text className={styles.statusIcon}>
                {receipt.status === 'normal' ? '✅' : '🧪'}
              </Text>
              <Text className={styles.statusText}>{receipt.statusText}</Text>
            </View>
            <Text className={styles.statusTime}>{receipt.receiptTime}</Text>
          </View>

          <View className={styles.infoSection}>
            <View className={styles.sectionLabel}>
              <Text className={styles.labelIcon}>📦</Text>
              <Text>货物与箱号信息</Text>
            </View>
            <View className={styles.infoTable}>
              <View className={styles.infoRow}>
                <Text className={styles.rowLabel}>箱号</Text>
                <Text className={styles.rowValue} style={{ fontFamily: 'DIN, monospace', fontWeight: 600 }}>
                  {receipt.containerNo}
                </Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.rowLabel}>提单号</Text>
                <Text className={styles.rowValue}>{receipt.billNo}</Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.rowLabel}>订单号</Text>
                <Text className={styles.rowValue}>{receipt.orderNo}</Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.rowLabel}>货物名称</Text>
                <Text className={styles.rowValue}>{receipt.goodsName}</Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.rowLabel}>目标温区</Text>
                <Text className={styles.rowValue}>{receipt.tempZone.label}</Text>
              </View>
            </View>
          </View>

          <View className={styles.dashDivider} />

          <View className={styles.infoSection} style={{ marginTop: 0, paddingTop: 48 }}>
            <View className={styles.sectionLabel}>
              <Text className={styles.labelIcon}>🌡️</Text>
              <Text>温度与铅封核对</Text>
            </View>
            <View className={styles.infoTable}>
              <View className={styles.infoRow}>
                <Text className={styles.rowLabel}>到货实际温度</Text>
                <View className={classnames(styles.tempValue, tempInRange ? styles.ok : styles.bad)}>
                  <Text>{receipt.arrivalTemp}℃</Text>
                </View>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.rowLabel}>温度合规判定</Text>
                <Text className={styles.rowValue} style={{ color: tempInRange ? '#00B42A' : '#F53F3F', fontWeight: 600 }}>
                  {tempInRange ? '✓ 在合格范围内' : '✗ 超出目标温区'}
                </Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.rowLabel}>铅封号</Text>
                <Text className={styles.rowValue} style={{ fontFamily: 'DIN, monospace', fontWeight: 600 }}>
                  {receipt.sealNo}
                </Text>
              </View>
              <View className={styles.infoRow}>
                <Text className={styles.rowLabel}>铅封完整性</Text>
                <View className={classnames(styles.sealValue, receipt.sealIntact ? styles.ok : styles.bad)}>
                  <Text>{receipt.sealIntact ? '✓ 完好' : '✗ 异常'}</Text>
                </View>
              </View>
            </View>
          </View>

          <View className={styles.dashDivider} />

          {(receipt.status === 'inspection' || receipt.status === 'inspection_done') && (
            <>
              <View className={styles.infoSection} style={{ marginTop: 0, paddingTop: 48 }}>
                <View className={styles.sectionLabel}>
                  <Text className={styles.labelIcon}>🧪</Text>
                  <Text>质检跟进</Text>
                </View>

                {receipt.status === 'inspection' && !receipt.inspection && (
                  <View className={styles.inspectionPending}>
                    <View className={styles.inspectionPendingIcon}>
                      <Text>⏳</Text>
                    </View>
                    <View className={styles.inspectionPendingContent}>
                      <Text className={styles.inspectionPendingTitle}>待质检</Text>
                      <Text className={styles.inspectionPendingDesc}>
                        该单据已标记需质检复查，请联系质检部门完成检测后补充结论
                      </Text>
                    </View>
                    <View className={styles.inspectionPendingBtn} onClick={handleGoInspection}>
                      <Text>去补充</Text>
                    </View>
                  </View>
                )}

                {receipt.status === 'inspection_done' && receipt.inspection && (
                  <View className={styles.inspectionDone}>
                    <View className={styles.inspectionResultRow}>
                      <Text className={styles.inspectionResultLabel}>质检结论</Text>
                      <View
                        className={styles.inspectionResultTag}
                        style={{ background: `${getInspectionResultColor(receipt.inspection.result)}15`, color: getInspectionResultColor(receipt.inspection.result) }}
                      >
                        <Text>{resultTextMap[receipt.inspection.result]}</Text>
                      </View>
                    </View>

                    <View className={styles.inspectionInfoGrid}>
                      <View className={styles.inspectionInfoCell}>
                        <Text className={styles.inspectionInfoLabel}>处理人</Text>
                        <Text className={styles.inspectionInfoValue}>{receipt.inspection.handler}</Text>
                      </View>
                      <View className={styles.inspectionInfoCell}>
                        <Text className={styles.inspectionInfoLabel}>处理时间</Text>
                        <Text className={styles.inspectionInfoValue}>{receipt.inspection.handleTime}</Text>
                      </View>
                    </View>

                    {receipt.inspection.remark && (
                      <View className={styles.inspectionRemark}>
                        <Text className={styles.inspectionRemarkLabel}>质检备注</Text>
                        <Text className={styles.inspectionRemarkText}>{receipt.inspection.remark}</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>

              <View className={styles.dashDivider} />
            </>
          )}

          <View className={styles.infoSection} style={{ marginTop: 0, paddingTop: 48 }}>
            <View className={styles.sectionLabel}>
              <Text className={styles.labelIcon}>📝</Text>
              <Text>备注信息</Text>
            </View>
            <View className={styles.remarkBox}>
              <Text>{receipt.remark || '（无备注信息）'}</Text>
            </View>
          </View>
        </View>

        <View className={styles.divider} />

        <View className={styles.signSection}>
          <View className={styles.signItem}>
            <Text className={styles.signLabel}>仓库主管签收</Text>
            <Text className={styles.signValue}>{receipt.receiptOperator}</Text>
          </View>
          <View className={styles.signItem}>
            <Text className={styles.signLabel}>签收日期</Text>
            <Text className={styles.signValue}>{receipt.receiptTime.split(' ')[0]}</Text>
          </View>
        </View>
      </View>
      <View style={{ height: 180, marginTop: 32 }} />

      <View className={styles.actionBar}>
        <View className={styles.copyBtn} onClick={handleCopy}>
          <Text>📋 复制信息</Text>
        </View>
        <View className={styles.shareBtn} onClick={handleShare}>
          <Text>📤 转发签收单</Text>
        </View>
      </View>
    </ScrollView>
  );
};

export default ReceiptDetailPage;
