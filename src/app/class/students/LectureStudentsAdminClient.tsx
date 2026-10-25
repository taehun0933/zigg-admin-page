"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PageShell, { adminCardStyle, btnPrimary, btnSecondary, inputStyle } from "@/components/admin/PageShell";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import {
  EmptyState,
  LectureDetailModal,
  LectureStatusChip,
  capacityText,
  formatYmd,
} from "@/components/admin/LectureParts";
import {
  Lecture,
  LectureStudent,
  LectureSubmission,
  LectureWeekDetail,
  enrollLectureStudent,
  getLecture,
  getLectureStudents,
  getLectureSubmissionsForAdmin,
  getLectureWeeksForAdmin,
  unenrollLectureStudent,
} from "@/apis/lecture";
import { AdminUserSearchResult, searchAdminUsers } from "@/apis/user";
import LectureSubmissionsByWeek from "@/components/admin/LectureSubmissionsByWeek";

// 관리자 클래스 페이지 — 주차별 레퍼런스 영상(조회) + 수강생 등록·해제
// 결제 연동 전까지 관리자가 수강생을 직접 등록·해제한다 (해제해도 과제·피드백은 보존)
const LectureStudentsAdminClient: React.FC<{ lectureId: number | null }> = ({ lectureId }) => {
  const ready = useAdminAuthGuard();
  const router = useRouter();
  const [lecture, setLecture] = useState<Lecture | null>(null);
  const [students, setStudents] = useState<LectureStudent[]>([]);
  const [weeks, setWeeks] = useState<LectureWeekDetail[]>([]);
  const [submissions, setSubmissions] = useState<LectureSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState("");
  const [results, setResults] = useState<AdminUserSearchResult[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    if (lectureId === null) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const [l, s, w, sb] = await Promise.all([
          getLecture(lectureId),
          getLectureStudents(lectureId),
          getLectureWeeksForAdmin(lectureId),
          getLectureSubmissionsForAdmin(lectureId),
        ]);
        setSubmissions(sb);
        setLecture(l);
        setStudents(s);
        setWeeks(w);
      } catch (err) {
        console.error(err);
        setLecture(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [ready, lectureId]);

  const onSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) return;
    setError(null);
    try {
      setResults(await searchAdminUsers(keyword.trim()));
    } catch (err) {
      console.error(err);
      setError("유저 검색에 실패했어요.");
    }
  };

  const run = async (action: () => Promise<LectureStudent[]>) => {
    setBusy(true);
    setError(null);
    try {
      setStudents(await action());
    } catch (err) {
      // 백엔드 메시지 (정원 초과·일반 유저 아님·이미 수강 중 등)
      setError((err as { message?: string }).message ?? "처리에 실패했어요.");
    } finally {
      setBusy(false);
    }
  };

  const onEnroll = (userId: number) => lectureId !== null && run(() => enrollLectureStudent(lectureId, userId));
  const onUnenroll = (s: LectureStudent) => {
    if (lectureId === null) return;
    if (!window.confirm(`${s.nickname ?? s.name ?? "수강생"}님을 수강 해제할까요? 제출한 과제와 피드백은 남아요.`)) return;
    run(() => unenrollLectureStudent(lectureId, s.userId));
  };

  if (!ready) return null;

  const enrolledIds = new Set(students.map((s) => s.userId));
  const weekCount = lecture?.weeks.length ?? 0;

  return (
    <AdminShell>
      <PageShell
        eyebrow="클래스 관리"
        title={lecture ? lecture.title : "클래스 페이지"}
        subtitle={
          lecture
            ? `수강생 ${students.length}명 · 모집 ${capacityText(lecture)} · 결제 연동 전까지 관리자가 직접 등록해요.`
            : undefined
        }
        action={
          <div style={{ display: "flex", gap: 8 }}>
            {lecture && (
              <button type="button" style={btnSecondary} onClick={() => setInfoOpen(true)}>
                클래스 정보
              </button>
            )}
            <button type="button" style={btnSecondary} onClick={() => router.push("/class")}>
              목록으로
            </button>
          </div>
        }
      >
        {loading ? (
          <EmptyState>불러오는 중…</EmptyState>
        ) : !lecture ? (
          <EmptyState>클래스를 불러오지 못했어요.</EmptyState>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <section style={{ ...adminCardStyle, padding: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px" }}>주차별 영상</h2>
              {weeks.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--admin-ink-3)", padding: "8px 0" }}>주차 구성이 없어요.</div>
              ) : (
                weeks.map((w) => <WeekRow key={w.weekId} week={w} />)
              )}
            </section>

            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: "4px 0 10px" }}>수강생 제출 영상</h2>
              <LectureSubmissionsByWeek weeks={weeks} submissions={submissions} />
            </div>

            <section style={{ ...adminCardStyle, padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>수강생 추가</h2>
                <LectureStatusChip status={lecture.status} />
              </div>
              {lecture.status !== "APPROVED" ? (
                <div style={{ fontSize: 13, color: "var(--admin-ink-3)" }}>운영 중인 클래스만 수강생을 등록할 수 있어요.</div>
              ) : (
                <>
                  <form onSubmit={onSearch} style={{ display: "flex", gap: 8 }}>
                    <input
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      placeholder="닉네임 또는 이름으로 검색"
                      style={{ ...inputStyle, flex: 1, minWidth: 0 }}
                    />
                    <button type="submit" style={btnPrimary} disabled={!keyword.trim()}>
                      검색
                    </button>
                  </form>
                  {results !== null && (
                    <div style={{ marginTop: 10, display: "flex", flexDirection: "column" }}>
                      {results.length === 0 ? (
                        <div style={{ fontSize: 13, color: "var(--admin-ink-3)", padding: "8px 0" }}>검색 결과가 없어요.</div>
                      ) : (
                        results.map((u) => (
                          <UserRow
                            key={u.userId}
                            imageUrl={u.profileImageUrl ?? null}
                            nickname={u.userNickname ?? null}
                            name={u.userName ?? null}
                            sub={`#${u.userId}`}
                            right={
                              enrolledIds.has(u.userId) ? (
                                <span style={{ fontSize: 12.5, color: "var(--admin-ink-3)" }}>수강 중</span>
                              ) : (
                                <button type="button" style={btnSecondary} disabled={busy} onClick={() => onEnroll(u.userId)}>
                                  등록
                                </button>
                              )
                            }
                          />
                        ))
                      )}
                    </div>
                  )}
                </>
              )}
              {error && <div style={{ fontSize: 13, color: "var(--admin-red-ink)", marginTop: 10 }}>{error}</div>}
            </section>

            <section style={{ ...adminCardStyle, padding: 20 }}>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 8px" }}>수강생 ({students.length})</h2>
              {students.length === 0 ? (
                <div style={{ fontSize: 13, color: "var(--admin-ink-3)", padding: "8px 0" }}>등록된 수강생이 없어요.</div>
              ) : (
                students.map((s) => (
                  <UserRow
                    key={s.userId}
                    imageUrl={s.profileImageUrl}
                    nickname={s.nickname}
                    name={s.name}
                    sub={`등록 ${formatYmd(s.enrolledAt)} · 과제 ${s.submissions.length}/${weekCount}주 제출`}
                    right={
                      <button
                        type="button"
                        style={{ ...btnSecondary, color: "var(--admin-red-ink)" }}
                        disabled={busy}
                        onClick={() => onUnenroll(s)}
                      >
                        해제
                      </button>
                    }
                  />
                ))
              )}
            </section>
          </div>
        )}
      </PageShell>

      {infoOpen && lecture && <LectureDetailModal lecture={lecture} onClose={() => setInfoOpen(false)} />}
    </AdminShell>
  );
};

// 주차 1행: 제목·설명 + 트레이너가 올린 레퍼런스 영상 (my-class/weeks 와 같은 카드)
function WeekRow({ week }: { week: LectureWeekDetail }) {
  return (
    <div style={{ padding: "12px 0", borderBottom: "1px solid var(--admin-border)" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "var(--admin-blue)" }}>{week.weekNo}주차</span>
        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{week.title}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 12, color: "var(--admin-ink-3)" }}>레퍼런스 {week.references.length}개</span>
      </div>
      {week.description && (
        <div style={{ fontSize: 13, color: "var(--admin-ink-3)", marginTop: 4 }}>{week.description}</div>
      )}
      {week.references.length === 0 ? (
        <div style={{ fontSize: 12.5, color: "var(--admin-ink-3)", marginTop: 8 }}>아직 올린 영상이 없어요.</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 10 }}>
          {week.references.map((r) => (
            <div key={r.referenceId} style={{ width: 220, display: "flex", flexDirection: "column", gap: 6 }}>
              <video
                src={r.video.url}
                poster={r.video.thumbnailUrl ?? undefined}
                controls
                playsInline
                style={{ width: "100%", aspectRatio: "16 / 9", borderRadius: 10, background: "#000" }}
              />
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {r.title}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function UserRow({
  imageUrl,
  nickname,
  name,
  sub,
  right,
}: {
  imageUrl: string | null;
  nickname: string | null;
  name: string | null;
  sub: string;
  right: React.ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid var(--admin-border)" }}>
      {imageUrl ? (
        <img src={imageUrl} alt="" style={{ width: 36, height: 36, borderRadius: "50%", objectFit: "cover", flexShrink: 0 }} />
      ) : (
        <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#f3f3f6", flexShrink: 0 }} />
      )}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {nickname ?? "-"}
          {name && name !== nickname && (
            <span style={{ fontWeight: 400, color: "var(--admin-ink-3)", marginLeft: 6 }}>{name}</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: "var(--admin-ink-3)", marginTop: 2 }}>{sub}</div>
      </div>
      {right}
    </div>
  );
}

export default LectureStudentsAdminClient;
