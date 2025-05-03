import { FC, ReactNode } from "react";

const ComparisonCard: FC<{ title: string; subtitle?: string; icon?: ReactNode; children: ReactNode }> = ({
    title,
    subtitle,
    icon,
    children,
}) => (
    <div className="bg-white rounded-xl shadow p-4 space-y-3 flex flex-col h-full"> {/* Use h-full */}
        <div className="flex items-center space-x-2 flex-shrink-0"> {/* Prevent shrinking */}
            {/* Use arbitrary value for the background color matching the image orange */}
            {icon && <div className="bg-black text-white rounded-full p-1 flex items-center justify-center flex-shrink-0">{icon}</div>}
            <div>
                <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
                {subtitle && <p className="text-xs text-gray-600">{subtitle}</p>}
            </div>
        </div>
        {/* Allow content area to grow, center vertically */}
        <div className="flex-grow flex flex-col items-center justify-center">
            {children}
        </div>
    </div>
);

export default ComparisonCard;