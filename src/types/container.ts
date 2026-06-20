export type ContainerStatus = 'loading' | 'transit' | 'port' | 'delivery' | 'arrived';

export type TempStatus = 'normal' | 'warn' | 'danger';

export type ReceiptStatus = 'pending' | 'normal' | 'inspection';

export type UserRole = 'importer' | 'pharmacy' | 'warehouse';

export interface TempZone {
  min: number;
  max: number;
  label: string;
}

export interface TempPoint {
  time: string;
  temperature: number;
  humidity?: number;
}

export interface TransportStage {
  stage: 'loading' | 'transit' | 'port' | 'delivery';
  stageName: string;
  startTime: string;
  endTime?: string;
  location: string;
  maxTemp: number;
  minTemp: number;
  avgTemp: number;
  durationHours: number;
  tempPoints: TempPoint[];
}

export interface Container {
  id: string;
  containerNo: string;
  billNo: string;
  orderNo: string;
  customerId: string;
  customerName: string;
  goodsName: string;
  goodsType: 'food' | 'medicine' | 'other';
  tempZone: TempZone;
  currentTemp: number;
  tempStatus: TempStatus;
  status: ContainerStatus;
  statusText: string;
  currentLocation: string;
  destination: string;
  eta: string;
  departureTime: string;
  lastReportTime: string;
  carrier: string;
  vesselName?: string;
  voyageNo?: string;
  sealNo: string;
  stages: TransportStage[];
  totalDistance?: number;
  remainingDistance?: number;
}

export interface ReceiptRecord {
  id: string;
  containerNo: string;
  billNo: string;
  orderNo: string;
  goodsName: string;
  receiptTime: string;
  receiptOperator: string;
  receiptRole: UserRole;
  arrivalTemp: number;
  sealNo: string;
  sealIntact: boolean;
  status: ReceiptStatus;
  statusText: string;
  remark: string;
  tempZone: TempZone;
  inTempRange: boolean;
}

export interface UserProfile {
  id: string;
  name: string;
  customerId: string;
  company: string;
  role: UserRole;
  roleText: string;
  phone: string;
  avatar?: string;
}

export interface StageDetailInfo {
  stageName: string;
  startTime: string;
  endTime?: string;
  duration: string;
  maxTemp: number;
  minTemp: number;
  avgTemp: number;
  location: string;
  tempStatus: TempStatus;
}
