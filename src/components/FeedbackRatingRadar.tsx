"use client";

import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import type { FeedbackItemScore } from "@/types/audition";

type RatingAxis = Omit<FeedbackItemScore, "score"> & { score: number | null };

interface Props {
  scores: RatingAxis[];
  /** 작성 중에는 미평가 축도 유지하되 점수와 다각형을 그리지 않는다. */
  expectedCount?: number;
}

export default function FeedbackRatingRadar({ scores, expectedCount }: Props) {
  const axes = scores.map(score => ({
    ...score,
    score: score.score !== null && Number.isInteger(score.score) && score.score >= 1 && score.score <= 5 ? score.score : null,
  }));
  const ratedCount = axes.filter(axis => axis.score !== null).length;
  const uniqueItems = new Set(axes.map(axis => axis.feedbackItemId));
  const complete = ratedCount === axes.length;
  const showChart = axes.length === 6 && uniqueItems.size === 6 && (expectedCount === 6 || complete);

  return (
    <figure style={{ margin: 0, minWidth: 0 }}>
      <figcaption style={{ fontWeight: 600, color: "var(--admin-ink)" }}>
        항목 평가 그래프 <span style={{ fontWeight: 400, color: "var(--admin-ink-2)" }}>· 5점 만점</span>
      </figcaption>
      {showChart ? (
        <div aria-hidden="true" style={{ width: "100%", maxWidth: 480, margin: "0 auto", minWidth: 0 }}>
          <ResponsiveContainer width="100%" height={280}>
            <RadarChart data={axes} outerRadius="60%" margin={{ top: 20, right: 28, bottom: 20, left: 28 }}>
              <PolarGrid stroke="var(--admin-border)" />
              <PolarAngleAxis dataKey="name" tick={{ fill: "var(--admin-ink-2)", fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 5]} ticks={[1, 2, 3, 4, 5]} tick={{ fill: "var(--admin-ink-3)", fontSize: 10 }} axisLine={false} />
              <Radar
                name="평가 점수"
                dataKey="score"
                stroke={complete ? "var(--admin-blue)" : "none"}
                fill={complete ? "var(--admin-blue)" : "none"}
                fillOpacity={0.18}
                isAnimationActive={false}
                dot={({ cx, cy, payload }) => (payload as RatingAxis).score === null ? <g /> : <circle cx={cx} cy={cy} r={4} fill="var(--admin-blue)" />}
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      ) : null}
      {expectedCount === 6 && !complete && (
        <p style={{ margin: "8px 0", color: "var(--admin-ink-3)" }}>
          평가 {ratedCount}/6 · 미평가 {6 - ratedCount}개 · 평가한 항목만 점으로 표시됩니다.
        </p>
      )}
      {axes.length > 0 && (
        <ul aria-label="항목별 평가 점수" style={{ display: "flex", gap: 6, flexWrap: "wrap", padding: 0, margin: "8px 0 0", listStyle: "none" }}>
          {axes.map(score => (
            <li key={score.feedbackItemId} style={{ padding: "4px 8px", border: "1px solid var(--admin-border)", borderRadius: 8, color: "var(--admin-ink-2)" }}>
              {score.name} <b style={{ color: "var(--admin-blue)" }}>{score.score === null ? "미평가" : `${score.score}점`}</b>
            </li>
          ))}
        </ul>
      )}
    </figure>
  );
}
