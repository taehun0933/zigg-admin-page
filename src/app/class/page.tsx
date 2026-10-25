"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PageShell from "@/components/admin/PageShell";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import {
  EmptyState,
  LectureCard,
  LectureDetailModal,
  LectureGrid,
  SegmentTabs,
} from "@/components/admin/LectureParts";
import { Lecture, getLectures } from "@/apis/lecture";

// 관리자 — 클래스 관리 (상단 탭: 클래스 관리 | 클래스 신청 관리) + 트레이너별 필터
type Tab = "REQUESTS" | "LECTURES";
const ALL_TRAINERS = "ALL";

const ClassPage: React.FC = () => {
  const ready = useAdminAuthGuard();
  const router = useRouter();
  const [data, setData] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("LECTURES");
  const [trainer, setTrainer] = useState<string>(ALL_TRAINERS); // trainerId
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getLectures());
    } catch (err) {
      console.error(err);
      setData([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  // 트레이너 목록 (클래스 수 많은 순)
  const trainers = useMemo(() => {
    const byId = new Map<number, { id: number; label: string; count: number }>();
    data.forEach((l) => {
      const t = byId.get(l.trainerId) ?? { id: l.trainerId, label: l.trainerEmail ?? `트레이너 #${l.trainerId}`, count: 0 };
      t.count += 1;
      byId.set(l.trainerId, t);
    });
    return Array.from(byId.values()).sort((a, b) => b.count - a.count);
  }, [data]);
  const filtered = useMemo(
    () => (trainer === ALL_TRAINERS ? data : data.filter((l) => String(l.trainerId) === trainer)),
    [data, trainer]
  );

  const requests = useMemo(() => filtered.filter((l) => l.status === "PENDING"), [filtered]);
  // 운영 중 → 마감 순
  const lectures = useMemo(
    () =>
      filtered
        .filter((l) => l.status === "APPROVED" || l.status === "CLOSED")
        .sort((a, b) => (a.status === b.status ? 0 : a.status === "APPROVED" ? -1 : 1)),
    [filtered]
  );
  const list = tab === "REQUESTS" ? requests : lectures;
  const open = data.find((l) => l.lectureId === openId) ?? null;

  if (!ready) return null;

  return (
    <AdminShell>
      <PageShell
        eyebrow="클래스 관리"
        title={tab === "REQUESTS" ? "클래스 신청 관리" : "클래스 관리"}
        subtitle={
          tab === "REQUESTS" ? (
            <>
              <strong style={{ color: "var(--admin-ink)" }}>{requests.length}건</strong> 승인 대기 중 ·
              신청서를 열어 수강료·기간·노출 이미지와 영상을 확정한 뒤 공개해요.
            </>
          ) : (
            "공개된 클래스 목록이에요. 시즌제는 종료일이 지나면 자동으로 마감돼요."
          )
        }
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <SegmentTabs<Tab>
            tabs={[
              { id: "LECTURES", label: "클래스 관리", count: lectures.length },
              { id: "REQUESTS", label: "클래스 신청 관리", count: requests.length },
            ]}
            value={tab}
            onChange={setTab}
          />
          <select
            value={trainer}
            onChange={(e) => setTrainer(e.target.value)}
            aria-label="트레이너별 보기"
            style={{
              height: 36,
              padding: "0 10px",
              borderRadius: 9,
              border: "1px solid var(--admin-border)",
              background: "#fff",
              fontSize: 13,
              color: "var(--admin-ink-2)",
              maxWidth: "100%",
            }}
          >
            <option value={ALL_TRAINERS}>전체 트레이너 ({data.length})</option>
            {trainers.map((t) => (
              <option key={t.id} value={String(t.id)}>
                {t.label} ({t.count})
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <EmptyState>불러오는 중…</EmptyState>
        ) : list.length === 0 ? (
          <EmptyState>
            {tab === "REQUESTS" ? "승인 대기 중인 신청이 없어요." : "운영 중인 클래스가 없어요."}
          </EmptyState>
        ) : (
          <LectureGrid>
            {list.map((l) => (
              <LectureCard
                key={l.lectureId}
                lecture={l}
                onOpen={() =>
                  tab === "REQUESTS"
                    ? router.push(`/class/review?id=${l.lectureId}`)
                    : setOpenId(l.lectureId)
                }
              />
            ))}
          </LectureGrid>
        )}
      </PageShell>

      {open && <LectureDetailModal lecture={open} onClose={() => setOpenId(null)} />}
    </AdminShell>
  );
};

export default ClassPage;
