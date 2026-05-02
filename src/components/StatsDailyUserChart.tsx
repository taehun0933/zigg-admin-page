"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { PlatformStats } from "@/apis/stats";

interface Props {
  series: PlatformStats[];
}

export default function StatsDailyUserChart({ series }: Props) {
  const data = series.map((row, i) => ({
    date: row.statDate,
    totalUsers: row.totalUsers,
    newUsers: i > 0 ? Math.max(0, row.totalUsers - series[i - 1].totalUsers) : 0,
  }));

  return (
    <div className="bg-white rounded-lg shadow p-5">
      <h3 className="text-base font-semibold mb-4 text-gray-800">
        날짜별 유저 수
      </h3>
      {data.length === 0 ? (
        <div className="h-[300px] flex items-center justify-center text-sm text-gray-400">
          데이터가 없습니다
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data} margin={{ left: 8, right: 16, top: 8 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} minTickGap={24} />
            <YAxis yAxisId="left" allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" allowDecimals={false} />
            <Tooltip />
            <Legend />
            <Line
              yAxisId="left"
              type="monotone"
              dataKey="totalUsers"
              name="누적 유저 수"
              stroke="#3b82f6"
              dot={false}
            />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="newUsers"
              name="일별 신규 가입"
              stroke="#10b981"
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
