import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Sparkles, Loader2, AlertTriangle, FileText, BookOpen, Save, Search } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

import { apiClient } from "@/services/apiClient";

interface AiAdvisorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AiAdvisorModal({ isOpen, onClose }: AiAdvisorModalProps) {
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Knowledge Base State
  const [knowledgeText, setKnowledgeText] = useState("");
  const [queryText, setQueryText] = useState("");
  const [ticker, setTicker] = useState("");
  const [knowledgeStatus, setKnowledgeStatus] = useState<string | null>(null);

  const handleAnalyze = async () => {
    // ... existing handleAnalyze ...
    setLoading(true);
    setError(null);
    setAnalysis(null);

    try {
      const { data } = await apiClient.post("/ai-advisor/analyze", { 
        trigger: "frontend",
        action: "analyze" // Default action
      });

      const geminiText = 
        data?.candidates?.[0]?.content?.parts?.[0]?.text || 
        data?.text || 
        JSON.stringify(data, null, 2);

      setAnalysis(geminiText);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect to AI Advisor.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveKnowledge = async () => {
    if (!knowledgeText.trim() || !ticker.trim()) return;
    setLoading(true);
    setKnowledgeStatus(null);
    
    try {
        await apiClient.post("/ai-advisor/feed", {
            action: "save",
            content: knowledgeText,
            ticker: ticker
        });
        setKnowledgeStatus("✅ Saved to Knowledge Base!");
        setKnowledgeText("");
        // Optional: keep ticker or clear it? Usually clear content but maybe keep ticker if adding multiple facts.
        // Let's keep ticker for convenience.
    } catch (err) {
        setKnowledgeStatus("❌ Failed to save.");
    } finally {
        setLoading(false);
    }
  };

  const handleAskKnowledge = async () => {
    // ... existing handleAskKnowledge ...
    if (!queryText.trim()) return;
    setLoading(true);
    setAnalysis(null);
    
    try {
        const { data } = await apiClient.post("/ai-advisor/ask", {
            query: queryText,
            ticker: ticker
        });
        setAnalysis(data.output || data.text || data.answer || JSON.stringify(data));
    } catch (err) {
        setError("Failed to search knowledge base.");
    } finally {
        setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white text-slate-900 h-[80vh] flex flex-col">
        {/* ... existing header ... */}
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Sparkles className="h-6 w-6 text-indigo-600" />
            AI Portfolio Advisor
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="analyze" className="w-full flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analyze">Portfolio Analysis</TabsTrigger>
            <TabsTrigger value="knowledge">Knowledge Base (PoC)</TabsTrigger>
          </TabsList>
          
          <TabsContent value="analyze" className="flex-1 overflow-y-auto pr-2">
             {/* ... existing analyze tab content ... */}
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
             {/* Shared Result/Loading View */}
             {loading && (
                <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-12 w-12 text-indigo-600 animate-spin" />
                <p className="text-slate-500 animate-pulse">Consulting with AI...</p>
                </div>
            )}
            {error && (
                <div className="bg-red-50 p-4 rounded-lg flex items-start gap-3 text-red-700 mt-4">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <span>{error}</span>
                </div>
            )}
            {analysis && (
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 mt-4">
                <div className="prose prose-indigo max-w-none text-slate-700">
                    <ReactMarkdown>{analysis}</ReactMarkdown>
                </div>
                </div>
            )}
          </TabsContent>
          
          <TabsContent value="knowledge" className="space-y-4 flex-1 overflow-y-auto pr-2">
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-100">
                <h3 className="font-medium flex items-center gap-2 text-purple-900 mb-2">
                    <BookOpen className="h-4 w-4" /> Teach the AI
                </h3>
                <Input
                    placeholder="Ticker (e.g. AAPL)"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    className="bg-white mb-2"
                />
                <Textarea 
                    placeholder="Enter a fact, stock analysis, or note here (e.g. 'ASML is the sole supplier of EUV machines')..." 
                    value={knowledgeText}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setKnowledgeText(e.target.value)}
                    className="bg-white mb-2"
                />
                <div className="flex justify-between items-center">
                    <span className="text-sm text-purple-700">{knowledgeStatus}</span>
                    <Button onClick={handleSaveKnowledge} disabled={loading || !knowledgeText || !ticker} size="sm" className="bg-purple-600 hover:bg-purple-700">
                        <Save className="h-3 w-3 mr-2" /> Save to Memory
                    </Button>
                </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <h3 className="font-medium flex items-center gap-2 text-blue-900 mb-2">
                    <Search className="h-4 w-4" /> Ask from Memory
                </h3>
                <Input
                    placeholder="Ticker (Optional context)"
                    value={ticker}
                    onChange={(e) => setTicker(e.target.value.toUpperCase())}
                    className="bg-white mb-2"
                />
                <div className="flex gap-2">
                    <Textarea 
                        placeholder="Ask a question about your saved notes..." 
                        value={queryText}
                        onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setQueryText(e.target.value)}
                        className="bg-white"
                        rows={2}
                    />
                    <Button onClick={handleAskKnowledge} disabled={loading || !queryText} className="h-auto bg-blue-600 hover:bg-blue-700">
                        Ask
                    </Button>
                </div>
            </div>

            {/* Reuse Analysis view for answers */}
            {analysis && (
                <div className="bg-slate-50 rounded-xl p-6 border border-slate-100 mt-4">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">AI Answer</h4>
                    <div className="prose prose-indigo max-w-none text-slate-700">
                        <ReactMarkdown>{analysis}</ReactMarkdown>
                    </div>
                </div>
            )}
            {loading && !analysis && (
                <div className="text-center py-8 text-slate-400">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2" />
                    Searching vector database...
                </div>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
