import React, { useState, useEffect } from "react";
import { Card, Button, Input, Textarea } from "@/components/ui/Layout";
import { CompanyNote, Sentiment, ResearchStatus } from "@/types";
// import { generateThesis } from "../services/geminiService";

interface Props {
  ticker: string;
}

const sentimentConfig: Record<Sentiment, { color: string; bg: string; icon: React.ReactNode }> = {
  bullish: {
    color: "text-emerald-700",
    bg: "bg-emerald-50 border-emerald-200",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M7 7l10 0l0 10" />
        <path d="M7 17l10 -10" />
      </svg>
    ),
  },
  neutral: {
    color: "text-slate-700",
    bg: "bg-slate-50 border-slate-200",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M5 12l14 0" />
      </svg>
    ),
  },
  bearish: {
    color: "text-rose-700",
    bg: "bg-rose-50 border-rose-200",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path d="M17 7l-10 10" />
        <path d="M17 17l0 -10l-10 0" />
      </svg>
    ),
  },
};

const statusConfig: Record<ResearchStatus, string> = {
  inbox: "Inbox",
  deep_dive: "Deep Dive",
  monitoring: "Monitoring",
  archived: "Archived",
};

// --- Main Component ---
export const CompanyNotes: React.FC<Props> = ({ ticker }) => {
  const [notes, setNotes] = useState<CompanyNote[]>([]);

  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [activeNote, setActiveNote] = useState<CompanyNote | null>(null);

  const handleEdit = (note: CompanyNote) => {
    setActiveNote(note);
    setIsSheetOpen(true);
  };

  const handleCreate = () => {
    const newNote: CompanyNote = {
      id: Date.now(),
      title: "",
      researchStatus: "inbox",
      thesis: "",
      riskFactors: "",
      lastUpdated: new Date().toISOString(),
      sentiment: "neutral",
    };
    setActiveNote(newNote);
    setIsSheetOpen(true);
  };

  const handleSave = (note: CompanyNote) => {
    setNotes((prev) => {
      const exists = prev.find((n) => n.id === note.id);
      if (exists) {
        return prev.map((n) =>
          n.id === note.id ? { ...note, lastUpdated: new Date().toISOString().slice(0, 10) } : n
        );
      }
      return [note, ...prev];
    });
    setIsSheetOpen(false);
  };

  return (
    <>
      <Card className="h-full flex flex-col overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div>
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-slate-600"
              >
                <path d="M12 20h9" />
                <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
              </svg>
              Research Notes
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">{notes.length} Active Notes</p>
          </div>
          <Button onClick={handleCreate} className="h-8 text-xs">
            + New Note
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/30">
          {notes.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <p>No notes yet. Start your research.</p>
            </div>
          ) : (
            notes.map((note) => (
              <div
                key={note.id}
                onClick={() => handleEdit(note)}
                className="group relative bg-white p-4 rounded-lg border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex flex-col">
                    <span className="font-semibold text-slate-800 text-sm group-hover:text-blue-700 transition-colors">
                      {note.title || "Untitled Note"}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider mt-1">
                      {statusConfig[note.researchStatus]}
                    </span>
                  </div>
                  <div
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full border ${sentimentConfig[note.sentiment].bg} ${sentimentConfig[note.sentiment].color}`}
                  >
                    {sentimentConfig[note.sentiment].icon}
                    <span className="capitalize font-medium">{note.sentiment}</span>
                  </div>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 mb-3 leading-relaxed">
                  {note.thesis || "No thesis content..."}
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-50">
                  <div className="flex gap-1 flex-wrap">
                    {note.tags?.slice(0, 2).map((t) => (
                      <span
                        key={t}
                        className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                  <span className="text-[10px] text-slate-400">{note.lastUpdated}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      {/* Slide-over Sheet for Editing */}
      <NoteEditorSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        initialData={activeNote}
        onSave={handleSave}
        ticker={ticker}
      />
    </>
  );
};

// --- Editor Sheet Sub-Component ---
const NoteEditorSheet = ({ isOpen, onClose, initialData, onSave, ticker }: any) => {
  const [formData, setFormData] = useState<CompanyNote>(initialData || {});
  const [isGenerating, setIsGenerating] = useState(false);

  useEffect(() => {
    if (isOpen && initialData) {
      setFormData(initialData);
    }
  }, [isOpen, initialData]);

  const handleChange = (field: keyof CompanyNote, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleAIHelp = async () => {
    setIsGenerating(true);
    // const generatedThesis = await generateThesis(ticker, context);
    const generatedThesis = "AI generated thesis placeholder.";
    setFormData((prev) => ({ ...prev, thesis: prev.thesis + "\n\n" + generatedThesis }));
    setIsGenerating(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/20 backdrop-blur-sm" onClick={onClose} />

      {/* Sheet Content */}
      <div className="relative w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Research Note</h2>
            <p className="text-xs text-slate-500">Editing note for {ticker}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={() => onSave(formData)}>Save Changes</Button>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/50">
          <div className="space-y-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
            <Input
              value={formData.title}
              onChange={(e) => handleChange("title", e.target.value)}
              placeholder="Note Title (e.g., Q3 Deep Dive)"
              className="text-lg font-semibold border-transparent focus:border-slate-300 px-0 rounded-none border-b"
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">
                  Status
                </label>
                <select
                  className="w-full h-10 rounded-md border border-slate-300 bg-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-slate-400"
                  value={formData.researchStatus}
                  onChange={(e) => handleChange("researchStatus", e.target.value)}
                >
                  <option value="inbox">Inbox</option>
                  <option value="deep_dive">Deep Dive</option>
                  <option value="monitoring">Monitoring</option>
                  <option value="archived">Archived</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 uppercase mb-1.5 block">
                  Sentiment
                </label>
                <div className="flex rounded-md shadow-sm border border-slate-300 overflow-hidden h-10">
                  {(["bullish", "neutral", "bearish"] as Sentiment[]).map((s) => (
                    <button
                      key={s}
                      onClick={() => handleChange("sentiment", s)}
                      className={`flex-1 text-xs font-medium capitalize flex items-center justify-center gap-1 hover:bg-slate-50 transition-colors
                            ${formData.sentiment === s ? "bg-slate-100 text-slate-900" : "bg-white text-slate-500"}
                            ${s !== "bearish" ? "border-r border-slate-300" : ""}
                          `}
                    >
                      {s === formData.sentiment && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${s === "bullish" ? "bg-emerald-500" : s === "bearish" ? "bg-rose-500" : "bg-slate-500"}`}
                        />
                      )}
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm col-span-2">
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-slate-500 uppercase">
                  Investment Thesis
                </label>
                <button
                  onClick={handleAIHelp}
                  disabled={isGenerating}
                  className="text-[10px] flex items-center gap-1 text-purple-600 hover:text-purple-700 font-medium"
                >
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2l3 6l6 0l-5 4l2 6l-6 -4l-6 4l2 -6l-5 -4l6 0z" />
                  </svg>
                  {isGenerating ? "Thinking..." : "AI Assist"}
                </button>
              </div>
              <Textarea
                value={formData.thesis}
                onChange={(e) => handleChange("thesis", e.target.value)}
                placeholder="Write your core thesis here..."
                className="min-h-[150px] resize-none border-0 focus:ring-0 px-0 bg-transparent text-slate-800 leading-relaxed"
              />
            </div>
            <div className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <label className="text-xs font-semibold text-slate-500 uppercase block mb-2">
                  Price Target
                </label>
                <div className="flex gap-2 items-center">
                  <Input
                    value={formData.targetPriceLow}
                    onChange={(e) => handleChange("targetPriceLow", e.target.value)}
                    placeholder="Low"
                    className="h-8 text-xs"
                  />
                  <span className="text-slate-400">-</span>
                  <Input
                    value={formData.targetPriceHigh}
                    onChange={(e) => handleChange("targetPriceHigh", e.target.value)}
                    placeholder="High"
                    className="h-8 text-xs"
                  />
                </div>
              </div>
              <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                <label className="text-xs font-semibold text-slate-500 uppercase block mb-2">
                  Next Catalyst
                </label>
                <Input
                  value={formData.nextCatalyst}
                  onChange={(e) => handleChange("nextCatalyst", e.target.value)}
                  placeholder="Event..."
                  className="h-8 text-xs"
                />
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-2">
              Risks & Concerns
            </label>
            <Textarea
              value={formData.riskFactors}
              onChange={(e) => handleChange("riskFactors", e.target.value)}
              placeholder="What could go wrong?"
              className="min-h-[80px] border-slate-200 bg-slate-50"
            />
          </div>

          <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
            <label className="text-xs font-semibold text-slate-500 uppercase block mb-2">
              Tags
            </label>
            <Input
              value={formData.tags?.join(", ")}
              onChange={(e) =>
                handleChange(
                  "tags",
                  e.target.value.split(",").map((t) => t.trim())
                )
              }
              placeholder="SaaS, Moat, Speculative..."
            />
          </div>
        </div>
      </div>
    </div>
  );
};
