import React from 'react';

interface RecentActivityItem {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
}

interface RecentActivitySectionProps {
  items: RecentActivityItem[];
}

export const RecentActivitySection: React.FC<RecentActivitySectionProps> = ({
  items,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            Recent Activity
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            Latest updates and events
          </p>
        </div>
      </div>
      <div className="space-y-4">
        {items.map((item, index) => (
          <div
            key={index}
            className={`flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors duration-150 ${
              index < items.length - 1 ? 'border-b border-gray-100' : ''
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-orange-100 rounded-lg">{item.icon}</div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {item.title}
                </p>
                <p className="text-xs text-gray-500">{item.description}</p>
              </div>
            </div>
            <span
              className={`text-xs font-medium px-2 py-1 rounded-md ${item.badgeColor}`}
            >
              {item.badge}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
