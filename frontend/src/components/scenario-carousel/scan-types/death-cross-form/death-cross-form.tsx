import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "react-toastify";

type FormData = {
  shortPeriod: string;
  longPeriod: string;
  daysToLookBack: string;
};

const DeathCrossForm: React.FC = () => {
  const [formData, setFormData] = useState<FormData>({
    shortPeriod: "50",
    longPeriod: "200",
    daysToLookBack: "40",
  });
  const [isLoading, setIsLoading] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // TODO: Implement Death Cross scan API call
    toast.info("Death Cross scan not implemented yet");
    setIsLoading(false);
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
        className="w-full bg-red-600 text-white hover:bg-red-700"
      >
        {isLoading ? "Loading..." : "Run Death Cross Scan"}
      </Button>
    </form>
  );
};

export default DeathCrossForm;
