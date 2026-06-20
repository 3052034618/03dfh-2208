import type { TempStatus, TempZone } from '@/types/container';

export const getTempStatus = (temp: number, zone: TempZone): TempStatus => {
  const range = zone.max - zone.min;
  const warnRatio = 0.1;
  const warnBuffer = range * warnRatio;
  if (temp < zone.min - warnBuffer || temp > zone.max + warnBuffer) {
    return 'danger';
  }
  if (temp < zone.min || temp > zone.max) {
    return 'warn';
  }
  return 'normal';
};

export const getTempStatusColor = (status: TempStatus): string => {
  const colors: Record<TempStatus, string> = {
    normal: '#00B42A',
    warn: '#FF7D00',
    danger: '#F53F3F'
  };
  return colors[status];
};

export const getTempStatusText = (status: TempStatus): string => {
  const texts: Record<TempStatus, string> = {
    normal: '温度正常',
    warn: '温度预警',
    danger: '温度超限'
  };
  return texts[status];
};

export const formatDurationHours = (hours: number): string => {
  if (hours < 1) {
    return `${Math.round(hours * 60)}分钟`;
  }
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) return `${h}小时`;
  return `${h}小时${m}分钟`;
};

export const generateTempPoints = (
  startTime: Date,
  endTime: Date,
  zoneMin: number,
  zoneMax: number,
  anomalyRate: number = 0.05
) => {
  const points = [];
  const totalMs = endTime.getTime() - startTime.getTime();
  const intervalMs = 30 * 60 * 1000;
  const count = Math.max(2, Math.floor(totalMs / intervalMs));
  const baseTemp = (zoneMin + zoneMax) / 2;
  const amplitude = (zoneMax - zoneMin) * 0.3;

  for (let i = 0; i < count; i++) {
    const t = new Date(startTime.getTime() + (i / (count - 1)) * totalMs);
    let temp = baseTemp + Math.sin(i * 0.3) * amplitude + (Math.random() - 0.5) * 0.5;
    if (Math.random() < anomalyRate) {
      const direction = Math.random() > 0.5 ? 1 : -1;
      temp += direction * (zoneMax - zoneMin) * (0.5 + Math.random() * 0.5);
    }
    temp = Math.round(temp * 10) / 10;
    points.push({
      time: t.toISOString(),
      temperature: temp,
      humidity: Math.round((60 + Math.random() * 30) * 10) / 10
    });
  }
  return points;
};

export const calcStageStats = (points: { temperature: number }[]) => {
  if (points.length === 0) return { max: 0, min: 0, avg: 0 };
  const temps = points.map(p => p.temperature);
  return {
    max: Math.max(...temps),
    min: Math.min(...temps),
    avg: Math.round((temps.reduce((a, b) => a + b, 0) / temps.length) * 10) / 10
  };
};
