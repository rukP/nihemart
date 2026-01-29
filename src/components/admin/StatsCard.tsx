import React from "react";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  changeType?: "increase" | "decrease" | "neutral";
  icon: LucideIcon;
  iconColor: string;
  iconBgColor?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon: Icon,
  iconColor,
  iconBgColor,
}) => {
  const bgColor = iconBgColor || iconColor;
  const changeColor = 
    changeType === "increase" ? "text-green-600" :
    changeType === "decrease" ? "text-red-600" :
    "text-gray-500";
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-6 flex flex-col h-full group">
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-xl ${bgColor} group-hover:scale-110 transition-transform duration-200`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="flex flex-col flex-grow justify-between">
        <p className="text-sm font-medium text-gray-500 mb-2 uppercase tracking-wide">{title}</p>
        <p className="text-3xl font-bold text-gray-900 mb-3">{value}</p>
        {change && (
          <div className="flex items-center gap-2 mt-auto pt-2 border-t border-gray-100">
            {changeType === "increase" && <TrendingUp className="w-4 h-4 text-green-600" />}
            {changeType === "decrease" && <TrendingDown className="w-4 h-4 text-red-600" />}
            {changeType === "neutral" && <Icon className="w-4 h-4 text-gray-400" />}
            <span className={`text-sm font-semibold ${changeColor}`}>
              {changeType === "increase" ? "+" : changeType === "decrease" ? "-" : ""}{change}%
            </span>
            <span className="text-xs text-gray-500">vs previous period</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;