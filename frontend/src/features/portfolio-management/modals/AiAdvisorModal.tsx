import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sparkles, Loader2, AlertTriangle, FileText } from "lucide-react";
import ReactMarkdown from "react-markdown";

interface AiAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AiAdvisorModal({ isOpen, onClose }: AiAdvisorModalProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTestMode, setIsTestMode] = useState(true); // Default to true since user is likely testing

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      // Use /webhook-test/ for temporary editor testing, /webhook/ for activated workflows
      // Auto-detect production mode via Vite
      const isDev = import.meta.env.DEV;
      const baseUrl = isDev ? "http://localhost:5678" : "https://tomektest.byst.re:5678";
      
      const path = isTestMode ? "/webhook-test/ai-advisor" : "/webhook/ai-advisor";
      
      const response = await fetch(`${baseUrl}${path}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trigger: "frontend", mode: isTestMode ? "test" : "production" }),
      });

      if (response.status === 404) {
        throw new Error(
          isTestMode 
            ? "n8n is not listening! Click 'Listen for test event' in your Webhook node."
            : "Workflow not active! Activate your workflow in n8n to use production mode."
        );
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
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

              {import.meta.env.DEV && (
                  <div className="flex items-center justify-center gap-2 text-sm text-slate-600 bg-slate-50 p-2 rounded-lg w-fit mx-auto">
                    <input 
                      type="checkbox" 
                      id="test-mode" 
                      checked={isTestMode} 
                      onChange={(e) => setIsTestMode(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <label htmlFor="test-mode" className="cursor-pointer select-none">
                      Test Mode (Editor must be open)
                    </label>
                  </div>
              )}

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
