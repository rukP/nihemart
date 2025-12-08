import React from "react";
import { LucideIcon } from "lucide-react";

interface DetailedStatsData {
  label: string;
  value: string;
}

interface DetailedStatsCardProps {
  title: string;
  data: DetailedStatsData[];
  icon: LucideIcon;
  iconColor: string;
}

const DetailedStatsCard: React.FC<DetailedStatsCardProps> = ({
  title,
  data,
  icon: Icon,
  iconColor,
}) => (
  <div className="bg-white rounded-lg border shadow-sm p-6 flex flex-col h-full ">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2 rounded-lg ${iconColor}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
    </div>
    <div className="flex flex-col flex-grow justify-between">
      <p className="text-sm font-medium text-gray-600 mb-3">{title}</p>
      <div className="space-y-2">
        {data.map((item: DetailedStatsData, index: number) => (
          <div
            key={index}
            className="flex justify-between items-center flex-wrap"
          >
            <span className="text-sm text-gray-600">{item.label}</span>
            <span className="text-sm font-medium text-gray-900">
              {item.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export default DetailedStatsCard;