import React, { useMemo } from 'react';
import { View, Text, ScrollView } from '@tarojs/components';
import Taro from '@tarojs/taro';
import { useUserStore } from '@/store/userStore';
import { getReceipts } from '@/data/receipts';
import { getContainersByCustomer } from '@/data/containers';
import styles from './index.module.scss';

const MinePage: React.FC = () => {
  const { profile } = useUserStore();
  const containers = useMemo(() => getContainersByCustomer(profile.customerId), [profile.customerId]);
  const receipts = useMemo(() => getReceipts(profile.customerId), [profile.customerId]);

  const stats = useMemo(() => ({
    total: containers.length,
    pending: containers.filter(c => c.status === 'delivery' || c.status === 'port').length,
    signed: receipts.length,
    tempWarning: containers.filter(c => c.tempStatus !== 'normal').length
  }), [containers, receipts]);

  const handleStatClick = (key: string) => {
    if (key === 'signed') {
      Taro.switchTab({ url: '/pages/receipt/index' });
    } else if (key === 'tempWarning') {
      Taro.switchTab({ url: '/pages/temperature/index' });
    } else if (key === 'pending') {
      Taro.switchTab({ url: '/pages/index/index' });
    }
  };

  const menuGroups = useMemo(() => [
    {
      title: '常用功能',
      items: [
        { icon: '📦', iconBg: 'rgba(14, 124, 134, 0.1)', title: '我的订单', desc: '查看全部订单状态', path: '' },
        { icon: '📋', iconBg: 'rgba(0, 180, 42, 0.1)', title: '签收记录', desc: '历史签收单据', path: '', badge: receipts.length },
        { icon: '🌡️', iconBg: 'rgba(255, 125, 0, 0.1)', title: '温度预警', desc: '关注异常货柜', path: '', badge: stats.tempWarning },
        { icon: '📊', iconBg: 'rgba(22, 93, 255, 0.1)', title: '数据报表', desc: '月度温度统计', path: '' }
      ]
    },
    {
      title: '账号与设置',
      items: [
        { icon: '👥', iconBg: 'rgba(114, 46, 209, 0.1)', title: '子账号管理', desc: '添加公司员工账号', path: '' },
        { icon: '🔔', iconBg: 'rgba(245, 63, 63, 0.1)', title: '消息通知', desc: '到货/温度异常提醒', path: '' },
        { icon: '❓', iconBg: 'rgba(14, 124, 134, 0.1)', title: '帮助中心', desc: '常见问题与客服', path: '' },
        { icon: '📞', iconBg: 'rgba(0, 180, 42, 0.1)', title: '联系客服', desc: '7x24小时服务热线', path: '' }
      ]
    }
  ], [receipts.length, stats.tempWarning]);

  const handleMenuClick = (item: typeof menuGroups[0]['items'][0]) => {
    if (item.title === '签收记录') {
      Taro.switchTab({ url: '/pages/receipt/index' });
    } else if (item.title === '温度预警') {
      Taro.switchTab({ url: '/pages/temperature/index' });
    } else {
      Taro.showToast({ title: `${item.title}开发中`, icon: 'none' });
    }
  };

  return (
    <ScrollView scrollY className={styles.page}>
      <View className={styles.header}>
        <View className={styles.userCard}>
          <View className={styles.avatar}>
            <Text>{profile.name.charAt(0)}</Text>
          </View>
          <View className={styles.userInfo}>
            <Text className={styles.userName}>{profile.name}</Text>
            <Text className={styles.userRole}>{profile.roleText} · {profile.phone}</Text>
            <Text className={styles.userCompany}>{profile.company}</Text>
          </View>
        </View>
      </View>

      <View className={styles.statsBar}>
        <View className={styles.statItem}>
          <Text className={styles.statNum}>{stats.total}</Text>
          <Text className={styles.statLabel}>总货柜</Text>
        </View>
        <View className={styles.statItem} onClick={() => handleStatClick('pending')}>
          <Text className={styles.statNum} style={{ color: '#0E7C86' }}>{stats.pending}</Text>
          <Text className={styles.statLabel}>待处理</Text>
          <Text className={styles.statArrow}>›</Text>
        </View>
        <View className={styles.statItem} onClick={() => handleStatClick('signed')}>
          <Text className={styles.statNum} style={{ color: '#00B42A' }}>{stats.signed}</Text>
          <Text className={styles.statLabel}>已签收</Text>
          <Text className={styles.statArrow}>›</Text>
        </View>
        <View className={styles.statItem} onClick={() => handleStatClick('tempWarning')}>
          <Text className={styles.statNum} style={{ color: stats.tempWarning > 0 ? '#FF7D00' : undefined }}>{stats.tempWarning}</Text>
          <Text className={styles.statLabel}>温度预警</Text>
          <Text className={styles.statArrow}>›</Text>
        </View>
      </View>

      {menuGroups.map(group => (
        <View key={group.title}>
          <Text className={styles.sectionTitle} style={{ paddingLeft: '32rpx', paddingTop: '32rpx', marginBottom: '16rpx', display: 'block' }}>
            {group.title}
          </Text>
          <View className={styles.menuSection}>
            <View className={styles.menuList}>
              {group.items.map((item, idx) => (
                <View
                  key={idx}
                  className={styles.menuItem}
                  onClick={() => handleMenuClick(item)}
                >
                  <View className={styles.menuIcon} style={{ background: item.iconBg }}>
                    <Text>{item.icon}</Text>
                  </View>
                  <View className={styles.menuContent}>
                    <Text className={styles.menuTitle}>{item.title}</Text>
                    <Text className={styles.menuDesc}>{item.desc}</Text>
                  </View>
                  {item.badge && item.badge > 0 && <View className={styles.badge}><Text>{item.badge}</Text></View>}
                  <Text className={styles.menuArrow}>›</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
      ))}

      <View className={styles.versionInfo}>
        <Text>冷链智查 v1.0.0</Text>
      </View>
    </ScrollView>
  );
};

export default MinePage;
