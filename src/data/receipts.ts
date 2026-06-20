import type { ReceiptRecord, TempZone, UserRole, QualityInspection, InspectionResult } from '@/types/container';
import { getContainerByNo, markContainerSigned, mockContainers } from './containers';
import dayjs from 'dayjs';

const now = dayjs();

export const resultTextMap: Record<InspectionResult, string> = {
  passed: '质检通过，准予入库',
  rejected: '质检不合格，已安排退货',
  conditional: '有条件接收，转加工处理',
};

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
      status: 'inspection_done' as const,
      operator: '张明远',
      temp: 1.8,
      remark: '到货温度略微偏低（目标0-4℃），已送至质检区抽样检测，待出结果后决定入库或退货。',
      inspection: {
        id: 'Q001',
        receiptId: 'R002',
        result: 'conditional' as const,
        resultText: '有条件接收，转加工处理',
        handler: '李质检',
        handleTime: now.subtract(3, 'day').format('YYYY-MM-DD HH:mm:ss'),
        remark: '抽样检测菌落总数达标，风味略有变化，不影响加工使用。已转深加工区做巴氏杀菌处理。'
      }
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
      status: 'inspection' as const,
      operator: '张明远',
      temp: 3.2,
      remark: '车厘子外观新鲜，温度2-8℃区间内保持良好，已入库C区01位，部分样品送品控检测糖度。'
    }
  ];

  for (const p of preset) {
    const container = mockContainers.find(c => c.containerNo === p.containerNo);
    if (!container) continue;
    const zone: TempZone = container.tempZone;
    const statusText = p.status === 'normal' ? '正常收货'
      : p.status === 'inspection' ? '需质检复查'
      : '质检已完成';
    const record: ReceiptRecord = {
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
      statusText,
      remark: p.remark,
      tempZone: zone,
      inTempRange: p.temp >= zone.min && p.temp <= zone.max,
      inspection: p.inspection,
    };
    results.push(record);
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

export type UpdateInspectionInput = {
  receiptId: string;
  result: InspectionResult;
  handler: string;
  remark?: string;
  customerId?: string;
};

export const updateInspection = (input: UpdateInspectionInput): ReceiptRecord => {
  const receipt = getReceiptById(input.receiptId);
  if (!receipt) {
    throw new Error(`签收单 ${input.receiptId} 不存在`);
  }
  const container = getContainerByNo(receipt.containerNo, input.customerId);
  if (!container) {
    throw new Error(`签收单 ${input.receiptId} 所属货柜不属于当前客户`);
  }
  if (receipt.status !== 'inspection') {
    throw new Error(`签收单状态不是"需质检复查"，无法提交质检结论`);
  }

  const inspection: QualityInspection = {
    id: `Q${String(Math.floor(Math.random() * 9000) + 1000)}`,
    receiptId: input.receiptId,
    result: input.result,
    resultText: resultTextMap[input.result],
    handler: input.handler,
    handleTime: now.format('YYYY-MM-DD HH:mm:ss'),
    remark: input.remark?.trim() || '',
  };

  receipt.inspection = inspection;
  receipt.status = 'inspection_done';
  receipt.statusText = '质检已完成';
  return receipt;
};
