import React from "react";

interface DashboardCardProps {
  title: string;
  description: string;
  onClick: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({
  title,
  description,
  onClick,
}) => {
  return (
    <div
      className="bg-white shadow rounded p-6 cursor-pointer hover:shadow-lg transition-all"
      onClick={onClick}
    >
      <h2 className="text-2xl font-bold mb-2">{title}</h2>
      <p className="text-gray-700">{description}</p>
    </div>
  );
};

export default DashboardCard;
