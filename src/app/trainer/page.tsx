"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import PageShell from "@/components/admin/PageShell";
import AdminIcon from "@/components/admin/AdminIcon";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import TrainerDetailModal, {
  StatusChip,
} from "@/components/admin/TrainerDetailModal";
import {
  TrainerApplication,
  TrainerApplicationStatus,
  approveTrainerApplication,
  getTrainerApplications,
  rejectTrainerApplication,
} from "@/apis/trainer";

// 백엔드(trainer 모듈) 미배포 환경에서 UI 확인용 데모 데이터.
// 실서버 배포 후 DEMO_FALLBACK = false 로.
const DEMO_FALLBACK = false;
const DEMO_SEED: TrainerApplication[] = [
  { trainerApplicationId: 1, userId: 101, email: "trainer_yujin@zigg.com", status: "PENDING", rejectReason: null, profileImageUrls: [], createAt: "2026-06-15T18:22:00" },
  { trainerApplicationId: 2, userId: 102, email: "dance_minho@zigg.com", status: "PENDING", rejectReason: null, profileImageUrls: [], createAt: "2026-06-15T14:05:00" },
  { trainerApplicationId: 3, userId: 103, email: "vocal_seoyeon@zigg.com", status: "PENDING", rejectReason: null, profileImageUrls: [], createAt: "2026-06-14T21:40:00" },
  { trainerApplicationId: 4, userId: 104, email: "move_dahyun@zigg.com", status: "APPROVED", rejectReason: null, profileImageUrls: [], createAt: "2026-06-12T16:30:00" },
  { trainerApplicationId: 5, userId: 105, email: "trainer_sora@zigg.com", status: "REJECTED", rejectReason: "프로필 정보 보완 필요", profileImageUrls: [], createAt: "2026-06-08T22:14:00" },
];

const formatYmdHm = (iso: string) => {
  try {
    const parts = new Intl.DateTimeFormat("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date(iso));
    const get = (t: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === t)?.value ?? "";
    return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
  } catch {
    return iso;
  }
};

type Tab = TrainerApplicationStatus | "ALL";
const TABS: { id: Tab; label: string }[] = [
  { id: "PENDING", label: "대기" },
  { id: "APPROVED", label: "승인" },
  { id: "REJECTED", label: "거절" },
  { id: "ALL", label: "전체" },
];

const TrainerPage: React.FC = () => {
  const ready = useAdminAuthGuard();
  const [data, setData] = useState<TrainerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [usingDemo, setUsingDemo] = useState(false);
  const [tab, setTab] = useState<Tab>("PENDING");
  const [openId, setOpenId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await getTrainerApplications();
      setData(list);
      setUsingDemo(false);
    } catch (err) {
      if (DEMO_FALLBACK) {
        console.warn("[trainer] API 미연결, 데모 데이터 사용:", err);
        setData(DEMO_SEED);
        setUsingDemo(true);
      } else {
        setData([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready) load();
  }, [ready, load]);

  const counts = useMemo(
    () => ({
      ALL: data.length,
      PENDING: data.filter((t) => t.status === "PENDING").length,
      APPROVED: data.filter((t) => t.status === "APPROVED").length,
      REJECTED: data.filter((t) => t.status === "REJECTED").length,
    }),
    [data]
  );
  const list = data.filter((t) => (tab === "ALL" ? true : t.status === tab));
  const open = data.find((t) => t.trainerApplicationId === openId) ?? null;

  const decide = async (
    id: number,
    action: "APPROVED" | "REJECTED",
    reason?: string
  ) => {
    setBusy(true);
    try {
      if (!usingDemo) {
        if (action === "APPROVED") await approveTrainerApplication(id);
        else await rejectTrainerApplication(id, reason);
      }
      setData((d) =>
        d.map((t) =>
          t.trainerApplicationId === id
            ? { ...t, status: action, rejectReason: reason ?? null }
            : t
        )
      );
      setOpenId(null);
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
        eyebrow="트레이너 관리"
        title="트레이너 발급 신청"
        subtitle={
          <>
            <strong style={{ color: "var(--admin-ink)" }}>
              {counts.PENDING}건
            </strong>{" "}
            승인 대기 중 · 승인 시 트레이너 권한으로 관리자 페이지를 열람할 수
            있어요.
          </>
        }
      >
        {usingDemo && (
          <div
            style={{
              marginBottom: 16,
              padding: "10px 14px",
              borderRadius: 10,
              background: "var(--admin-warn-tint)",
              color: "#b06a00",
              fontSize: 12.5,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span
              style={{
                width: 7,
                height: 7,
                borderRadius: "50%",
                background: "var(--admin-warn)",
              }}
            />
            데모 데이터 — 백엔드 trainer API 미배포 상태입니다. (배포 후 실제
            신청 목록이 표시됩니다)
          </div>
        )}

        {/* filter tabs */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginBottom: 18,
          }}
        >
          <div
            style={{
              display: "inline-flex",
              gap: 4,
              padding: 3,
              background: "#f3f3f6",
              borderRadius: 9,
            }}
          >
            {TABS.map((o) => {
              const activeTab = tab === o.id;
              return (
                <button
                  key={o.id}
                  type="button"
                  onClick={() => setTab(o.id)}
                  style={{
                    height: 32,
                    padding: "0 14px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: 600,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 7,
                    border: "none",
                    cursor: "pointer",
                    background: activeTab ? "#fff" : "transparent",
                    color: activeTab
                      ? "var(--admin-ink)"
                      : "var(--admin-ink-2)",
                    boxShadow: activeTab ? "0 1px 2px rgba(0,0,0,.06)" : "none",
                  }}
                >
                  {o.label}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      fontVariantNumeric: "tabular-nums",
                      padding: "1px 7px",
                      borderRadius: 999,
                      background: activeTab
                        ? o.id === "PENDING"
                          ? "var(--admin-warn-tint)"
                          : o.id === "APPROVED"
                          ? "var(--admin-good-tint)"
                          : "#eceef2"
                        : "#e7e8ee",
                      color: activeTab
                        ? o.id === "PENDING"
                          ? "#b06a00"
                          : o.id === "APPROVED"
                          ? "#1f8a52"
                          : "var(--admin-ink-2)"
                        : "var(--admin-ink-3)",
                    }}
                  >
                    {counts[o.id]}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 12, color: "var(--admin-ink-2)" }}>
            <strong style={{ color: "var(--admin-ink)" }}>{list.length}</strong>{" "}
            명 표시
          </span>
        </div>

        {/* grid */}
        {loading ? (
          <div
            style={{
              padding: 80,
              textAlign: "center",
              color: "var(--admin-ink-3)",
              fontSize: 13,
            }}
          >
            불러오는 중…
          </div>
        ) : list.length === 0 ? (
          <div
            style={{
              padding: 80,
              textAlign: "center",
              color: "var(--admin-ink-3)",
              fontSize: 13,
            }}
          >
            해당 상태의 신청이 없어요.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 14,
            }}
          >
            {list.map((t) => (
              <TrainerCard
                key={t.trainerApplicationId}
                application={t}
                date={formatYmdHm(t.createAt)}
                onOpen={() => setOpenId(t.trainerApplicationId)}
              />
            ))}
          </div>
        )}
      </PageShell>

      {open && (
        <TrainerDetailModal
          application={open}
          formatDate={formatYmdHm}
          busy={busy}
          onClose={() => setOpenId(null)}
          onApprove={() => decide(open.trainerApplicationId, "APPROVED")}
          onReject={() =>
            decide(
              open.trainerApplicationId,
              "REJECTED",
              window.prompt("반려 사유 (선택)") ?? undefined
            )
          }
        />
      )}
    </AdminShell>
  );
};

function TrainerCard({
  application,
  date,
  onOpen,
}: {
  application: TrainerApplication;
  date: string;
  onOpen: () => void;
}) {
  const cover = application.profileImageUrls?.[0];
  const photoCount = application.profileImageUrls?.length ?? 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      style={{
        textAlign: "left",
        background: "#fff",
        border: "1px solid var(--admin-border)",
        borderRadius: 16,
        padding: 12,
        display: "flex",
        flexDirection: "column",
        gap: 11,
        boxShadow: "0 4px 12px rgba(0,0,0,.04)",
        cursor: "pointer",
        transition: "border-color .15s, box-shadow .15s, transform .15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#d0d0d8";
        e.currentTarget.style.boxShadow = "0 8px 20px rgba(0,0,0,.07)";
        e.currentTarget.style.transform = "translateY(-2px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--admin-border)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,.04)";
        e.currentTarget.style.transform = "none";
      }}
    >
      <div
        style={{
          width: "100%",
          aspectRatio: "1 / 1",
          borderRadius: 11,
          position: "relative",
          overflow: "hidden",
          background: "#eceef2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {cover ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={cover}
            alt=""
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <AdminIcon name="person" size={34} opacity={0.4} />
        )}
        <span style={{ position: "absolute", top: 8, right: 8 }}>
          <StatusChip status={application.status} />
        </span>
        {photoCount > 0 && (
          <span
            style={{
              position: "absolute",
              bottom: 8,
              right: 8,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10.5,
              fontWeight: 700,
              color: "#fff",
              background: "rgba(0,0,0,.5)",
              padding: "3px 8px",
              borderRadius: 999,
            }}
          >
            <AdminIcon name="camera" size={11} /> {photoCount}
          </span>
        )}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 4,
          padding: "0 2px 2px",
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: -0.3,
            color: "var(--admin-ink)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {application.email ?? `#${application.userId}`}
        </div>
        <div
          style={{
            fontSize: 12,
            color: "var(--admin-ink-3)",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          신청일 {date}
        </div>
      </div>
    </button>
  );
}

export default TrainerPage;
