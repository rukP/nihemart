import React from 'react';
import UserItem from '@/components/admin/UserItem';
import Link from 'next/link';

interface TopUser {
  name: string;
  code: string;
  amount: string;
  avatar: string;
}

interface TopUsersSectionProps {
  users: TopUser[];
  isLoading: boolean;
}

export const TopUsersSection: React.FC<TopUsersSectionProps> = ({
  users,
  isLoading,
}) => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow duration-200">
      <div className="flex justify-between items-center p-4 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">Recent Users</h3>
        <Link className="text-sm text-blue-500" href="/admin/users">
          All users
        </Link>
      </div>
      <div>
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="p-4 border-b border-gray-100 animate-pulse"
            >
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            </div>
          ))
        ) : users.length > 0 ? (
          users.map((user, index) => (
            <UserItem
              key={index}
              name={user.name}
              code={user.code}
              amount={user.amount}
              avatar={user.avatar}
            />
          ))
        ) : (
          <div className="p-4 text-center text-gray-500">
            <p className="text-sm">No users found</p>
          </div>
        )}
      </div>
    </div>
  );
};
