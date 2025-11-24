import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ScaleIcon,
  ShieldExclamationIcon,
  CurrencyDollarIcon,
  ChartBarIcon,
  BanknotesIcon,
  ChartPieIcon,
  Cog6ToothIcon,
} from "@heroicons/react/24/outline";
import { MetricsCard } from "./metric-card";
import { getMetricStatus } from "./metric-utils";
import { formatCurrency, formatNumber, formatPercentage } from "@/utils/formatting";
import { formatCompactCurrencyValue, meetsThreshold, statusFromMeets } from "./metric-helpers";
import type {
  AnalysisDashboard,
  FinancialPerformance,
  InvestorMetrics,
  RiskMetrics,
  ValuationMetrics,
} from "./stock-one-pager.types";

interface MetricsColumnProps {
  analysisDashboard?: AnalysisDashboard;
  currencyCode: string;
  valuationMetrics: ValuationMetrics;
  financialPerformance: FinancialPerformance;
  investorMetrics: InvestorMetrics;
  riskMetrics: RiskMetrics;
}

const buildProfitabilityGrowthMetrics = (
  analysisDashboard: AnalysisDashboard,
  financialPerformance: FinancialPerformance,
  currencyCode: string
) => [
  (() => {
    const meets = meetsThreshold(analysisDashboard.return_on_assets, 0.15);
    return {
      label: "Return on Assets (ROA)",
      value: formatPercentage(analysisDashboard.return_on_assets),
      tooltip: "ROA (≥15%)",
      definition: "ROA = Net Income / Total Assets",
      description:
        "Jak efektywnie spółka wykorzystuje aktywa (know-how, serwerownie, linie produkcyjne) do generowania zysków.",
      meets,
      status: statusFromMeets(meets),
      icon: <ArrowTrendingUpIcon className="h-8 w-8" />,
    };
  })(),
  (() => {
    const meets = meetsThreshold(analysisDashboard.return_on_invested_capital, 0.15);
    return {
      label: "Return on Invested Capital (ROIC)",
      value: formatPercentage(analysisDashboard.return_on_invested_capital),
      tooltip: "ROIC (≥15%)",
      definition: "ROIC = Operating Income / (Debt + Equity)",
      description:
        "Efektywność wykorzystania całego zainwestowanego kapitału; powyżej kosztu kapitału oznacza tworzenie wartości.",
      meets,
      status: statusFromMeets(meets),
      icon: <Cog6ToothIcon className="h-8 w-8" />,
    };
  })(),
  (() => {
    const meets = meetsThreshold(financialPerformance.operating_margin, 0.2);
    return {
      label: "Operating Margin",
      value: formatPercentage(financialPerformance.operating_margin),
      tooltip: "Operating Margin (≥20%)",
      definition: "Operating Margin = Operating Income / Revenue",
      description:
        "Marża operacyjna po kosztach działalności podstawowej; wysoka oznacza efektywność i/lub siłę cenową.",
      meets,
      status: statusFromMeets(meets),
      icon: <ChartPieIcon className="h-8 w-8" />,
    };
  })(),
  (() => {
    const meets = meetsThreshold(analysisDashboard.forecast_revenue_growth_rate, 0.05);
    return {
      label: "Revenue CAGR (2Y)",
      value: formatPercentage(analysisDashboard.forecast_revenue_growth_rate),
      tooltip: "Revenue CAGR 2Y (≥5%)",
      definition: "Compound annual revenue growth over the last 2 years.",
      description: "Średnioroczny wzrost przychodów (CAGR) z ostatnich 2 lat.",
      meets,
      status: statusFromMeets(meets),
      icon: <ArrowTrendingUpIcon className="h-8 w-8" />,
    };
  })(),
  (() => {
    const meets = meetsThreshold(analysisDashboard.forecast_eps_growth_rate_long, 0.1);
    return {
      label: "EPS CAGR (5Y)",
      value: formatPercentage(analysisDashboard.forecast_eps_growth_rate_long),
      tooltip: "EPS CAGR 5Y (≥10%)",
      definition: "Compound annual EPS growth over the last 5 years.",
      description:
        "Średnioroczny wzrost EPS z ostatnich 5 lat; dobrze, gdy rośnie szybciej niż przychody.",
      meets,
      status: statusFromMeets(meets),
      icon: <ArrowTrendingUpIcon className="h-8 w-8" />,
    };
  })(),
  {
    label: "Operating Cash Flow (ttm)",
    value: formatCompactCurrencyValue(analysisDashboard.operating_cash_flow, currencyCode),
    tooltip: "Operating cash flow over the trailing twelve months.",
    definition: "CFO (ttm) = Cash generated from operations in the last 12 months.",
    description:
      "Gotówka generowana z podstawowej działalności firmy (ważniejsza niż zysk księgowy netto).",
    icon: <BanknotesIcon className="h-8 w-8" />,
  },
  {
    label: "Forecast Revision Direction",
    value: analysisDashboard.forecast_revision_direction || "N/A",
    tooltip: "Recent direction of analyst EPS estimate revisions (Up/Down).",
    definition: "Trend of analyst estimate changes for EPS (Up/Down/Flat).",
    description: "Trend zmian prognoz EPS od analityków (w górę/w dół); wzrost poprawia sentyment.",
    icon: <ChartBarIcon className="h-8 w-8" />,
  },
];

const buildSafetyMetrics = (analysisDashboard: AnalysisDashboard, currencyCode: string) => [
  (() => {
    const meets = meetsThreshold(analysisDashboard.current_ratio, 1);
    const formatted = formatNumber(analysisDashboard.current_ratio, 2);
    return {
      label: "Current Ratio",
      value: formatted === "N/A" ? formatted : `${formatted}x`,
      tooltip: "Current Ratio (>1.0)",
      description:
        "Stosunek bieżących aktywów do bieżących pasywów (zobowiązań do spłaty w ciągu 12 miesięcy). Powyżej 1 oznacza, że firma ma z czego sfinansować swoje zobowiązania",
      definition: "Current Ratio = Current Assets / Current Liabilities",
      meets,
      status: statusFromMeets(meets),
      icon: <ShieldExclamationIcon className="h-8 w-8" />,
    };
  })(),
  (() => {
    const meets = meetsThreshold(analysisDashboard.debt_to_assets, 0.4, true);
    return {
      label: "Debt to Assets",
      value: formatPercentage(analysisDashboard.debt_to_assets),
      tooltip: "Debt to Assets (<40%)",
      description:
        "Stosunek zadłużenia do aktywów; niższa wartość oznacza mniejsze obciążenie aktywów długiem.",
      definition: "Debt to Assets = Total Debt / Total Assets",
      meets,
      status: statusFromMeets(meets),
      icon: <ScaleIcon className="h-8 w-8" />,
    };
  })(),
  (() => {
    const meets = meetsThreshold(analysisDashboard.interest_coverage, 3);
    const formatted = formatNumber(analysisDashboard.interest_coverage, 2);
    return {
      label: "Interest Coverage",
      value: formatted === "N/A" ? formatted : `${formatted}x`,
      tooltip: "Interest Coverage (>3x)",
      description:
        "Pokazuje, ile razy wynik pokrywa koszty odsetek; poziom ≥3 daje zapas bezpieczeństwa.",
      definition: "Interest Coverage = Operating Income / Interest Expense",
      meets,
      status: statusFromMeets(meets),
      icon: <ChartBarIcon className="h-8 w-8" />,
    };
  })(),
  (() => {
    const meets = meetsThreshold(analysisDashboard.cfo_to_total_debt, 0.3);
    return {
      label: "CFO to Total Debt",
      value: formatPercentage(analysisDashboard.cfo_to_total_debt),
      tooltip: "CFO / Debt (>30%)",
      description:
        "Ile lat gotówka z działalności operacyjnej pokrywa całe zadłużenie; wyższy poziom = szybsza spłata.",
      definition: "CFO to Total Debt = Operating Cash Flow / Total Debt",
      meets,
      status: statusFromMeets(meets),
      icon: <BanknotesIcon className="h-8 w-8" />,
    };
  })(),
  (() => {
    const change = analysisDashboard.total_debt_trend?.change ?? null;
    const meets = meetsThreshold(change, 0, true);
    const debtChange = formatCompactCurrencyValue(change, currencyCode);
    const direction = analysisDashboard.total_debt_trend?.direction;
    return {
      label: "Debt Trend",
      value: direction ? `${direction} ${debtChange}` : debtChange,
      tooltip: "Debt Trend (prefer ≤ 0)",
      description: "Czy poziom zadłużenia rośnie czy maleje względem poprzedniego okresu.",
      definition: "Change in total debt compared to the previous period.",
      meets,
      status: statusFromMeets(meets),
      icon: <ArrowTrendingDownIcon className="h-8 w-8" />,
    };
  })(),
  (() => {
    const meets = meetsThreshold(analysisDashboard.ohlson_indicator_score, 0.02, true);
    return {
      label: "Ohlson Score",
      value: formatPercentage(analysisDashboard.ohlson_indicator_score),
      tooltip: "Ohlson Score (<2%)",
      description: "Zbiorczy wskaźnik prawdopodobieństwa bankructwa; im niżej, tym bezpieczniej.",
      definition: "Probabilistic bankruptcy risk score (Ohlson O-Score).",
      meets,
      status: statusFromMeets(meets),
      icon: <ShieldExclamationIcon className="h-8 w-8" />,
    };
  })(),
];

const buildValuationTimingMetrics = (
  analysisDashboard: AnalysisDashboard,
  currencyCode: string
) => [
  (() => {
    const meets = meetsThreshold(analysisDashboard.upside, 0.1);
    return {
      label: "Upside vs Current Price",
      value: formatPercentage(analysisDashboard.upside),
      tooltip: "Upside (≥10%)",
      definition: "Upside = (Target Price − Current Price) / Current Price",
      description:
        "Potencjalny wzrost wobec obecnego kursu na bazie wyceny/price target; wyższy = większa szansa na zysk.",
      meets,
      status: statusFromMeets(meets),
      icon: <ArrowTrendingUpIcon className="h-8 w-8" />,
    };
  })(),
  {
    label: "Analyst Price Target (mean)",
    value: formatCurrency({
      value: analysisDashboard.analyst_price_target,
      currency: currencyCode,
      notation: "compact",
      maximumFractionDigits: 1,
    }),
    tooltip: "Consensus analyst price target.",
    definition: "Średnia 12-miesięczna cena docelowa od analityków.",
    description:
      "Średnia cena docelowa analityków; użyteczna jako punkt odniesienia do własnej wyceny.",
    icon: <CurrencyDollarIcon className="h-8 w-8" />,
  },
];

const buildValuationMetrics = (valuationMetrics: ValuationMetrics) => [
  {
    label: "P/E Ratio",
    value: valuationMetrics.pe_ratio?.toFixed(2) || "N/A",
    icon: <ScaleIcon className="h-8 w-8" />,
    tooltip: "Price to Earnings ratio.",
    definition: "P/E = Price per Share / Earnings per Share (EPS)",
    description: "Stosunek ceny akcji do zysków; pokazuje ile płacisz za 1 USD zysku.",
    status: getMetricStatus("P/E Ratio", valuationMetrics.pe_ratio),
  },
  {
    label: "EV/EBITDA",
    value: valuationMetrics.ev_ebitda?.toFixed(2) || "N/A",
    icon: <CurrencyDollarIcon className="h-8 w-8" />,
    tooltip: "Enterprise Value / EBITDA.",
    definition: "EV/EBITDA = Enterprise Value / EBITDA",
    description:
      "Wycena względna wobec EBITDA, neutralna na strukturę kapitału; dobra do porównań branżowych.",
    status: getMetricStatus("EV/EBITDA", valuationMetrics.ev_ebitda),
  },
  {
    label: "PEG Ratio",
    value: valuationMetrics.peg_ratio?.toFixed(2) || "N/A",
    icon: <ArrowTrendingUpIcon className="h-8 w-8" />,
    tooltip: "P/E ratio adjusted for growth.",
    definition: "PEG = P/E Ratio / EPS Growth Rate",
    description: "P/E skorygowany o tempo wzrostu EPS; poziom ~1 bywa uznawany za „fair”.",
    status: getMetricStatus("PEG Ratio", valuationMetrics.peg_ratio),
  },
  {
    label: "Dividend Yield",
    value:
      valuationMetrics.dividend_yield !== null
        ? formatPercentage(valuationMetrics.dividend_yield)
        : "N/A",
    icon: <BanknotesIcon className="h-8 w-8" />,
    tooltip: "Dividends relative to share price.",
    definition: "Dividend Yield = Annual Dividend per Share / Price per Share",
    description: "Gotówka wypłacana w dywidendach w relacji do bieżącego kursu.",
    status: getMetricStatus("Dividend Yield", valuationMetrics.dividend_yield),
  },
];

const buildFinancialPerformanceMetrics = (financialPerformance: FinancialPerformance) => [
  {
    label: "Gross Margin",
    value: formatPercentage(financialPerformance.gross_margin),
    icon: <ChartPieIcon className="h-8 w-8" />,
    tooltip: "Percentage of revenue remaining after cost of goods sold.",
    definition: "Gross Margin = (Revenue − COGS) / Revenue",
    description:
      "Marża brutto po kosztach wytworzenia; odzwierciedla siłę cenową i efektywność produkcji.",
    status: getMetricStatus("Gross Margin", financialPerformance.gross_margin),
  },
  {
    label: "Operating Margin",
    value: formatPercentage(financialPerformance.operating_margin),
    icon: <Cog6ToothIcon className="h-8 w-8" />,
    tooltip: "Profitability from core operations.",
    definition: "Operating Margin = Operating Income / Revenue",
    description: "Zysk operacyjny po kosztach działalności, przed odsetkami i podatkami.",
    status: getMetricStatus("Operating Margin", financialPerformance.operating_margin),
  },
  {
    label: "Net Margin",
    value: formatPercentage(financialPerformance.net_margin),
    icon: <BanknotesIcon className="h-8 w-8" />,
    tooltip: "Net income as a percentage of revenue.",
    definition: "Net Margin = Net Income / Revenue",
    description: "Rentowność netto po wszystkich kosztach i podatkach.",
    status: getMetricStatus("Net Margin", financialPerformance.net_margin),
  },
];

const buildInvestorMetrics = (investorMetrics: InvestorMetrics) => [
  {
    label: "Rule of 40",
    value: `${investorMetrics.rule_of_40.toFixed(2)}%`,
    icon: <ScaleIcon className="h-8 w-8" />,
    tooltip: "Growth + profitability should exceed 40%.",
    definition: "Rule of 40 = Revenue Growth + Profit Margin (najczęściej FCF lub EBITDA).",
    description: "Heurystyka równowagi wzrostu i rentowności; powyżej 40% uznawane za zdrowy miks.",
    status: getMetricStatus("Rule of 40", investorMetrics.rule_of_40),
  },
  {
    label: "EBITDA Margin",
    value: formatPercentage(investorMetrics.ebitda_margin),
    icon: <CurrencyDollarIcon className="h-8 w-8" />,
    tooltip: "Earnings before interest & taxes.",
    definition: "EBITDA Margin = EBITDA / Revenue",
    description: "Rentowność operacyjna liczone na poziomie EBITDA (przed D&A).",
    status: getMetricStatus("EBITDA Margin", investorMetrics.ebitda_margin),
  },
  {
    label: "Revenue Growth",
    value: `${investorMetrics.revenue_growth.toFixed(2)}%`,
    icon:
      investorMetrics.revenue_growth >= 0 ? (
        <ArrowTrendingUpIcon className="h-8 w-8" />
      ) : (
        <ArrowTrendingDownIcon className="h-8 w-8" />
      ),
    tooltip: "YoY revenue growth.",
    definition: "Year-over-year change in revenue.",
    description: "Tempo wzrostu przychodu rok do roku; powinno być dodatnie.",
    status: getMetricStatus("Revenue Growth", investorMetrics.revenue_growth / 100),
  },
  {
    label: "FCF Margin",
    value: formatPercentage(investorMetrics.fcf_margin),
    icon: <BanknotesIcon className="h-8 w-8" />,
    tooltip: "Free cash flow to revenue ratio.",
    definition: "FCF Margin = Free Cash Flow / Revenue",
    description: "Ile wolnej gotówki generuje spółka z każdej jednostki przychodu.",
    status: getMetricStatus("FCF Margin", investorMetrics.fcf_margin),
  },
];

const buildRiskMetrics = (riskMetrics: RiskMetrics) => [
  {
    label: "Annual Volatility",
    value: formatPercentage(riskMetrics.annual_volatility),
    icon: <ShieldExclamationIcon className="h-8 w-8" />,
    tooltip: "How much the stock price moves over time.",
    definition: "Odchylenie standardowe stóp zwrotu w skali roku.",
    description: "Miara zmienności kursu; wyższa oznacza szersze wahania.",
    status: getMetricStatus("Annual Volatility", riskMetrics.annual_volatility),
  },
  {
    label: "Max Drawdown",
    value: formatPercentage(riskMetrics.max_drawdown),
    icon: <ArrowTrendingDownIcon className="h-8 w-8" />,
    tooltip: "Largest observed price drop from a peak.",
    definition: "Największy spadek od szczytu do dołka w danym okresie.",
    description: "Najgłębszy spadek ceny od szczytu do dołka; im większy, tym większe ryzyko.",
    status: getMetricStatus("Max Drawdown", riskMetrics.max_drawdown),
  },
  {
    label: "Beta",
    value: riskMetrics.beta ? riskMetrics.beta.toFixed(2) : "N/A",
    icon: <ChartBarIcon className="h-8 w-8" />,
    tooltip: "Stock's sensitivity to market movements.",
    definition: "Beta mierzy wrażliwość kursu na ruchy rynku (1.0 = rynek).",
    description: "1.0 oznacza ruch zgodny z rynkiem; powyżej 1.0 to większa zmienność niż rynek.",
    status: getMetricStatus("Beta", riskMetrics.beta),
  },
];

export const MetricsColumn = ({
  analysisDashboard,
  currencyCode,
  valuationMetrics,
  financialPerformance,
  investorMetrics,
  riskMetrics,
}: MetricsColumnProps) => {
  const profitabilityGrowthMetrics = analysisDashboard
    ? buildProfitabilityGrowthMetrics(analysisDashboard, financialPerformance, currencyCode)
    : [];
  const safetyMetrics = analysisDashboard
    ? buildSafetyMetrics(analysisDashboard, currencyCode)
    : [];
  const valuationTimingMetrics = analysisDashboard
    ? buildValuationTimingMetrics(analysisDashboard, currencyCode)
    : [];

  const valuationMetricsList = buildValuationMetrics(valuationMetrics);
  const financialPerformanceMetrics = buildFinancialPerformanceMetrics(financialPerformance);
  const investorMetricsList = buildInvestorMetrics(investorMetrics);
  const riskMetricsList = buildRiskMetrics(riskMetrics);

  return (
    <>
      {analysisDashboard && (
        <>
          <MetricsCard
            title="Safety Filters"
            titleIcon={<ShieldExclamationIcon className="h-5 w-5 text-primary" />}
            metrics={safetyMetrics}
          />
          <MetricsCard
            title="Valuation & Timing"
            titleIcon={<ScaleIcon className="h-5 w-5 text-primary" />}
            metrics={valuationTimingMetrics}
          />
          <MetricsCard
            title="Profitability & Growth"
            titleIcon={<ArrowTrendingUpIcon className="h-5 w-5 text-primary" />}
            metrics={profitabilityGrowthMetrics}
          />
        </>
      )}

      <MetricsCard
        title="Valuation Metrics"
        titleIcon={<ScaleIcon className="h-5 w-5 text-primary" />}
        metrics={valuationMetricsList}
      />

      <MetricsCard
        title="Financial Performance"
        titleIcon={<ChartPieIcon className="h-5 w-5 text-primary" />}
        metrics={financialPerformanceMetrics}
      />

      <MetricsCard
        title="Investor Metrics"
        titleIcon={<CurrencyDollarIcon className="h-5 w-5 text-primary" />}
        metrics={investorMetricsList}
      />

      <MetricsCard
        title="Risk Metrics"
        titleIcon={<ShieldExclamationIcon className="h-5 w-5 text-primary" />}
        metrics={riskMetricsList}
      />
    </>
  );
};
