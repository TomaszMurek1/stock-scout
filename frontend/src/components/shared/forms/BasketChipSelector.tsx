import React, { useEffect } from "react";
import { Chip, Button } from "@mui/material";
import { useAppStore } from "@/store/appStore";

interface Basket {
  id: number;
  name: string;
  type: string;
}

interface BasketChipSelectorProps {
  value: string[]; // array of basket IDs (as strings)
  onChange: (ids: string[]) => void;
  label?: string;
  description?: string;
}

interface GroupedBaskets {
  [key: string]: Basket[];
}

const BasketChipSelector: React.FC<BasketChipSelectorProps> = ({
  value,
  onChange,
  label,
  description,
}) => {
  // Get baskets from Zustand store
  const baskets = useAppStore((state) => state.baskets.data);
  const loading = useAppStore((state) => state.baskets.isLoading);
  const fetchBaskets = useAppStore((state) => state.fetchBaskets);

  const isSelectionEmpty = value.length === 0;

  useEffect(() => {
    // This will only fetch if baskets aren't already loaded
    fetchBaskets();
  }, [fetchBaskets]);

  // Group baskets by type
  const groupedBaskets: GroupedBaskets = baskets.reduce((acc, basket) => {
    const type = basket.type.toUpperCase();
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(basket);
    return acc;
  }, {} as GroupedBaskets);

  const toggleBasket = (basketId: string) => {
    const newValue = value.includes(basketId)
      ? value.filter((id) => id !== basketId)
      : [...value, basketId];
    onChange(newValue);
  };

  const selectAllInGroup = (groupBaskets: Basket[]) => {
    const groupIds = groupBaskets.map((b) => String(b.id));
    const newValue = [...new Set([...value, ...groupIds])];
    onChange(newValue);
  };

  const deselectAllInGroup = (groupBaskets: Basket[]) => {
    const groupIds = new Set(groupBaskets.map((b) => String(b.id)));
    const newValue = value.filter((id) => !groupIds.has(id));
    onChange(newValue);
  };

  const selectAllBaskets = () => {
    const allIds = baskets.map((b) => String(b.id));
    onChange(allIds);
  };

  const clearAllBaskets = () => {
    onChange([]);
  };

  const getGroupLabel = (type: string): string => {
    const labels: { [key: string]: string } = {
      MARKET: "Markets",
      INDEX: "Indices",
      FAVORITES: "Favorites",
      CUSTOM: "Custom",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="grid gap-2 text-left">
        {label && <p className="text-sm font-semibold text-zinc-800">{label}</p>}
        <p className="text-sm text-zinc-500">Loading baskets...</p>
      </div>
    );
  }

  if (baskets.length === 0) {
    return (
      <div className="grid gap-2 text-left">
        {label && <p className="text-sm font-semibold text-zinc-800">{label}</p>}
        <p className="text-sm text-slate-500">
          No baskets available. Create a market/index/favorites basket to start scanning.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3 text-left">
      {label && (
        <div className="flex items-center gap-2">
          <div className="h-1 w-1 rounded-full bg-blue-500"></div>
          <p className="text-sm font-semibold text-slate-800">{label}</p>
          <span className="text-red-500 text-sm font-bold">*</span>
        </div>
      )}
      
      <style>{`
        @keyframes gentle-border-pulse {
          0%, 100% {
            border-color: #60a5fa;
            box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.4);
          }
          50% {
            border-color: #3b82f6;
            box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.1);
          }
        }
        .gentle-pulse-border {
          animation: gentle-border-pulse 3s ease-in-out infinite;
        }
      `}</style>
      
      <div 
        className={`bg-slate-50 border rounded-lg p-4 space-y-4 transition-all duration-300 ${
          isSelectionEmpty 
            ? 'gentle-pulse-border' 
            : 'border-slate-200'
        }`}
      >
        {Object.entries(groupedBaskets).map(([type, groupBaskets], index) => (
          <div key={type} className="space-y-3">
            {/* Group Header */}
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                {getGroupLabel(type)}
              </h4>
              {/* Show global buttons only on first group */}
              {index === 0 && (
                <div className="flex gap-2">
                  <Button
                    size="small"
                    variant="text"
                    onClick={selectAllBaskets}
                    sx={{ 
                      fontSize: "0.75rem", 
                      padding: "4px 12px", 
                      minWidth: "auto",
                      color: "#2563eb",
                      fontWeight: 600,
                      "&:hover": {
                        backgroundColor: "rgba(37, 99, 235, 0.1)"
                      }
                    }}
                  >
                    Select All
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={clearAllBaskets}
                    sx={{ 
                      fontSize: "0.75rem", 
                      padding: "4px 12px", 
                      minWidth: "auto",
                      color: "#64748b",
                      fontWeight: 600,
                      "&:hover": {
                        backgroundColor: "rgba(100, 116, 139, 0.1)"
                      }
                    }}
                  >
                    Clear All
                  </Button>
                </div>
              )}
            </div>

            {/* Chips */}
            <div className="flex flex-wrap gap-2">
              {groupBaskets.map((basket) => {
                const isSelected = value.includes(String(basket.id));
                return (
                  <Chip
                    key={basket.id}
                    label={basket.name}
                    onClick={() => toggleBasket(String(basket.id))}
                    color={isSelected ? "primary" : "default"}
                    variant={isSelected ? "filled" : "outlined"}
                    size="medium"
                    sx={{
                      cursor: "pointer",
                      transition: "all 0.2s",
                      "&:hover": {
                        transform: "translateY(-2px)",
                        boxShadow: 2,
                      },
                      ...(isSelected && {
                        backgroundColor: "#3b82f6", // blue-500
                        color: "white",
                        "&:hover": {
                          backgroundColor: "#2563eb", // blue-600
                        },
                      }),
                    }}
                  />
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {description && (
        <p className="text-xs text-slate-600">{description}</p>
      )}
    </div>
  );
};

export default BasketChipSelector;
