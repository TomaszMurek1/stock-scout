interface ISingleItem {
  ticker: string;
  name: string;
  date: string;
  days_since_cross: number;
  close: number;
  short_ma: number;
  long_ma: number;
  volume: number;
}

export interface IData {
  ticker: string;
  data: ISingleItem;
}

export interface ScanResultsProps {
  status: string;
  data: IData[];
}
