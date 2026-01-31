import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sparkles, Loader2, AlertTriangle, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";

import { apiClient } from "@/services/apiClient";

interface AiAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AiAdvisorModal({ isOpen, onClose }: AiAdvisorModalProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      // The backend now auto-detects the mode (test/prod) based on its environment
      const { data } = await apiClient.post("/ai-advisor/analyze", { 
        trigger: "frontend"
      }).catch(err => {
        if (err.response?.status === 404) {
          throw new Error("AI Advisor service is not ready. If you are developing, ensure the n8n 'Listen' mode is active.");
        }
        throw err;
      });

      // Expecting Gemini response in data.candidates[0].content.parts[0].text
      // Expecting Gemini response in data[0].parts[0].text or similar structure depending on n8n output
      // Our n8n workflow 'Respond to Webhook' should return the JSON from Gemini.
      // Gemini API returns: candidates[0].content.parts[0].text
      
      // Let's inspect what n8n returns. The workflow connects Gemini -> Respond.
      // If Respond node is set to "JSON", it returns the full Gemini response.
      
      const geminiText = 
        data?.candidates?.[0]?.content?.parts?.[0]?.text || 
        data?.text || // simple fallback
        JSON.stringify(data, null, 2);

      setAnalysis(geminiText);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect to AI Advisor.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white text-slate-900">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-6 w-6 text-indigo-600" />
            AI Portfolio Advisor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!analysis && !loading && !error && (
            <div className="text-center space-y-4 py-8">
              <div className="bg-indigo-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                <FileText className="h-8 w-8 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-lg font-medium text-slate-800">Ready to Analyze</h3>
                <p className="text-slate-500 max-w-sm mx-auto mt-2">
                  Our AI will scan your current holdings, risk distribution, and cash position to provide actionable insights.
                </p>
              </div>

              <Button onClick={handleAnalyze} size="lg" className="bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-200">
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Analysis
              </Button>
            </div>
          )}

          {loading && (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
              <p className="text-slate-500 animate-pulse">Consulting with AI...</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 p-4 rounded-lg flex items-start gap-3 text-red-700">
              <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Analysis Error</p>
                <p className="text-sm opacity-90">{error}</p>
                <Button variant="link" onClick={handleAnalyze} className="p-0 h-auto text-red-800 underline mt-2">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {analysis && (
            <div className="bg-slate-50 rounded-xl p-6 border border-slate-100">
              <div className="prose prose-indigo max-w-none text-slate-700">
                <ReactMarkdown>{analysis}</ReactMarkdown>
              </div>
              <div className="mt-6 flex justify-end">
                <Button variant="outline" onClick={handleAnalyze}>
                  Refresh Analysis
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
