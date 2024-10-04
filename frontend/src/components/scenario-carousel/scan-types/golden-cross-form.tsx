import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-toastify";

type FormData = {
  shortPeriod: string;
  longPeriod: string;
  daysToLookBack: string;
};

const GoldenCrossForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    shortPeriod: "50",
    longPeriod: "200",
    daysToLookBack: "365",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch(
        "http://localhost:8000/technical-analysis/golden-cross",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            short_window: parseInt(formData.shortPeriod),
            long_window: parseInt(formData.longPeriod),
            days_to_look_back: parseInt(formData.daysToLookBack),
            min_volume: 1000000,
            adjusted: true,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.detail || "An error occurred during the scan"
        );
      }

      const result = await response.json();
      console.log("Golden Cross Data:", result.data);
      toast.success("Golden Cross scan completed successfully");
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Network error. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Input
        name="shortPeriod"
        type="number"
        value={formData.shortPeriod}
        onChange={handleInputChange}
        placeholder="Short Period (days)"
        aria-label="Short Period"
        required
        className="w-full"
      />
      <Input
        name="longPeriod"
        type="number"
        value={formData.longPeriod}
        onChange={handleInputChange}
        placeholder="Long Period (days)"
        aria-label="Long Period"
        required
        className="w-full"
      />
      <Input
        name="daysToLookBack"
        type="number"
        value={formData.daysToLookBack}
        onChange={handleInputChange}
        placeholder="Days to Look Back"
        aria-label="Days to Look Back"
        required
        className="w-full"
      />
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 text-white hover:bg-blue-700"
      >
        {isLoading ? "Loading..." : "Run Golden Cross Scan"}
      </Button>
    </form>
  );
};

export default GoldenCrossForm;
