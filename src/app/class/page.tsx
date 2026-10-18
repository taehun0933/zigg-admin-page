"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageShell, { btnPrimary, btnSecondary } from "@/components/admin/PageShell";
import Modal from "@/components/Modal";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import {
  EmptyState,
  LectureCard,
  LectureDetailModal,
  LectureGrid,
  SegmentTabs,
} from "@/components/admin/LectureParts";
import { Lecture, approveLecture, getLectures, rejectLecture } from "@/apis/lecture";

// 관리자 — 클래스 관리 (상단 탭: 클래스 신청 관리 | 클래스 관리)
type Tab = "REQUESTS" | "LECTURES";

const ClassPage: React.FC = () => {
  const ready = useAdminAuthGuard();
  const [data, setData] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("REQUESTS");
  const [openId, setOpenId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  // 반려 사유 입력 모달
  const [rejectTarget, setRejectTarget] = useState<Lecture | null>(null);
  const [rejectReason, setRejectReason] = useState("");

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

  const requests = useMemo(() => data.filter((l) => l.status === "PENDING"), [data]);
  // 운영 중 → 마감 순
  const lectures = useMemo(
    () =>
      data
        .filter((l) => l.status === "APPROVED" || l.status === "CLOSED")
        .sort((a, b) => (a.status === b.status ? 0 : a.status === "APPROVED" ? -1 : 1)),
    [data]
  );
  const list = tab === "REQUESTS" ? requests : lectures;
  const open = data.find((l) => l.lectureId === openId) ?? null;

  const openReject = (lecture: Lecture) => {
    setOpenId(null);
    setRejectReason("");
    setRejectTarget(lecture);
  };

  const decide = async (id: number, action: "APPROVED" | "REJECTED", reason?: string) => {
    setBusy(true);
    try {
      const updated =
        action === "APPROVED" ? await approveLecture(id) : await rejectLecture(id, reason);
      setData((d) => d.map((l) => (l.lectureId === id ? updated : l)));
      setOpenId(null);
      setRejectTarget(null);
    } catch (err) {
      console.error(err);
      alert("처리에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setBusy(false);
    }
  };

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
              승인하면 앱에 바로 노출되고, 승인·반려 결과는 트레이너에게 메일로 안내돼요.
            </>
          ) : (
            "승인된 클래스 목록이에요. 시즌제는 종료일이 지나면 자동으로 마감돼요."
          )
        }
      >
        <div style={{ marginBottom: 18 }}>
          <SegmentTabs<Tab>
            tabs={[
              { id: "REQUESTS", label: "클래스 신청 관리", count: requests.length },
              { id: "LECTURES", label: "클래스 관리", count: lectures.length },
            ]}
            value={tab}
            onChange={setTab}
          />
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
              <LectureCard key={l.lectureId} lecture={l} onOpen={() => setOpenId(l.lectureId)} />
            ))}
          </LectureGrid>
        )}
      </PageShell>

      {open && (
        <LectureDetailModal
          lecture={open}
          busy={busy}
          onClose={() => setOpenId(null)}
          onApprove={() => decide(open.lectureId, "APPROVED")}
          onReject={() => openReject(open)}
        />
      )}

      {rejectTarget && (
        <Modal
          isOpen={Boolean(rejectTarget)}
          onClose={() => !busy && setRejectTarget(null)}
          title="클래스 반려"
          sizeMode="SMALL"
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ fontSize: 13, color: "var(--admin-ink-2)", lineHeight: 1.6 }}>
              <strong>{rejectTarget.title}</strong> 클래스 신청을{" "}
              <strong style={{ color: "var(--admin-red-ink)" }}>반려</strong>합니다. 입력한 사유는
              트레이너에게 메일로 전달되고, 트레이너는 수정 후 다시 신청할 수 있어요.
            </div>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={4}
              maxLength={255}
              placeholder="반려 사유를 입력하세요. (선택)"
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
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button style={btnSecondary} onClick={() => setRejectTarget(null)} disabled={busy}>
                취소
              </button>
              <button
                style={{ ...btnPrimary, background: "var(--admin-red)", opacity: busy ? 0.6 : 1 }}
                onClick={() =>
                  decide(rejectTarget.lectureId, "REJECTED", rejectReason.trim() || undefined)
                }
                disabled={busy}
              >
                {busy ? "처리 중…" : "반려하기"}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </AdminShell>
  );
};

export default ClassPage;
