"use client";

import React, { useState } from "react";
import { LectureSubmission } from "@/apis/lecture";
import { EmptyState, formatYmd } from "@/components/admin/LectureParts";

// 수강생 제출 영상을 주차별로 모아 본다 (트레이너·관리자 공용)
// onOpen 이 있으면 피드백 화면으로 이동, 없으면 카드 안에서 피드백을 펼쳐 본다(관리자 조회 전용)
export default function LectureSubmissionsByWeek({
  weeks,
  submissions,
  onOpen,
}: {
  weeks: { weekId: number; weekNo: number; title: string }[];
  submissions: LectureSubmission[];
  onOpen?: (submission: LectureSubmission) => void;
}) {
  const [weekId, setWeekId] = useState<number | null>(null); // null = 전체
  const [expanded, setExpanded] = useState<number | null>(null);

  const countByWeek = new Map<number, number>();
  submissions.forEach((s) => countByWeek.set(s.weekId, (countByWeek.get(s.weekId) ?? 0) + 1));
  const visibleWeeks = weeks.filter((w) => weekId === null || w.weekId === weekId);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        <Chip active={weekId === null} onClick={() => setWeekId(null)}>
          전체 {submissions.length}
        </Chip>
        {weeks.map((w) => (
          <Chip key={w.weekId} active={weekId === w.weekId} onClick={() => setWeekId(w.weekId)}>
            {w.weekNo}주차 {countByWeek.get(w.weekId) ?? 0}
          </Chip>
        ))}
      </div>

      {submissions.length === 0 ? (
        <EmptyState>아직 제출된 과제 영상이 없어요.</EmptyState>
      ) : (
        visibleWeeks.map((w) => {
          const list = submissions.filter((s) => s.weekId === w.weekId);
          return (
            <section
              key={w.weekId}
              style={{ background: "#fff", border: "1px solid var(--admin-border)", borderRadius: 14, padding: 20 }}
            >
              <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: "var(--admin-blue)" }}>{w.weekNo}주차</span>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{w.title}</h2>
                <div style={{ flex: 1 }} />
                <span style={{ fontSize: 12, color: "var(--admin-ink-3)" }}>제출 {list.length}개</span>
              </div>
              {list.length === 0 ? (
                <div style={{ fontSize: 12.5, color: "var(--admin-ink-3)" }}>이 주차에 제출된 영상이 없어요.</div>
              ) : (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
                  {list.map((s) => (
                    <div key={s.submissionId} style={{ width: 220, display: "flex", flexDirection: "column", gap: 6 }}>
                      <video
                        src={s.video.url}
                        poster={s.video.thumbnailUrl ?? undefined}
                        controls
                        playsInline
                        preload="none"
                        style={{ width: "100%", aspectRatio: "16 / 9", borderRadius: 10, background: "#000" }}
                      />
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.studentNickname ?? "수강생"}
                        </span>
                        <span style={{ fontSize: 11.5, color: "var(--admin-ink-3)", flexShrink: 0 }}>{formatYmd(s.submittedAt)}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          onOpen ? onOpen(s) : setExpanded(expanded === s.submissionId ? null : s.submissionId)
                        }
                        style={{
                          height: 30,
                          borderRadius: 8,
                          fontSize: 12,
                          fontWeight: 600,
                          border: "1px solid var(--admin-border)",
                          background: s.feedbacks.length > 0 ? "var(--admin-blue-tint)" : "#fff",
                          color: s.feedbacks.length > 0 ? "var(--admin-blue)" : "var(--admin-ink-2)",
                        }}
                      >
                        {s.feedbacks.length > 0
                          ? `피드백 ${s.feedbacks.length}개${onOpen ? "" : expanded === s.submissionId ? " 접기" : " 보기"}`
                          : onOpen
                          ? "피드백 남기기"
                          : "피드백 대기"}
                      </button>
                      {!onOpen && expanded === s.submissionId && s.feedbacks.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12.5, lineHeight: 1.5 }}>
                          {s.feedbacks.map((f) => (
                            <div key={f.feedbackId}>
                              {f.timeline && (
                                <strong style={{ color: "var(--admin-blue)", marginRight: 4 }}>{f.timeline}</strong>
                              )}
                              {f.message}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>
          );
        })
      )}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 32,
        padding: "0 12px",
        borderRadius: 999,
        border: `1px solid ${active ? "var(--admin-blue)" : "var(--admin-border)"}`,
        background: active ? "var(--admin-blue-tint)" : "#fff",
        color: active ? "var(--admin-blue)" : "var(--admin-ink-2)",
        fontSize: 12.5,
        fontWeight: 600,
      }}
    >
      {children}
    </button>
  );
}
