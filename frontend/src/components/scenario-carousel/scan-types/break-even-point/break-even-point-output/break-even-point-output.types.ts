export interface IBreakEvenPointData {
    ticker: string;
    break_even_date: string;
    current_net_income: number;
    previous_net_income: number
    company_name: string
    currency: string
  }

  export interface IBreakEvenPointProps {
    status: string;
    data: IBreakEvenPointData[];
  }
  