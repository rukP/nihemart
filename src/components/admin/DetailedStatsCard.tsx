import React from 'react';
import { LucideIcon } from 'lucide-react';

interface DetailedStatsData {
  label: string;
  value: string;
}

interface DetailedStatsCardProps {
  title: string;
  data: DetailedStatsData[];
  icon: LucideIcon;
  iconColor: string;
  iconBgColor?: string;
}

const DetailedStatsCard: React.FC<DetailedStatsCardProps> = ({
  title,
  data,
  icon: Icon,
  iconColor,
  iconBgColor,
}) => {
  const bgColor = iconBgColor || iconColor;

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-6 flex flex-col h-full group">
      <div className="flex items-center justify-between mb-4">
        <div
          className={`p-3 rounded-xl ${bgColor} group-hover:scale-110 transition-transform duration-200`}
        >
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="flex flex-col flex-grow justify-between">
        <p className="text-sm font-medium text-gray-500 mb-4 uppercase tracking-wide">
          {title}
        </p>
        <div className="space-y-3">
          {data.map((item: DetailedStatsData, index: number) => (
            <div
              key={index}
              className="flex justify-between items-center py-2 border-b border-gray-50 last:border-0"
            >
              <span className="text-sm font-medium text-gray-600">
                {item.label}
              </span>
              <span className="text-sm font-bold text-gray-900">
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default DetailedStatsCard;
