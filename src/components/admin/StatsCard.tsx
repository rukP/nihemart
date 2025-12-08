import React from "react";
import { LucideIcon } from "lucide-react";

interface StatsCardProps {
  title: string;
  value: string;
  change?: string;
  icon: LucideIcon;
  iconColor: string;
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  change,
  icon: Icon,
  iconColor,
}) => (
  <div className="bg-white rounded-lg border shadow-sm p-6 flex flex-col h-full">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-lg ${iconColor}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
    <div className="flex flex-col flex-grow justify-between">
      <p className="text-sm font-medium text-gray-600 mb-2">{title}</p>
      <p className="text-2xl font-bold text-gray-900 mb-2">{value}</p>
      {change && (
        <div className="flex items-center gap-1 mt-auto">
          <Icon className="w-4 h-4 text-blue-500" />
          <span className="text-sm text-blue-500">{change}%</span>
          <span className="text-sm text-gray-500">vs last 7 days</span>
        </div>
      )}
    </div>
  </div>
);

export default StatsCard;