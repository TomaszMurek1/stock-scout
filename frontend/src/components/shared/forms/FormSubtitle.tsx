import React from "react";

interface BulletPoint {
  label: string;
  description: string;
}

interface FormSubtitleProps {
  description: string | React.ReactNode;
  bulletPoints?: BulletPoint[];
}

/**
 * Reusable subtitle component for form cards.
 * Provides consistent structure for description + bullet points.
 * Styling is controlled by FormCardGenerator wrapper.
 */
const FormSubtitle: React.FC<FormSubtitleProps> = ({ description, bulletPoints }) => {
  return (
    <div className="space-y-2">
      {typeof description === "string" ? <p>{description}</p> : description}
      
      {bulletPoints && bulletPoints.length > 0 && (
        <ul className="list-disc list-inside text-sm ml-2">
          {bulletPoints.map((point, index) => (
            <li key={index}>
              <strong>{point.label}:</strong> {point.description}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FormSubtitle;
