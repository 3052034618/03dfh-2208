import type { ReceiptRecord } from '@/types/container';
import dayjs from 'dayjs';

const now = dayjs();

export const mockReceipts: ReceiptRecord[] = [
  {
    id: 'R001',
    containerNo: 'MSKU5000411',
    billNo: 'BL2024006003',
    orderNo: 'ORD2024008803',
    goodsName: '新西兰冷冻羔羊肉',
    receiptTime: now.subtract(2, 'day').format('YYYY-MM-DD HH:mm:ss'),
    receiptOperator: '张明远',
    receiptRole: 'warehouse',
    arrivalTemp: -15.2,
    sealNo: 'SL800879',
    sealIntact: true,
    status: 'normal',
    statusText: '正常收货',
    remark: '货物包装完好，温度记录全程正常，已顺利入库B区03位。',
    tempZone: { min: -18, max: -12, label: '冷冻区 -18℃~-12℃' },
    inTempRange: true
  },
  {
    id: 'R002',
    containerNo: 'MSKU5000685',
    billNo: 'BL2024006005',
    orderNo: 'ORD2024008805',
    goodsName: '美国进口生鲜龙虾',
    receiptTime: now.subtract(5, 'day').format('YYYY-MM-DD HH:mm:ss'),
    receiptOperator: '张明远',
    receiptRole: 'warehouse',
    arrivalTemp: 1.8,
    sealNo: 'SL801465',
    sealIntact: true,
    status: 'inspection',
    statusText: '需质检复查',
    remark: '到货温度略微偏低（目标0-4℃），已送至质检区抽样检测，待出结果后决定入库或退货。',
    tempZone: { min: 0, max: 4, label: '保鲜区 0℃~4℃' },
    inTempRange: true
  },
  {
    id: 'R003',
    containerNo: 'MSKU5000137',
    billNo: 'BL2024006001',
    orderNo: 'ORD2024008801',
    goodsName: '智利冷冻蓝莓',
    receiptTime: now.subtract(8, 'day').format('YYYY-MM-DD HH:mm:ss'),
    receiptOperator: '李明华',
    receiptRole: 'warehouse',
    arrivalTemp: -16.8,
    sealNo: 'SL800293',
    sealIntact: true,
    status: 'normal',
    statusText: '正常收货',
    remark: '包装良好，温度全程稳定，已入冷库A区12位。随车文件齐全。',
    tempZone: { min: -18, max: -12, label: '冷冻区 -18℃~-12℃' },
    inTempRange: true
  },
  {
    id: 'R004',
    containerNo: 'MSKU5000822',
    billNo: 'BL2024006006',
    orderNo: 'ORD2024008806',
    goodsName: '意大利进口新鲜车厘子',
    receiptTime: now.subtract(12, 'day').format('YYYY-MM-DD HH:mm:ss'),
    receiptOperator: '张明远',
    receiptRole: 'warehouse',
    arrivalTemp: 3.2,
    sealNo: 'SL801758',
    sealIntact: true,
    status: 'normal',
    statusText: '正常收货',
    remark: '车厘子外观新鲜，温度2-8℃区间内保持良好，已入库C区01位，部分样品送品控检测糖度。',
    tempZone: { min: 2, max: 8, label: '冷藏区 2℃~8℃' },
    inTempRange: true
  }
];

export const getReceipts = (operatorId?: string) => {
  if (!operatorId) return mockReceipts;
  return mockReceipts.filter(r => r.receiptOperator === '张明远');
};

export const getReceiptById = (id: string) => mockReceipts.find(r => r.id === id);

export const createReceipt = (data: Omit<ReceiptRecord, 'id' | 'receiptTime'>): ReceiptRecord => {
  const newReceipt: ReceiptRecord = {
    ...data,
    id: `R${String(mockReceipts.length + 1).padStart(3, '0')}`,
    receiptTime: now.format('YYYY-MM-DD HH:mm:ss')
  };
  mockReceipts.unshift(newReceipt);
  return newReceipt;
};
