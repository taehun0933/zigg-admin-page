"use client";

import { PlatformStats } from "@/apis/stats";

interface Props {
  overview: PlatformStats | null;
}

interface CardProps {
  label: string;
  value: number | undefined;
}

function StatCard({ label, value }: CardProps) {
  return (
    <div className="bg-white rounded-lg shadow p-5">
      <div className="text-sm text-gray-500 mb-1">{label}</div>
      <div className="text-3xl font-bold text-gray-900">
        {value === undefined ? "-" : value.toLocaleString()}
      </div>
    </div>
  );
}

export default function StatsSummaryCards({ overview }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard label="전체 유저 수" value={overview?.totalUsers} />
      <StatCard label="누적 오디션 수" value={overview?.totalAuditions} />
      <StatCard label="누적 오디션 지원자 수" value={overview?.totalApplications} />
    </div>
  );
}
