import { FC, ReactNode } from "react";

const ComparisonCard: FC<{
    title: string
    subtitle?: string
    icon?: ReactNode
    children: ReactNode
}> = ({ title, subtitle, icon, children }) => (
    <div className="bg-white rounded-xl shadow p-4 flex h-full">
        {/* HEADER on the left */}
        <div className="flex-shrink-0 pr-4">
            <div className="flex items-center space-x-2">
                {icon && (
                    <div className="bg-black text-white rounded-full p-1 flex items-center justify-center">
                        {icon}
                    </div>
                )}
                <div>
                    <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
                    {subtitle && <p className="text-xs text-gray-600">{subtitle}</p>}
                </div>
            </div>
        </div>

        {/* CHART on the right, now flush at the same top */}
        <div className="flex-grow">
            {children}
        </div>
    </div>
)
export default ComparisonCard;