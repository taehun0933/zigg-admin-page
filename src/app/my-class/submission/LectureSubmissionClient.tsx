"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PageShell, { adminCardStyle, btnPrimary, btnSecondary } from "@/components/admin/PageShell";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import { EmptyState, formatYmd } from "@/components/admin/LectureParts";
import {
  LectureSubmission,
  addLectureFeedback,
  deleteLectureFeedback,
  getLectureSubmission,
} from "@/apis/lecture";

// 초 → "mm:ss"
const toTimeline = (sec: number) => {
  const s = Math.max(0, Math.floor(sec));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};

// "mm:ss" → 초 (형식이 다르면 null)
const fromTimeline = (timeline: string): number | null => {
  const m = /^(\d+):(\d{2})$/.exec(timeline);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
};

// 영상을 보면서 현재 재생 시점에 코멘트를 남긴다 (피드백을 받으면 수강생은 재제출 불가)
const LectureSubmissionClient: React.FC<{ lectureId: number | null; submissionId: number | null }> = ({
  lectureId,
  submissionId,
}) => {
  const ready = useAdminAuthGuard("TRAINER");
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [submission, setSubmission] = useState<LectureSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [withTimeline, setWithTimeline] = useState(true);
  const [currentSec, setCurrentSec] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (lectureId === null || submissionId === null) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        setSubmission(await getLectureSubmission(lectureId, submissionId));
      } catch (err) {
        console.error(err);
        setSubmission(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, lectureId, submissionId]);

  const seek = (timeline: string | null) => {
    const sec = timeline ? fromTimeline(timeline) : null;
    if (sec === null || !videoRef.current) return;
    videoRef.current.currentTime = sec;
    videoRef.current.play().catch(() => undefined);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submission || lectureId === null || !message.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      setSubmission(
        await addLectureFeedback(lectureId, submission.submissionId, {
          timeline: withTimeline ? toTimeline(currentSec) : null,
          message: message.trim(),
        })
      );
      setMessage("");
    } catch (err) {
      console.error(err);
      setError("피드백 등록에 실패했어요. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (feedbackId: number) => {
    if (!submission || lectureId === null || busy || !window.confirm("이 피드백을 삭제할까요?")) return;
    setBusy(true);
    setError(null);
    try {
      setSubmission(await deleteLectureFeedback(lectureId, submission.submissionId, feedbackId));
    } catch (err) {
      console.error(err);
      setError("삭제에 실패했어요. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };

  if (!ready) return null;

  return (
    <AdminShell>
      <PageShell
        eyebrow="내 클래스"
        title={
          submission
            ? `${submission.studentNickname ?? "수강생"} · ${submission.weekNo}주차 과제`
            : "과제 피드백"
        }
        subtitle={
          submission
            ? `제출 ${formatYmd(submission.submittedAt)} · 피드백을 남기면 수강생에게 앱 알림이 가요.`
            : undefined
        }
        action={
          <button
            type="button"
            style={btnSecondary}
            onClick={() => router.push(lectureId ? `/my-class/weeks?id=${lectureId}` : "/my-class")}
          >
            수강생 목록으로
          </button>
        }
      >
        {loading ? (
          <EmptyState>불러오는 중…</EmptyState>
        ) : !submission ? (
          <EmptyState>과제를 불러오지 못했어요.</EmptyState>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "start" }}>
            <section style={{ ...adminCardStyle, padding: 14 }}>
              <video
                ref={videoRef}
                src={submission.video.url}
                poster={submission.video.thumbnailUrl ?? undefined}
                controls
                playsInline
                onTimeUpdate={(e) => setCurrentSec(e.currentTarget.currentTime)}
                style={{ width: "100%", maxHeight: 560, borderRadius: 10, background: "#000", display: "block" }}
              />
            </section>

            <section style={{ ...adminCardStyle, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>피드백 ({submission.feedbacks.length})</h2>
              {submission.feedbacks.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--admin-ink-3)" }}>아직 남긴 피드백이 없어요.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {submission.feedbacks.map((f, idx) => (
                    <div
                      key={f.feedbackId}
                      style={{ display: "flex", gap: 10, padding: "10px 0", borderBottom: "1px solid var(--admin-border)" }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          width: 22,
                          height: 22,
                          borderRadius: "50%",
                          background: "var(--admin-blue)",
                          color: "#fff",
                          fontSize: 11.5,
                          fontWeight: 700,
                          lineHeight: "22px",
                          textAlign: "center",
                        }}
                      >
                        {idx + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {f.timeline && (
                          <button
                            type="button"
                            onClick={() => seek(f.timeline)}
                            style={{ fontSize: 12, fontWeight: 700, color: "var(--admin-blue)", marginRight: 6 }}
                          >
                            {f.timeline}
                          </button>
                        )}
                        <span style={{ fontSize: 13, lineHeight: 1.55, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {f.message}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => onDelete(f.feedbackId)}
                        style={{ flexShrink: 0, fontSize: 12, color: "var(--admin-ink-3)" }}
                      >
                        삭제
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12.5, color: "var(--admin-ink-2)" }}>
                  <input type="checkbox" checked={withTimeline} onChange={(e) => setWithTimeline(e.target.checked)} />
                  현재 재생 시점 <strong>{toTimeline(currentSec)}</strong>에 남기기
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  placeholder="피드백을 입력하세요."
                  style={{
                    width: "100%",
                    borderRadius: 10,
                    border: "1px solid var(--admin-border)",
                    padding: "10px 12px",
                    fontSize: 13,
                    lineHeight: 1.55,
                    outline: "none",
                    resize: "vertical",
                  }}
                />
                {error && <div style={{ fontSize: 13, color: "var(--admin-red-ink)" }}>{error}</div>}
                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button
                    type="submit"
                    disabled={busy || !message.trim()}
                    style={{ ...btnPrimary, opacity: busy || !message.trim() ? 0.5 : 1 }}
                  >
                    {busy ? "처리 중…" : "피드백 남기기"}
                  </button>
                </div>
              </form>
            </section>
          </div>
        )}
      </PageShell>
    </AdminShell>
  );
};

export default LectureSubmissionClient;
