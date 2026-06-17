"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import PageShell, { adminCardStyle, btnPrimary } from "@/components/admin/PageShell";
import { useAdminAuthGuard } from "@/components/admin/useAdminAuthGuard";
import { getAdminNoticeBanners, AdminNoticeBanner } from "@/apis/notice";

const formatDate = (iso?: string): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
};

const NoticePage: React.FC = () => {
  const router = useRouter();
  const ready = useAdminAuthGuard();
  const [banners, setBanners] = useState<AdminNoticeBanner[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    setLoading(true);
    setError(null);
    getAdminNoticeBanners()
      .then((list) => setBanners(list ?? []))
      .catch(() => setError("공지 배너를 불러오지 못했어요."))
      .finally(() => setLoading(false));
  }, [ready]);

  if (!ready) return null;

  return (
    <AdminShell>
      <PageShell
        eyebrow="공지사항"
        title="공지 작성 및 관리"
        subtitle="유저에게 노출되는 배너 공지를 작성·관리합니다."
        action={
          <button style={btnPrimary} onClick={() => router.push("/notice/write")}>
            + 새 공지 작성
          </button>
        }
      >
        <div className="zg-table-scroll" style={{ ...adminCardStyle }}>
          <div className="zg-table-inner">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "72px 1fr 150px 110px 92px",
              padding: "12px 22px",
              borderBottom: "1px solid var(--admin-border)",
              fontSize: 11,
              fontWeight: 700,
              color: "var(--admin-ink-3)",
              letterSpacing: 0.4,
              textTransform: "uppercase",
            }}
          >
            <span>ID</span>
            <span>배너</span>
            <span>외부 링크</span>
            <span style={{ textAlign: "right" }}>액션</span>
          </div>

          {loading && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--admin-ink-3)", fontSize: 13 }}>
              불러오는 중…
            </div>
          )}
          {!loading && error && (
            <div style={{ padding: 40, textAlign: "center", color: "#cc3333", fontSize: 13 }}>{error}</div>
          )}
          {!loading && !error && banners.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--admin-ink-3)", fontSize: 13 }}>
              등록된 공지 배너가 없습니다.
            </div>
          )}

          {!loading &&
            !error &&
            banners.map((n, i) => (
              <div
                key={n.noticeId}
                style={{
                  display: "grid",
                  gridTemplateColumns: "72px 1fr 150px 110px 92px",
                  padding: "14px 22px",
                  borderTop: i ? "1px solid var(--admin-border)" : "none",
                  alignItems: "center",
                  fontSize: 13,
                  gap: 12,
                }}
              >
                <span
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    fontWeight: 600,
                    color: "var(--admin-ink-2)",
                  }}
                >
                  #{n.noticeId}
                </span>
                <div
                  role="button"
                  tabIndex={0}
                  onClick={() => router.push(`/notice/edit/${n.noticeId}`)}
                  onKeyDown={(e) =>
                    (e.key === "Enter" || e.key === " ") &&
                    router.push(`/notice/edit/${n.noticeId}`)
                  }
                  title="편집 페이지로 이동"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    minWidth: 0,
                    cursor: "pointer",
                  }}
                >
                  <div
                    style={{
                      width: 80,
                      height: 44,
                      borderRadius: 8,
                      overflow: "hidden",
                      background: "#f3f3f6",
                      flexShrink: 0,
                    }}
                  >
                    {n.bannerImage?.imageKey && (
                      <img
                        src={n.bannerImage.imageKey}
                        alt={`notice-${n.noticeId}`}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                        loading="lazy"
                      />
                    )}
                  </div>
                  <span
                    style={{
                      fontWeight: 600,
                      color: "var(--admin-ink)",
                      textDecorationLine: "underline",
                      textDecorationColor: "transparent",
                      transition: "text-decoration-color .15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.textDecorationColor = "var(--admin-ink-3)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.textDecorationColor = "transparent")
                    }
                  >
                    배너 공지 #{n.noticeId}
                  </span>
                </div>
                <span
                  style={{
                    fontSize: 12,
                    color: n.bannerImage?.onClickUrl ? "var(--admin-blue)" : "var(--admin-ink-3)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                  title={n.bannerImage?.onClickUrl ?? ""}
                >
                  {n.bannerImage?.onClickUrl ?? "—"}
                </span>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button
                    onClick={() => router.push(`/notice/edit/${n.noticeId}`)}
                    style={{ fontSize: 12, fontWeight: 600, color: "var(--admin-blue)" }}
                  >
                    편집
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </PageShell>
    </AdminShell>
  );
};

export default NoticePage;
