"use client";

import React from "react";
import { LectureWeekInput } from "@/apis/lecture";

export const MAX_LECTURE_WEEKS = 52;

// 주차 제목이 모두 채워졌는지 (1주 이상)
export const weeksInvalid = (weeks: LectureWeekInput[]) =>
  weeks.length === 0 || weeks.some((w) => !w.title.trim());

// 요청 바디용 정리 (공백 제거, 빈 설명은 null)
export const normalizeWeeks = (weeks: LectureWeekInput[]): LectureWeekInput[] =>
  weeks.map((w) => ({ title: w.title.trim(), description: w.description?.trim() || null }));

// 주차 구성 편집 (트레이너 신청서 / 관리자 최종값 공용). 순서 = 주차 번호
export default function LectureWeeksEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: LectureWeekInput[];
  onChange: (weeks: LectureWeekInput[]) => void;
  disabled?: boolean;
}) {
  const update = (index: number, patch: Partial<LectureWeekInput>) =>
    onChange(value.map((w, i) => (i === index ? { ...w, ...patch } : w)));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {value.map((w, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-start",
            padding: 10,
            borderRadius: 10,
            border: "1px solid var(--admin-border)",
            background: "#fafafc",
          }}
        >
          <span
            style={{
              flexShrink: 0,
              width: 46,
              height: 38,
              lineHeight: "38px",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--admin-blue)",
            }}
          >
            {i + 1}주차
          </span>
          <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 6 }}>
            <input
              value={w.title}
              disabled={disabled}
              maxLength={100}
              onChange={(e) => update(i, { title: e.target.value })}
              placeholder="주차 제목 (예: 기본기 점검)"
              style={inputStyle}
            />
            <input
              value={w.description ?? ""}
              disabled={disabled}
              onChange={(e) => update(i, { description: e.target.value })}
              placeholder="내용 (선택)"
              style={{ ...inputStyle, fontSize: 13 }}
            />
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              title="주차 삭제"
              style={{ flexShrink: 0, height: 38, padding: "0 8px", fontSize: 12.5, color: "var(--admin-ink-3)" }}
            >
              삭제
            </button>
          )}
        </div>
      ))}
      {!disabled && value.length < MAX_LECTURE_WEEKS && (
        <button
          type="button"
          onClick={() => onChange([...value, { title: "", description: null }])}
          style={{
            height: 40,
            borderRadius: 10,
            border: "1px dashed var(--admin-border)",
            background: "#fafafc",
            color: "var(--admin-ink-2)",
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          + 주차 추가
        </button>
      )}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  height: 38,
  borderRadius: 8,
  border: "1px solid var(--admin-border)",
  background: "#fff",
  padding: "0 10px",
  fontSize: 14,
  outline: "none",
  color: "var(--admin-ink)",
};
