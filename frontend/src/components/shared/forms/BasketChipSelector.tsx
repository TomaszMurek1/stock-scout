import React, { useEffect, useState } from "react";
import { Chip, Button } from "@mui/material";
import { apiClient } from "@/services/apiClient";
import { toast } from "react-toastify";

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
  const [baskets, setBaskets] = useState<Basket[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBaskets = async () => {
      try {
        const response = await apiClient.get("/baskets");
        setBaskets(response.data || []);
      } catch (error) {
        console.error("Failed to load baskets", error);
        toast.error("Unable to load baskets. Please try again later.");
      } finally {
        setLoading(false);
      }
    };
    fetchBaskets();
  }, []);

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
        </div>
      )}
      
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 space-y-4">
        {Object.entries(groupedBaskets).map(([type, groupBaskets]) => (
          <div key={type} className="space-y-3">
            {/* Group Header - simplified without separator */}
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-blue-500"></span>
                {getGroupLabel(type)}
              </h4>
              <div className="flex gap-2">
                <Button
                  size="small"
                  variant="text"
                  onClick={() => selectAllInGroup(groupBaskets)}
                  className="text-xs"
                  sx={{ 
                    fontSize: "0.75rem", 
                    padding: "2px 8px", 
                    minWidth: "auto",
                    color: "#2563eb", // blue-600
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
                  onClick={() => deselectAllInGroup(groupBaskets)}
                  className="text-xs"
                  sx={{ 
                    fontSize: "0.75rem", 
                    padding: "2px 8px", 
                    minWidth: "auto",
                    color: "#64748b", // slate-500
                    "&:hover": {
                      backgroundColor: "rgba(100, 116, 139, 0.1)"
                    }
                  }}
                >
                  Clear
                </Button>
              </div>
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
