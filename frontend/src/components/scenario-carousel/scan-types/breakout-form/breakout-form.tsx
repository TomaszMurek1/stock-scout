import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-toastify";

type FormData = {
  consolidationPeriod: string;
  breakoutPercentage: string;
  volumeIncrease: string;
};

const BreakoutForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    consolidationPeriod: "20",
    breakoutPercentage: "5",
    volumeIncrease: "200",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // TODO: Implement Breakout scan API call
    toast.info("Breakout scan not implemented yet");
    setIsLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        name="consolidationPeriod"
        type="number"
        value={formData.consolidationPeriod}
        onChange={handleInputChange}
        placeholder="Consolidation Period (days)"
        aria-label="Consolidation Period"
        required
        className="w-full"
      />
      <Input
        name="breakoutPercentage"
        type="number"
        value={formData.breakoutPercentage}
        onChange={handleInputChange}
        placeholder="Breakout Percentage"
        aria-label="Breakout Percentage"
        required
        className="w-full"
      />
      <Input
        name="volumeIncrease"
        type="number"
        value={formData.volumeIncrease}
        onChange={handleInputChange}
        placeholder="Volume Increase (%)"
        aria-label="Volume Increase"
        required
        className="w-full"
      />
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-green-600 text-white hover:bg-green-700"
      >
        {isLoading ? "Loading breakout..." : "Run Breakout Scan"}
      </Button>
    </form>
  );
};

export default BreakoutForm;
