import type { Container, TransportStage, TemperatureAnomaly, TempStatus } from '@/types/container';
import { generateTempPoints, calcStageStats, getTempStatus } from '@/utils/temperature';
import dayjs from 'dayjs';

const now = dayjs();

const SEVERITY_THRESHOLD = 1.5;

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

type CustomerSeed = { customerId: string; customerName: string; goods: { name: string; type: 'food' | 'medicine' }[]; };

const customerSeeds: CustomerSeed[] = [
  {
    customerId: 'CUST001',
    customerName: '上海恒辉食品进口有限公司',
    goods: [
      { name: '智利冷冻蓝莓', type: 'food' },
      { name: '新西兰冷冻羔羊肉', type: 'food' },
      { name: '美国进口生鲜龙虾', type: 'food' },
      { name: '意大利进口新鲜车厘子', type: 'food' },
      { name: '西班牙进口橄榄油', type: 'food' }
    ]
  },
  {
    customerId: 'CUST002',
    customerName: '华东康和医药股份有限公司',
    goods: [
      { name: '进口胰岛素注射液', type: 'medicine' },
      { name: '生物试剂冷链运输', type: 'medicine' }
    ]
  },
  {
    customerId: 'CUST003',
    customerName: '鲜集仓全国连锁门店',
    goods: [
      { name: '德国进口婴幼儿配方奶粉', type: 'food' }
    ]
  }
];

export const mockContainers: Container[] = (() => {
  const list: Container[] = [];
  let idx = 0;
  for (const seed of customerSeeds) {
    for (const goods of seed.goods) {
      const zone = zones[idx % zones.length];
      const stageIdx = idx < 3 ? 1 : (idx < 5 ? 2 : (idx < 7 ? 3 : 3));
      const stages = createStages(zone.min, zone.max, stageIdx);
      const lastStage = stages[stageIdx];
      const currentTemp = lastStage.tempPoints[lastStage.tempPoints.length - 1]?.temperature ?? (zone.min + zone.max) / 2;
      const tempStatus = getTempStatus(currentTemp, zone);

      const statuses: Record<number, { key: Container['status'], text: string }> = {
        0: { key: 'loading', text: '装货中' },
        1: { key: 'transit', text: '运输中' },
        2: { key: 'port', text: '港区等待' },
        3: stageIdx === 3 ? (idx >= 7 ? { key: 'arrived', text: '已到仓' } : { key: 'delivery', text: '送仓中' }) : { key: 'delivery', text: '送仓中' }
      };
      const statusInfo = statuses[stageIdx] ?? statuses[1];

      list.push({
        id: `C${1000 + idx}`,
        containerNo: `MSKU${5000000 + idx * 137}`,
        billNo: `BL${2024}${String(6000 + idx).padStart(6, '0')}`,
        orderNo: `ORD${2024}${String(8800 + idx).padStart(6, '0')}`,
        customerId: seed.customerId,
        customerName: seed.customerName,
        goodsName: goods.name,
        goodsType: goods.type,
        tempZone: zone,
        currentTemp: Math.round(currentTemp * 10) / 10,
        tempStatus,
        status: statusInfo.key,
        statusText: statusInfo.text,
        currentLocation: lastStage.location,
        destination: idx % 2 === 0 ? '上海市浦东新区外高桥保税区恒辉一号仓' : '上海市青浦区华新镇医药冷链中心',
        eta: now.add(idx < 3 ? 5 + idx * 2 : (idx < 5 ? 2 : 0), 'day').format('YYYY-MM-DD HH:mm'),
        departureTime: now.subtract(20 + idx, 'day').format('YYYY-MM-DD'),
        lastReportTime: now.subtract(idx % 3, 'minute').format('YYYY-MM-DD HH:mm:ss'),
        carrier: '马士基航运',
        vesselName: ['MAERSK EMDEN', 'CMA CGM JACQUES', 'COSCO SHIPPING', 'MSC OSCAR'][idx % 4],
        voyageNo: `V${2024}${String(100 + idx).padStart(4, '0')}`,
        sealNo: `SL${String(800000 + idx * 293).padStart(7, '0')}`,
        stages,
        totalDistance: 10500 + idx * 200,
        remainingDistance: Math.max(0, 10500 - idx * 1500)
      });
      idx++;
    }
  }
  return list;
})();

const signedContainerNos: Set<string> = new Set();

export const markContainerSigned = (containerNo: string) => {
  signedContainerNos.add(containerNo);
  const c = mockContainers.find(x => x.containerNo === containerNo);
  if (c) {
    c.status = 'arrived';
    c.statusText = '已到仓';
  }
};

export const isContainerSigned = (containerNo: string) => signedContainerNos.has(containerNo);

export const getContainersByCustomer = (customerId: string) =>
  mockContainers.filter(c => c.customerId === customerId);

export const getContainerByNo = (no: string, customerId?: string): Container | undefined =>
  mockContainers.find(c =>
    (c.containerNo === no || c.billNo === no || c.id === no) &&
    (!customerId || c.customerId === customerId)
  );

export const searchContainers = (keyword: string, customerId: string): Container[] => {
  const base = mockContainers.filter(c => c.customerId === customerId);
  if (!keyword.trim()) return base;
  const k = keyword.toUpperCase().trim();
  return base.filter(c =>
    c.containerNo.toUpperCase().includes(k) ||
    c.billNo.toUpperCase().includes(k) ||
    c.orderNo.toUpperCase().includes(k) ||
    c.goodsName.includes(keyword)
  );
};

export const getPendingArrival = (customerId: string) =>
  mockContainers.filter(c =>
    c.customerId === customerId &&
    !signedContainerNos.has(c.containerNo) &&
    (c.status === 'delivery' || c.status === 'port')
  );

export const detectAnomalies = (container: Container): TemperatureAnomaly[] => {
  const anomalies: TemperatureAnomaly[] = [];
  const zone = container.tempZone;
  let anomalyId = 0;

  for (const stage of container.stages) {
    let currentRun: { startIdx: number; points: number[]; startTime: string } | null = null;

    const flushRun = (endIdx: number) => {
      if (!currentRun) return;
      const points = currentRun.points;
      const isOverheat = points.some(t => t > zone.max);
      const peakTemp = isOverheat ? Math.max(...points) : Math.min(...points);
      const deviation = isOverheat ? peakTemp - zone.max : zone.min - peakTemp;
      const severity: TempStatus = deviation >= SEVERITY_THRESHOLD ? 'danger' : 'warn';

      anomalies.push({
        id: `${container.id}-A${++anomalyId}`,
        containerNo: container.containerNo,
        stage: stage.stage,
        stageName: stage.stageName,
        startTime: currentRun.startTime,
        endTime: stage.tempPoints[endIdx].time,
        durationHours: Math.max(0.1, (points.length - 1) * 0.5),
        severity,
        direction: isOverheat ? 'overheat' : 'undercool',
        peakTemp: Math.round(peakTemp * 10) / 10,
        deviation: Math.round(deviation * 10) / 10,
        tempZone: zone,
        pointCount: points.length,
      });
      currentRun = null;
    };

    for (let i = 0; i < stage.tempPoints.length; i++) {
      const p = stage.tempPoints[i];
      const isOutOfRange = p.temperature < zone.min || p.temperature > zone.max;
      if (isOutOfRange) {
        if (!currentRun) {
          currentRun = { startIdx: i, points: [], startTime: p.time };
        }
        currentRun.points.push(p.temperature);
      } else if (currentRun) {
        flushRun(i - 1);
      }
    }
    if (currentRun) {
      flushRun(stage.tempPoints.length - 1);
    }
  }

  return anomalies;
};

export const getAnomalySummary = (container: Container) => {
  const anomalies = detectAnomalies(container);
  if (anomalies.length === 0) {
    return { count: 0, worstDeviation: 0, worstSeverity: 'normal' as TempStatus, worstDirection: null as null };
  }
  const worst = anomalies.reduce((a, b) => Math.abs(a.deviation) > Math.abs(b.deviation) ? a : b);
  return {
    count: anomalies.length,
    worstDeviation: worst.deviation,
    worstSeverity: worst.severity,
    worstDirection: worst.direction,
    worstStage: worst.stageName,
    worstPeak: worst.peakTemp,
  };
};

export const filterByTempStatus = (containers: Container[], status: TempStatus | 'all'): Container[] => {
  if (status === 'all') return containers;
  return containers.filter(c => c.tempStatus === status);
};
