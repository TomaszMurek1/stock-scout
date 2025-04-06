import { FC } from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { StockData } from "./stock-one-pager.types";
import { formatNumber } from "@/utils/formatting";
import { Nullable } from "../types/shared.types";

interface FinancialTrendsCardProps {
  financialTrends: StockData["financial_trends"];
  currency: Nullable<string>;
}

const FinancialTrendsCard: FC<FinancialTrendsCardProps> = ({
  financialTrends,
  currency,
}) => {
  const getTrendData = (
    key: "revenue" | "net_income" | "ebitda" | "free_cash_flow"
  ): { year: number; value: number }[] => {
    return financialTrends[key].map((item) => ({
      year: item.year,
      value: item.value,
    }));
  };

  const renderTrendTable = (
    key: "revenue" | "net_income" | "ebitda" | "free_cash_flow"
  ) => {
    const data = getTrendData(key);
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Year</TableHead>
            <TableHead>
              {key.charAt(0).toUpperCase() + key.slice(1)} ({currency})
            </TableHead>
            <TableHead>YoY Change</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((item, index, arr) => {
            const prev = index < arr.length - 1 ? arr[index + 1] : null;
            const yoyChange =
              prev !== null ? ((item.value - prev.value) / prev.value) * 100 : null;
            return (
              <TableRow key={item.year}>
                <TableCell className="font-medium">{item.year}</TableCell>
                <TableCell>{formatNumber(item.value)}</TableCell>
                <TableCell>
                  {yoyChange !== null ? (
                    <span className={yoyChange >= 0 ? "text-green-600" : "text-red-600"}>
                      {yoyChange >= 0 ? "+" : ""}
                      {yoyChange.toFixed(2)}%
                    </span>
                  ) : (
                    "N/A"
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  };

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-xl text-gray-800 flex items-center gap-2">
          Financial Trends
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="revenue">
          <TabsList className="mb-4">
            <TabsTrigger value="revenue">Revenue</TabsTrigger>
            <TabsTrigger value="net_income">Net Income</TabsTrigger>
            <TabsTrigger value="ebitda">EBITDA</TabsTrigger>
            <TabsTrigger value="free_cash_flow">Free Cash Flow</TabsTrigger>
          </TabsList>

          <TabsContent value="revenue">{renderTrendTable("revenue")}</TabsContent>
          <TabsContent value="net_income">{renderTrendTable("net_income")}</TabsContent>
          <TabsContent value="ebitda">{renderTrendTable("ebitda")}</TabsContent>
          <TabsContent value="free_cash_flow">{renderTrendTable("free_cash_flow")}</TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default FinancialTrendsCard;
