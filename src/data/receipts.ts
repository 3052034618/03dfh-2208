import type { ReceiptRecord, TempZone, UserRole } from '@/types/container';
import { getContainerByNo, markContainerSigned, mockContainers } from './containers';
import dayjs from 'dayjs';

const now = dayjs();

const buildMockReceipts = (): ReceiptRecord[] => {
  const results: ReceiptRecord[] = [];
  const preset = [
    {
      id: 'R001',
      offsetDay: 2,
      containerNo: 'MSKU5000411',
      status: 'normal' as const,
      operator: '张明远',
      temp: -15.2,
      remark: '货物包装完好，温度记录全程正常，已顺利入库B区03位。'
    },
    {
      id: 'R002',
      offsetDay: 5,
      containerNo: 'MSKU5000685',
      status: 'inspection' as const,
      operator: '张明远',
      temp: 1.8,
      remark: '到货温度略微偏低（目标0-4℃），已送至质检区抽样检测，待出结果后决定入库或退货。'
    },
    {
      id: 'R003',
      offsetDay: 8,
      containerNo: 'MSKU5000137',
      status: 'normal' as const,
      operator: '李明华',
      temp: -16.8,
      remark: '包装良好，温度全程稳定，已入冷库A区12位。随车文件齐全。'
    },
    {
      id: 'R004',
      offsetDay: 12,
      containerNo: 'MSKU5000822',
      status: 'normal' as const,
      operator: '张明远',
      temp: 3.2,
      remark: '车厘子外观新鲜，温度2-8℃区间内保持良好，已入库C区01位，部分样品送品控检测糖度。'
    }
  ];

  for (const p of preset) {
    const container = mockContainers.find(c => c.containerNo === p.containerNo);
    if (!container) continue;
    const zone: TempZone = container.tempZone;
    results.push({
      id: p.id,
      containerNo: p.containerNo,
      billNo: container.billNo,
      orderNo: container.orderNo,
      goodsName: container.goodsName,
      receiptTime: now.subtract(p.offsetDay, 'day').format('YYYY-MM-DD HH:mm:ss'),
      receiptOperator: p.operator,
      receiptRole: 'warehouse',
      arrivalTemp: p.temp,
      sealNo: container.sealNo,
      sealIntact: true,
      status: p.status,
      statusText: p.status === 'normal' ? '正常收货' : '需质检复查',
      remark: p.remark,
      tempZone: zone,
      inTempRange: p.temp >= zone.min && p.temp <= zone.max
    });
    markContainerSigned(p.containerNo);
  }
  return results;
};

export const mockReceipts: ReceiptRecord[] = buildMockReceipts();

const findCustomerByContainerNo = (containerNo: string): string | undefined =>
  mockContainers.find(c => c.containerNo === containerNo)?.customerId;

export const getReceipts = (customerId?: string, operatorId?: string) => {
  let list = mockReceipts;
  if (customerId) {
    list = list.filter(r => findCustomerByContainerNo(r.containerNo) === customerId);
  }
  if (operatorId) {
    list = list.filter(r => r.receiptOperator === operatorId);
  }
  return list;
};

export const getReceiptById = (id: string) => mockReceipts.find(r => r.id === id);

export type CreateReceiptInput = {
  containerNo: string;
  receiptOperator: string;
  receiptRole: UserRole;
  arrivalTemp: number;
  sealNo: string;
  sealIntact: boolean;
  status: 'normal' | 'inspection';
  remark?: string;
  customerId?: string;
};

export const createReceipt = (input: CreateReceiptInput): ReceiptRecord => {
  const container = getContainerByNo(input.containerNo, input.customerId);
  if (!container) {
    throw new Error(`容器 ${input.containerNo} 不存在或不属于当前客户`);
  }

  const zone = container.tempZone;
  const inTempRange = input.arrivalTemp >= zone.min && input.arrivalTemp <= zone.max;
  const statusText = input.status === 'normal' ? '正常收货' : '需质检复查';

  const newReceipt: ReceiptRecord = {
    id: `R${String(mockReceipts.length + 1).padStart(3, '0')}`,
    containerNo: container.containerNo,
    billNo: container.billNo,
    orderNo: container.orderNo,
    goodsName: container.goodsName,
    receiptTime: now.format('YYYY-MM-DD HH:mm:ss'),
    receiptOperator: input.receiptOperator,
    receiptRole: input.receiptRole,
    arrivalTemp: input.arrivalTemp,
    sealNo: input.sealNo || container.sealNo,
    sealIntact: input.sealIntact,
    status: input.status,
    statusText,
    remark: input.remark?.trim() || '',
    tempZone: zone,
    inTempRange
  };

  mockReceipts.unshift(newReceipt);
  markContainerSigned(container.containerNo);
  return newReceipt;
};
