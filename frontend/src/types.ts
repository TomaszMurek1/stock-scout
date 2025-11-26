export type Sentiment = "bullish" | "neutral" | "bearish";

export type ResearchStatus = "inbox" | "deep_dive" | "monitoring" | "archived";

export interface CompanyNote {
  id: number;
  title: string;
  researchStatus: ResearchStatus;
  thesis: string;
  riskFactors: string;
  nextCatalyst?: string;
  targetPriceLow?: string;
  targetPriceHigh?: string;
  tags?: string[];
  lastUpdated: string;
  sentiment: Sentiment;
}
