"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { countryNameKo } from "@/utils/countryName";

interface Props {
  countryBreakdown: Record<string, number> | null | undefined;
}

const TOP_N = 15;

export default function StatsNationalityChart({ countryBreakdown }: Props) {
  const data = countryBreakdown
    ? Object.entries(countryBreakdown)
        .map(([code, count]) => ({
          country: `${countryNameKo(code)} (${code})`,
          count,
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, TOP_N)
    : [];

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <h3 className="text-base font-semibold mb-4 text-gray-800">
        국가별 유저 수 (Top {TOP_N})
      </h3>
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">
          데이터가 없습니다
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(300, data.length * 24)}>
          <BarChart data={data} layout="vertical" margin={{ left: 16, right: 16 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="country" width={140} />
            <Tooltip />
            <Bar dataKey="count" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
