import React, { useState } from "react";

const DeathCrossForm: React.FC = () => {
  const [shortPeriod, setShortPeriod] = useState("50");
  const [longPeriod, setLongPeriod] = useState("200");
  const [isLoading, setIsLoading] = useState(false);

  return (
    <div>
      <h1>Death Cross Form</h1>
    </div>
  );
};

export default DeathCrossForm;
