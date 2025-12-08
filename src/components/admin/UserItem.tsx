import React from "react";

interface UserItemProps {
  name: string;
  code: string;
  amount: string;
  avatar: string;
}

const UserItem: React.FC<UserItemProps> = ({ name, code, amount, avatar }) => (
  <div className="flex items-center gap-3 p-3">
    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
      <span className="text-white font-medium">{avatar}</span>
    </div>
    <div className="flex-1">
      <p className="font-medium text-gray-900">{name}</p>
      <p className="text-sm text-gray-500">{code}</p>
    </div>
    <p className="font-semibold text-gray-900">{amount}</p>
  </div>
);

export default UserItem;