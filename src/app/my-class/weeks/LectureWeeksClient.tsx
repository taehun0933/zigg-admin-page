"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PageShell, { btnSecondary } from "@/components/admin/PageShell";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import { EmptyState, LectureStatusChip } from "@/components/admin/LectureParts";
import {
  Lecture,
  LectureWeekDetail,
  addLectureReference,
  deleteLectureReference,
  getLectureWeeks,
  getMyLecture,
  uploadLectureVideo,
} from "@/apis/lecture";

// 주차 구성은 관리자가 확정 → 트레이너는 주차별 레퍼런스 영상만 올리고 지운다
const LectureWeeksClient: React.FC<{ lectureId: number | null }> = ({ lectureId }) => {
  const ready = useAdminAuthGuard("TRAINER");
  const router = useRouter();
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [weeks, setWeeks] = useState<LectureWeekDetail[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    if (lectureId === null) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [l, w] = await Promise.all([getMyLecture(lectureId), getLectureWeeks(lectureId)]);
        setLecture(l);
        setWeeks(w);
      } catch (err) {
        console.error(err);
        setLecture(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, lectureId]);

  const replaceWeek = (updated: LectureWeekDetail) =>
    setWeeks((prev) => prev.map((w) => (w.weekId === updated.weekId ? updated : w)));

  if (!ready) return null;

  const editable = lecture?.status === "APPROVED";

  return (
    <AdminShell>
      <PageShell
        eyebrow="내 클래스"
        title={lecture ? lecture.title : "주차별 레퍼런스"}
        subtitle="주차별 레퍼런스 영상을 올리면 수강생이 바로 볼 수 있어요. 주차 구성은 관리자가 확정해요."
        action={
          <button type="button" style={btnSecondary} onClick={() => router.push("/my-class")}>
            목록으로
          </button>
        }
      >
        {loading ? (
          <EmptyState>불러오는 중…</EmptyState>
        ) : !lecture ? (
          <EmptyState>클래스를 불러오지 못했어요.</EmptyState>
        ) : weeks.length === 0 ? (
          <EmptyState>확정된 주차가 없어요. 관리자에게 문의해주세요.</EmptyState>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!editable && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--admin-ink-3)" }}>
                <LectureStatusChip status={lecture.status} />
                운영 중인 클래스만 레퍼런스를 올리거나 지울 수 있어요.
              </div>
            )}
            {weeks.map((w) => (
              <WeekSection
                key={w.weekId}
                lectureId={lecture.lectureId}
                week={w}
                editable={editable}
                onChange={replaceWeek}
              />
            ))}
          </div>
        )}
      </PageShell>
    </AdminShell>
  );
};

function WeekSection({
  lectureId,
  week,
  editable,
  onChange,
}: {
  lectureId: number;
  week: LectureWeekDetail;
  editable: boolean;
  onChange: (week: LectureWeekDetail) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onPickVideo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !title.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const videoId = await uploadLectureVideo(file, "LECTURE_REFERENCE");
      onChange(await addLectureReference(lectureId, week.weekId, { title: title.trim(), videoId }));
      setTitle("");
    } catch (err) {
      console.error(err);
      setError("업로드에 실패했어요. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (referenceId: number) => {
    if (busy || !window.confirm("이 레퍼런스 영상을 삭제할까요?")) return;
    setBusy(true);
    setError(null);
    try {
      onChange(await deleteLectureReference(lectureId, week.weekId, referenceId));
    } catch (err) {
      console.error(err);
      setError("삭제에 실패했어요. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section style={{ background: "#fff", border: "1px solid var(--admin-border)", borderRadius: 14, padding: 20 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: week.description ? 4 : 14 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--admin-blue)" }}>{week.weekNo}주차</span>
        <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{week.title}</h2>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--admin-ink-3)" }}>레퍼런스 {week.references.length}개</span>
      </div>
      {week.description && (
        <div style={{ fontSize: 13, color: "var(--admin-ink-3)", marginBottom: 14 }}>{week.description}</div>
      )}

      {week.references.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 14 }}>
          {week.references.map((r) => (
            <div key={r.referenceId} style={{ width: 220, display: "flex", flexDirection: "column", gap: 6 }}>
              <video
                src={r.video.url}
                poster={r.video.thumbnailUrl ?? undefined}
                controls
                playsInline
                style={{ width: "100%", aspectRatio: "16 / 9", borderRadius: 10, background: "#000" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ flex: 1, minWidth: 0, fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.title}
                </span>
                {editable && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onDelete(r.referenceId)}
                    style={{ fontSize: 12, color: "var(--admin-red-ink)", flexShrink: 0 }}
                  >
                    삭제
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {editable && (
        <div style={{ display: "flex", gap: 8 }}>
          <input
            value={title}
            disabled={busy}
            maxLength={100}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="레퍼런스 제목 (예: 인트로 & 기본 안무)"
            style={{
              flex: 1,
              minWidth: 0,
              height: 40,
              borderRadius: 10,
              border: "1px solid var(--admin-border)",
              padding: "0 12px",
              fontSize: 14,
              outline: "none",
              color: "var(--admin-ink)",
            }}
          />
          <button
            type="button"
            disabled={busy || !title.trim()}
            onClick={() => inputRef.current?.click()}
            style={{
              flexShrink: 0,
              height: 40,
              padding: "0 16px",
              borderRadius: 10,
              background: busy || !title.trim() ? "#c4c4cc" : "var(--admin-blue)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
              cursor: busy || !title.trim() ? "not-allowed" : "pointer",
            }}
          >
            {busy ? "처리 중…" : "+ 영상 업로드"}
          </button>
          <input ref={inputRef} type="file" accept="video/*" onChange={onPickVideo} hidden />
        </div>
      )}
      {error && <div style={{ fontSize: 13, color: "var(--admin-red-ink)", marginTop: 8 }}>{error}</div>}
    </section>
  );
}

export default LectureWeeksClient;
