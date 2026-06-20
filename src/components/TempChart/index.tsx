import React, { useMemo, useState } from 'react';
import { View, Text, Canvas } from '@tarojs/components';
import classnames from 'classnames';
import type { TempPoint, TempZone, TransportStage } from '@/types/container';
import { getTempStatus } from '@/utils/temperature';
import styles from './index.module.scss';

interface TempChartProps {
  stages: TransportStage[];
  zone: TempZone;
  height?: number;
  selectedStage?: number;
  onStageSelect?: (idx: number) => void;
}

const stageColorMap: Record<string, string> = {
  loading: '#165DFF',
  transit: '#722ED1',
  port: '#FF7D00',
  delivery: '#00B42A'
};

const TempChart: React.FC<TempChartProps> = ({
  stages,
  zone,
  height = 360,
  selectedStage,
  onStageSelect
}) => {
  const [hoverPoint, setHoverPoint] = useState<{ idx: number; stageIdx: number } | null>(null);

  const { allPoints, minY, maxY, totalPoints, stageRanges } = useMemo(() => {
    const all: (TempPoint & { stageIdx: number })[] = [];
    const ranges: { startIdx: number; endIdx: number; stage: TransportStage }[] = [];
    stages.forEach((s, i) => {
      const startIdx = all.length;
      s.tempPoints.forEach(p => all.push({ ...p, stageIdx: i }));
      ranges.push({ startIdx, endIdx: all.length - 1, stage: s });
    });

    const temps = all.map(p => p.temperature);
    const pad = Math.max(2, (zone.max - zone.min) * 0.3);
    return {
      allPoints: all,
      minY: Math.min(...temps, zone.min) - pad,
      maxY: Math.max(...temps, zone.max) + pad,
      totalPoints: all.length,
      stageRanges: ranges
    };
  }, [stages, zone]);

  const width = 686;
  const padding = { top: 30, right: 20, bottom: 50, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xScale = (i: number) => padding.left + (totalPoints <= 1 ? chartW / 2 : (i / (totalPoints - 1)) * chartW);
  const yScale = (t: number) => padding.top + ((maxY - t) / (maxY - minY)) * chartH;

  const yTicks = useMemo(() => {
    const count = 5;
    return Array.from({ length: count + 1 }, (_, i) => {
      const v = minY + (i / count) * (maxY - minY);
      return { value: Math.round(v * 10) / 10, y: yScale(v) };
    });
  }, [minY, maxY]);

  const zoneTop = yScale(zone.max);
  const zoneBottom = yScale(zone.min);

  const buildPath = (points: { idx: number; temp: number }[]) => {
    if (points.length === 0) return '';
    let d = `M ${xScale(points[0].idx)} ${yScale(points[0].temp)}`;
    for (let i = 1; i < points.length; i++) {
      const p = points[i];
      const prev = points[i - 1];
      const cx1 = xScale((prev.idx + p.idx) / 2);
      const cx2 = xScale((prev.idx + p.idx) / 2);
      d += ` C ${cx1} ${yScale(prev.temp)}, ${cx2} ${yScale(p.temp)}, ${xScale(p.idx)} ${yScale(p.temp)}`;
    }
    return d;
  };

  return (
    <View className={styles.chartWrap}>
      <View className={styles.stageTabs}>
        {stages.map((s, i) => {
          const color = stageColorMap[s.stage] || '#86909C';
          return (
            <View
              key={s.stage}
              className={classnames(
                styles.stageTab,
                selectedStage === i && styles.tabActive
              )}
              style={{
                borderColor: selectedStage === i ? color : 'transparent',
                color: selectedStage === i ? color : '$color-text-secondary'
              }}
              onClick={() => onStageSelect?.(selectedStage === i ? -1 : i)}
            >
              <View className={styles.tabDot} style={{ background: color }} />
              <Text className={styles.tabText}>{s.stageName}</Text>
            </View>
          );
        })}
      </View>

      <View className={styles.chartContainer} style={{ height: `${height}rpx` }}>
        <View className={styles.svgContainer}>
          <svg viewBox={`0 0 ${width} ${height}`} width='100%' height='100%' preserveAspectRatio='none'>
            {yTicks.map((tick, i) => (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={tick.y}
                  x2={width - padding.right}
                  y2={tick.y}
                  stroke='#f2f3f5'
                  strokeDasharray='4 4'
                  strokeWidth='1'
                />
                <text
                  x={padding.left - 8}
                  y={tick.y + 4}
                  fontSize='11'
                  fill='#86909C'
                  textAnchor='end'
                  fontFamily='DIN, monospace'
                >{tick.value}℃</text>
              </g>
            ))}

            <rect
              x={padding.left}
              y={zoneTop}
              width={chartW}
              height={zoneBottom - zoneTop}
              fill='rgba(0, 180, 42, 0.08)'
              stroke='rgba(0, 180, 42, 0.3)'
              strokeDasharray='6 4'
              strokeWidth='1'
            />

            <text x={padding.left + 8} y={zoneTop - 6} fontSize='10' fill='#00B42A'>合格上限 {zone.max}℃</text>
            <text x={padding.left + 8} y={zoneBottom + 16} fontSize='10' fill='#00B42A'>合格下限 {zone.min}℃</text>

            {stageRanges.map((r, i) => {
              if (selectedStage !== -1 && selectedStage !== undefined && selectedStage !== i) return null;
              const color = stageColorMap[r.stage.stage];
              const points = r.stage.tempPoints.map((p, idx) => ({
                idx: r.startIdx + idx,
                temp: p.temperature
              }));
              const path = buildPath(points);
              return (
                <g key={i}>
                  {r.startIdx > 0 && (
                    <line
                      x1={xScale(r.startIdx)}
                      y1={padding.top}
                      x2={xScale(r.startIdx)}
                      y2={height - padding.bottom}
                      stroke={color}
                      strokeWidth='1'
                      strokeDasharray='4 4'
                      opacity='0.4'
                    />
                  )}
                  {path && (
                    <path
                      d={path}
                      fill='none'
                      stroke={color}
                      strokeWidth='2.5'
                      strokeLinecap='round'
                      strokeLinejoin='round'
                    />
                  )}
                </g>
              );
            })}

            {allPoints.map((p, i) => {
              if (selectedStage !== -1 && selectedStage !== undefined && p.stageIdx !== selectedStage) return null;
              const status = getTempStatus(p.temperature, zone);
              const isHover = hoverPoint && hoverPoint.idx === i;
              const isDanger = status !== 'normal';
              return (
                <g key={i}>
                  {(isDanger || isHover) && (
                    <>
                      <circle
                        cx={xScale(i)}
                        cy={yScale(p.temperature)}
                        r={isHover ? 8 : 5}
                        fill={status === 'danger' ? '#F53F3F' : status === 'warn' ? '#FF7D00' : stageColorMap[p.stageIdx === 0 ? 'loading' : p.stageIdx === 1 ? 'transit' : p.stageIdx === 2 ? 'port' : 'delivery']}
                        stroke='#fff'
                        strokeWidth='2'
                      />
                      {isHover && (
                        <g>
                          <rect
                            x={Math.min(width - 110, Math.max(padding.left, xScale(i) - 55))}
                            y={yScale(p.temperature) - 56}
                            width='110'
                            height='44'
                            rx='6'
                            fill='#1D2129'
                            opacity='0.92'
                          />
                          <text
                            x={Math.min(width - 110, Math.max(padding.left, xScale(i) - 55)) + 55}
                            y={yScale(p.temperature) - 34}
                            fontSize='11'
                            fill='#fff'
                            textAnchor='middle'
                            fontWeight='600'
                            fontFamily='DIN, monospace'
                          >{p.temperature}℃</text>
                          <text
                            x={Math.min(width - 110, Math.max(padding.left, xScale(i) - 55)) + 55}
                            y={yScale(p.temperature) - 18}
                            fontSize='9'
                            fill='#C9CDD4'
                            textAnchor='middle'
                          >{new Date(p.time).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</text>
                        </g>
                      )}
                    </>
                  )}
                </g>
              );
            })}
          </svg>
        </View>
      </View>

      {hoverPoint && allPoints[hoverPoint.idx] && (
        <View className={styles.tipBox}>
          <Text className={styles.tipTime}>
            {new Date(allPoints[hoverPoint.idx].time).toLocaleString('zh-CN')}
          </Text>
          <View className={styles.tipRow}>
            <Text className={styles.tipLabel}>温度：</Text>
            <Text
              className={styles.tipValue}
              style={{
                color: getTempStatus(allPoints[hoverPoint.idx].temperature, zone) === 'normal'
                  ? '#00B42A' : getTempStatus(allPoints[hoverPoint.idx].temperature, zone) === 'warn'
                    ? '#FF7D00' : '#F53F3F'
              }}
            >
              {allPoints[hoverPoint.idx].temperature}℃
            </Text>
          </View>
          {allPoints[hoverPoint.idx].humidity && (
            <View className={styles.tipRow}>
              <Text className={styles.tipLabel}>湿度：</Text>
              <Text className={styles.tipValue}>{allPoints[hoverPoint.idx].humidity}%</Text>
            </View>
          )}
        </View>
      )}

      <View className={styles.legend}>
        <View className={styles.legendItem}>
          <View className={styles.legendBox} style={{ background: 'rgba(0, 180, 42, 0.15)', border: '1rpx dashed #00B42A' }} />
          <Text className={styles.legendText}>合格温区</Text>
        </View>
        <View className={styles.legendItem}>
          <View className={styles.legendDot} style={{ background: '#F53F3F' }} />
          <Text className={styles.legendText}>异常点</Text>
        </View>
      </View>
    </View>
  );
};

export default TempChart;
