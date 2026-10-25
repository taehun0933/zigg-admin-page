"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PageShell from "@/components/admin/PageShell";
import AdminIcon from "@/components/admin/AdminIcon";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import {
  EmptyState,
  LectureCard,
  LectureDetailModal,
  LectureGrid,
  SegmentTabs,
} from "@/components/admin/LectureParts";
import { Lecture, getMyLectures } from "@/apis/lecture";

// 트레이너 — 내 클래스 (상단 탭: 신청 현황 | 운영 중)
type Tab = "REQUESTS" | "RUNNING";

const MyClassPage: React.FC = () => {
  const ready = useAdminAuthGuard("TRAINER");
  const router = useRouter();
  const [data, setData] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("REQUESTS");
  const [openId, setOpenId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await getMyLectures());
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

  const requests = useMemo(
    () => data.filter((l) => l.status === "PENDING" || l.status === "REJECTED"),
    [data]
  );
  const running = useMemo(
    () =>
      data
        .filter((l) => l.status === "APPROVED" || l.status === "CLOSED")
        .sort((a, b) => (a.status === b.status ? 0 : a.status === "APPROVED" ? -1 : 1)),
    [data]
  );
  const list = tab === "REQUESTS" ? requests : running;
  const open = data.find((l) => l.lectureId === openId) ?? null;

  if (!ready) return null;

  return (
    <AdminShell>
      <PageShell
        eyebrow="내 클래스"
        title={tab === "REQUESTS" ? "신청 현황" : "운영 중인 클래스"}
        subtitle={
          tab === "REQUESTS"
            ? "관리자 승인 후 앱에 노출돼요. 반려된 클래스는 수정해서 다시 신청할 수 있어요."
            : "시즌제 클래스는 종료일이 지나면 자동으로 마감돼요."
        }
        action={
          <button
            type="button"
            onClick={() => router.push("/my-class/apply")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 38,
              padding: "0 16px",
              borderRadius: 9,
              background: "var(--admin-blue)",
              color: "#fff",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            <AdminIcon name="plusCircle_white" size={16} />
            클래스 신청
          </button>
        }
      >
        <div style={{ marginBottom: 18 }}>
          <SegmentTabs<Tab>
            tabs={[
              { id: "REQUESTS", label: "신청 현황", count: requests.length },
              { id: "RUNNING", label: "운영 중", count: running.length },
            ]}
            value={tab}
            onChange={setTab}
          />
        </div>

        {loading ? (
          <EmptyState>불러오는 중…</EmptyState>
        ) : list.length === 0 ? (
          <EmptyState>
            {tab === "REQUESTS"
              ? "신청한 클래스가 없어요. 오른쪽 위 [클래스 신청]으로 시작해보세요."
              : "운영 중인 클래스가 없어요."}
          </EmptyState>
        ) : (
          <LectureGrid>
            {list.map((l) => (
              <LectureCard
                key={l.lectureId}
                lecture={l}
                onOpen={() => setOpenId(l.lectureId)}
                footer={
                  l.status === "REJECTED" || l.status === "PENDING" ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/my-class/apply?id=${l.lectureId}`);
                      }}
                      style={{
                        width: "100%",
                        height: 34,
                        borderRadius: 8,
                        border: "1px solid var(--admin-border)",
                        background: l.status === "REJECTED" ? "var(--admin-blue)" : "#fff",
                        color: l.status === "REJECTED" ? "#fff" : "var(--admin-ink-2)",
                        fontWeight: 600,
                        fontSize: 12.5,
                      }}
                    >
                      {l.status === "REJECTED" ? "수정 후 재신청" : "신청 내용 수정"}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/my-class/weeks?id=${l.lectureId}`);
                      }}
                      style={{
                        width: "100%",
                        height: 34,
                        borderRadius: 8,
                        border: "1px solid var(--admin-border)",
                        background: "#fff",
                        color: "var(--admin-ink-2)",
                        fontWeight: 600,
                        fontSize: 12.5,
                      }}
                    >
                      주차별 레퍼런스 관리
                    </button>
                  )
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

export default MyClassPage;
