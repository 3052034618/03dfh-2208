import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, Input, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import ContainerCard from '@/components/ContainerCard';
import { searchContainers, getContainersByCustomer } from '@/data/containers';
import type { Container, ContainerStatus } from '@/types/container';
import { useUserStore } from '@/store/userStore';
import styles from './index.module.scss';
import classnames from 'classnames';

const filterOptions: { key: string; label: string; status?: ContainerStatus }[] = [
  { key: 'all', label: '全部' },
  { key: 'transit', label: '运输中', status: 'transit' },
  { key: 'port', label: '港区等待', status: 'port' },
  { key: 'delivery', label: '送仓中', status: 'delivery' },
  { key: 'arrived', label: '已到仓', status: 'arrived' }
];

const IndexPage: React.FC = () => {
  const { profile } = useUserStore();
  const [keyword, setKeyword] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
  const [containers, setContainers] = useState<Container[]>([]);

  useEffect(() => {
    loadContainers();
  }, [profile.customerId]);

  const loadContainers = () => {
    const data = getContainersByCustomer(profile.customerId);
    setContainers(data);
    console.log('[IndexPage] loaded containers:', data.length);
  };

  const handleSearch = () => {
    const results = searchContainers(keyword, profile.customerId);
    setContainers(results);
    console.log('[IndexPage] search results:', keyword, results.length);
    if (keyword && results.length === 0) {
      Taro.showToast({ title: '未找到相关货柜', icon: 'none' });
    }
  };

  const handleScan = async () => {
    try {
      const res = await Taro.scanCode({ scanType: ['barCode', 'qrCode'] });
      if (res.result) {
        console.log('[IndexPage] scan result:', res.result);
        setKeyword(res.result);
        const results = searchContainers(res.result, profile.customerId);
        setContainers(results);
        if (results.length === 0) {
          Taro.showToast({ title: '未找到相关货柜', icon: 'none' });
        }
      }
    } catch (e) {
      console.error('[IndexPage] scan error:', e);
    }
  };

  const handleQuickAction = (type: string) => {
    switch (type) {
      case 'scan':
        handleScan();
        break;
      case 'pending':
        setActiveFilter('delivery');
        break;
      case 'history':
        Taro.switchTab({ url: '/pages/receipt/index' });
        break;
    }
  };

  const handleFilter = (key: string) => {
    setActiveFilter(key);
  };

  const filteredContainers = useMemo(() => {
    if (activeFilter === 'all') return containers;
    return containers.filter(c => c.status === activeFilter);
  }, [containers, activeFilter]);

  const overviewStats = useMemo(() => {
    const all = getContainersByCustomer(profile.customerId);
    return {
      inTransit: all.filter(c => c.status === 'transit').length,
      port: all.filter(c => c.status === 'port').length,
      delivery: all.filter(c => c.status === 'delivery').length,
      warn: all.filter(c => c.tempStatus !== 'normal').length
    };
  }, [profile.customerId]);

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.header}>
        <Text className={styles.greeting}>您好，{profile.name}</Text>
        <Text className={styles.subGreeting}>{profile.company}</Text>
      </View>

      <View className={styles.searchPanel}>
        <View className={styles.searchBar}>
          <View className={styles.searchIcon}>🔍</View>
          <Input
            className={styles.searchInput}
            placeholder='输入箱号/提单号/订单号'
            value={keyword}
            onInput={(e) => setKeyword(e.detail.value)}
            onConfirm={handleSearch}
            confirmType='search'
          />
          <View className={styles.searchBtn} onClick={handleSearch}>
            <Text>查询</Text>
          </View>
        </View>

        <View className={styles.quickActions}>
          <View className={styles.actionItem} onClick={() => handleQuickAction('scan')}>
            <View className={styles.actionIcon}>📷</View>
            <Text className={styles.actionText}>扫码查箱</Text>
          </View>
          <View className={styles.actionItem} onClick={() => handleQuickAction('pending')}>
            <View className={styles.actionIcon}>📦</View>
            <Text className={styles.actionText}>待签收</Text>
          </View>
          <View className={styles.actionItem} onClick={() => handleQuickAction('history')}>
            <View className={styles.actionIcon}>📋</View>
            <Text className={styles.actionText}>签收记录</Text>
          </View>
        </View>
      </View>

      <View className={styles.overview}>
        <View className={classnames(styles.statCard, styles.inTransit)}>
          <Text className={styles.statNum}>{overviewStats.inTransit}</Text>
          <Text className={styles.statLabel}>运输中</Text>
          <View className={styles.statSub}>
            <View className={styles.subDot} style={{ background: '#722ED1' }} />
            <Text>实时追踪中</Text>
          </View>
        </View>
        <View className={classnames(styles.statCard, styles.port)}>
          <Text className={styles.statNum}>{overviewStats.port}</Text>
          <Text className={styles.statLabel}>港区等待</Text>
          <View className={styles.statSub}>
            <View className={styles.subDot} style={{ background: '#FF7D00' }} />
            <Text>清关中</Text>
          </View>
        </View>
        <View className={classnames(styles.statCard, styles.delivery)}>
          <Text className={styles.statNum}>{overviewStats.delivery}</Text>
          <Text className={styles.statLabel}>送仓中</Text>
          <View className={styles.statSub}>
            <View className={styles.subDot} style={{ background: '#0E7C86' }} />
            <Text>待签收</Text>
          </View>
        </View>
        <View className={classnames(styles.statCard, styles.warn)}>
          <Text className={styles.statNum}>{overviewStats.warn}</Text>
          <Text className={styles.statLabel}>温度预警</Text>
          <View className={styles.statSub}>
            <View className={styles.subDot} style={{ background: '#FF7D00' }} />
            <Text>需关注</Text>
          </View>
        </View>
      </View>

      <View className={styles.section}>
        <View className={styles.sectionHeader}>
          <Text className={styles.sectionTitle}>我的货柜</Text>
          <Text className={styles.sectionMore}>共 {filteredContainers.length} 个</Text>
        </View>

        <ScrollView scrollX className={styles.filterBar} showScrollbar={false}>
          {filterOptions.map(opt => (
            <View
              key={opt.key}
              className={classnames(styles.filterItem, activeFilter === opt.key && styles.active)}
              onClick={() => handleFilter(opt.key)}
            >
              <Text>{opt.label}</Text>
            </View>
          ))}
        </ScrollView>

        {filteredContainers.length > 0 ? (
          filteredContainers.map(c => (
            <ContainerCard key={c.id} container={c} />
          ))
        ) : (
          <View className={styles.emptyState}>
            <Text className={styles.emptyIcon}>📭</Text>
            <Text className={styles.emptyText}>暂无相关货柜信息</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
};

export default IndexPage;
