export interface IBreakEvenPointData {
  company_id: number;
  ticker: string;
  company_name: string;
  current_quarter: string;
  previous_quarter: string;
  previous_net_income: number;
  current_net_income: number;
  total_revenue: number;
  currency: string;
  threshold_margin: number;
}
