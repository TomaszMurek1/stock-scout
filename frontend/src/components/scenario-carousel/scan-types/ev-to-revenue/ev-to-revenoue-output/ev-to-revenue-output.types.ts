export interface IEvToRevenueData {
    ticker: string;
    company_name: string;
    market: string;
    ev_to_revenue: number;
    enterprise_value: number;
    total_revenue: number;
    last_updated: string;
  }

  export interface EvToRevenueResultsProps {
    status: string;
    data: IEvToRevenueData[];
  }
  