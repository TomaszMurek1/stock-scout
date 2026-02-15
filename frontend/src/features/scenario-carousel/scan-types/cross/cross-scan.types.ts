export interface ICrossScanItem {
  ticker: string;
  name: string;
  date: string;
  days_since_cross: number;
  close: number;
  short_ma: number;
  long_ma: number;
  volume: number;
}

export interface ICrossScanData {
  ticker: string;
  data: ICrossScanItem;
}

export interface CrossScanResultsProps {
  status: string;
  data: ICrossScanData[];
}
