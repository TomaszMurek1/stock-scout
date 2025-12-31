import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Database, Globe, LineChart, RefreshCw, Search, Shield } from "lucide-react";

const adminLinks = [
  {
    title: "Create Market Tickers",
    description: "Seed a newly added market with the available tickers.",
    href: "/admin/create-tickers",
    icon: Database,
  },
  {
    title: "Batch FX Rates",
    description: "Fetch and backfill FX history for multiple currency pairs.",
    href: "/admin/fx-batch",
    icon: LineChart,
  },
  {
    title: "Materialize Valuation",
    description: "Trigger valuation recomputation for a day or a date range.",
    href: "/admin/valuation",
    icon: RefreshCw,
  },
  {
    title: "Sync Company Markets",
    description: "Detect real exchanges via Yahoo Finance and assign markets.",
    href: "/admin/sync-markets",
    icon: Globe,
  },
  {
    title: "Inspect yfinance data",
    description: "Preview Yahoo Finance payloads and derived metrics for a ticker.",
    href: "/admin/yfinance-probe",
    icon: Search,
  },
  {
    title: "Refresh fundamentals",
    description: "Trigger yfinance financial updates (annual + quarterly) across markets.",
    href: "/admin/financial-refresh",
    icon: RefreshCw,
  },
];

export default function AdminDashboard() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <header className="space-y-2">
        <div className="flex items-center gap-3 text-slate-700">
          <Shield className="w-6 h-6" />
          <h1 className="text-2xl font-semibold">Admin Tools</h1>
        </div>
        <p className="text-slate-600">
          Manage power-user utilities from a single place. Choose an action below to get started.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        {adminLinks.map((link) => (
          <Card key={link.href} className="bg-white">
            <CardHeader className="space-y-3">
              <div className="flex items-center gap-3 text-slate-700">
                <link.icon className="w-6 h-6" />
                <CardTitle>{link.title}</CardTitle>
              </div>
              <CardDescription className="text-slate-600">{link.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full bg-slate-700 hover:bg-slate-800">
                <Link to={link.href}>Open</Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
