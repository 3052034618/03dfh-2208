import type { Container, TransportStage } from '@/types/container';
import { generateTempPoints, calcStageStats, getTempStatus } from '@/utils/temperature';
import dayjs from 'dayjs';

const now = dayjs();

const createStages = (zoneMin: number, zoneMax: number, currentStageIdx: number): TransportStage[] => {
  const stageConfigs = [
    { key: 'loading' as const, name: '装货', hours: 4, loc: '智利圣安东尼奥港冷库' },
    { key: 'transit' as const, name: '海上运输', hours: 480, loc: '太平洋航线' },
    { key: 'port' as const, name: '港区等待', hours: 48, loc: '上海洋山深水港' },
    { key: 'delivery' as const, name: '送仓运输', hours: 8, loc: '上海市区配送中' }
  ];

  const stages: TransportStage[] = [];
  let cursor = now.subtract(520, 'hour');

  for (let i = 0; i < stageConfigs.length; i++) {
    const cfg = stageConfigs[i];
    const startTime = cursor;
    const isActive = i === currentStageIdx;
    const endTime = isActive ? now : cursor.add(cfg.hours, 'hour');
    const points = generateTempPoints(startTime.toDate(), endTime.toDate(), zoneMin, zoneMax, i === 1 ? 0.08 : 0.03);
    const stats = calcStageStats(points);
    const durationMs = endTime.diff(startTime);
    const durationHours = durationMs / (1000 * 60 * 60);

    stages.push({
      stage: cfg.key,
      stageName: cfg.name,
      startTime: startTime.format('YYYY-MM-DD HH:mm:ss'),
      endTime: isActive ? undefined : endTime.format('YYYY-MM-DD HH:mm:ss'),
      location: cfg.loc,
      maxTemp: stats.max,
      minTemp: stats.min,
      avgTemp: stats.avg,
      durationHours: Math.round(durationHours * 10) / 10,
      tempPoints: points
    });

    cursor = endTime;
  }
  return stages;
};

const zones = [
  { min: -18, max: -12, label: '冷冻区 -18℃~-12℃' },
  { min: 2, max: 8, label: '冷藏区 2℃~8℃' },
  { min: 15, max: 25, label: '恒温区 15℃~25℃' },
  { min: -25, max: -18, label: '深冻区 -25℃~-18℃' },
  { min: 0, max: 4, label: '保鲜区 0℃~4℃' }
];

const goodsList = [
  { name: '智利冷冻蓝莓', type: 'food' as const },
  { name: '进口胰岛素注射液', type: 'medicine' as const },
  { name: '新西兰冷冻羔羊肉', type: 'food' as const },
  { name: '德国进口婴幼儿配方奶粉', type: 'food' as const },
  { name: '美国进口生鲜龙虾', type: 'food' as const },
  { name: '意大利进口新鲜车厘子', type: 'food' as const },
  { name: '生物试剂冷链运输', type: 'medicine' as const },
  { name: '西班牙进口橄榄油', type: 'food' as const }
];

export const mockContainers: Container[] = Array.from({ length: 8 }, (_, i) => {
  const zone = zones[i % zones.length];
  const stageIdx = i < 3 ? 1 : (i < 5 ? 2 : (i < 7 ? 3 : 3));
  const goods = goodsList[i];
  const stages = createStages(zone.min, zone.max, stageIdx);
  const lastStage = stages[stageIdx];
  const currentTemp = lastStage.tempPoints[lastStage.tempPoints.length - 1]?.temperature ?? (zone.min + zone.max) / 2;
  const tempStatus = getTempStatus(currentTemp, zone);

  const statuses: Record<number, { key: Container['status'], text: string }> = {
    0: { key: 'loading', text: '装货中' },
    1: { key: 'transit', text: '运输中' },
    2: { key: 'port', text: '港区等待' },
    3: stageIdx === 3 ? (i >= 7 ? { key: 'arrived', text: '已到仓' } : { key: 'delivery', text: '送仓中' }) : { key: 'delivery', text: '送仓中' }
  };

  const statusInfo = statuses[stageIdx] ?? statuses[1];

  return {
    id: `C${1000 + i}`,
    containerNo: `MSKU${5000000 + i * 137}`,
    billNo: `BL${2024}${String(6000 + i).padStart(6, '0')}`,
    orderNo: `ORD${2024}${String(8800 + i).padStart(6, '0')}`,
    customerId: 'CUST001',
    customerName: '上海恒辉食品进口有限公司',
    goodsName: goods.name,
    goodsType: goods.type,
    tempZone: zone,
    currentTemp: Math.round(currentTemp * 10) / 10,
    tempStatus,
    status: statusInfo.key,
    statusText: statusInfo.text,
    currentLocation: lastStage.location,
    destination: i % 2 === 0 ? '上海市浦东新区外高桥保税区恒辉一号仓' : '上海市青浦区华新镇医药冷链中心',
    eta: now.add(i < 3 ? 5 + i * 2 : (i < 5 ? 2 : 0), 'day').format('YYYY-MM-DD HH:mm'),
    departureTime: now.subtract(20 + i, 'day').format('YYYY-MM-DD'),
    lastReportTime: now.subtract(i % 3, 'minute').format('YYYY-MM-DD HH:mm:ss'),
    carrier: '马士基航运',
    vesselName: ['MAERSK EMDEN', 'CMA CGM JACQUES', 'COSCO SHIPPING', 'MSC OSCAR'][i % 4],
    voyageNo: `V${2024}${String(100 + i).padStart(4, '0')}`,
    sealNo: `SL${String(800000 + i * 293).padStart(7, '0')}`,
    stages,
    totalDistance: 10500 + i * 200,
    remainingDistance: Math.max(0, 10500 - i * 1500)
  };
});

export const getContainersByCustomer = (_customerId: string) => mockContainers;

export const getContainerByNo = (no: string): Container | undefined =>
  mockContainers.find(c => c.containerNo === no || c.billNo === no || c.id === no);

export const searchContainers = (keyword: string, customerId: string): Container[] => {
  if (!keyword.trim()) return getContainersByCustomer(customerId);
  const k = keyword.toUpperCase().trim();
  return mockContainers.filter(c =>
    c.customerId === customerId && (
      c.containerNo.toUpperCase().includes(k) ||
      c.billNo.toUpperCase().includes(k) ||
      c.orderNo.toUpperCase().includes(k) ||
      c.goodsName.includes(keyword)
    )
  );
};

export const getPendingArrival = (customerId: string) =>
  mockContainers.filter(c =>
    c.customerId === customerId && (c.status === 'delivery' || c.status === 'port')
  );
