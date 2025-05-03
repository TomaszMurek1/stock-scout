import { FC, ReactNode } from "react";

const ComparisonCard: FC<{ title: string; children: ReactNode }> = ({
    title,
    children,
}) => (
    <div className="bg-white rounded-xl shadow p-4 space-y-2">
        <h3 className="text-sm font-semibold">{title}</h3>
        {children}
    </div>
);

export default ComparisonCard;
