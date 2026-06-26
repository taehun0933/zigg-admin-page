"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AdminIcon from "./AdminIcon";
import ServerToggle from "./ServerToggle";
import { useUnansweredInquiryCount } from "./useUnansweredInquiryCount";
import { usePendingTrainerCount } from "./usePendingTrainerCount";
import { useIsMobile } from "./useIsMobile";

interface NavItem {
  id: string;
  label: string;
  icon: string;
  /** RN 디자인시스템에 _activated 변형이 있는 아이콘만 사용 */
  activeIcon?: string;
  path: string;
}

const NAV: NavItem[] = [
  { id: "dashboard", label: "대시보드", icon: "home", activeIcon: "home_activated", path: "/dashboard" },
  { id: "auditions", label: "오디션 관리", icon: "star", path: "/audition" },
  { id: "boards", label: "게시판 관리", icon: "community", activeIcon: "community_activated", path: "/board" },
  { id: "notices", label: "공지사항", icon: "speaker", activeIcon: "speaker_activated", path: "/notice" },
  { id: "notify", label: "알림 발송", icon: "bell", path: "/notification" },
  { id: "tickets", label: "티켓 수동 지급", icon: "ticket", path: "/ticket" },
  { id: "voices", label: "고객 목소리함", icon: "mail", path: "/customerInquiry" },
  { id: "trainers", label: "트레이너 관리", icon: "people", path: "/trainer" },
  { id: "finance", label: "비용 관리", icon: "wallet", path: "/finance" },
];

const SIDEBAR_KEY = "admin_sidebar_collapsed";

interface AdminShellProps {
  children: React.ReactNode;
}

const AdminShell: React.FC<AdminShellProps> = ({ children }) => {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { setIsLoggedIn } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const unansweredCount = useUnansweredInquiryCount();
  const trainerPendingCount = usePendingTrainerCount();

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);

  // 라우트 이동 시 모바일 드로어 닫기
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // 데스크탑 복귀 시 드로어 상태 정리
  useEffect(() => {
    if (!isMobile) setDrawerOpen(false);
  }, [isMobile]);

  const toggleCollapsed = () => {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {}
      return next;
    });
  };

  const handleLogout = () => {
    localStorage.removeItem("token");
    setIsLoggedIn(false);
    router.push("/signin");
  };

  const current =
    NAV.find((n) => pathname === n.path || pathname.startsWith(n.path + "/")) ?? NAV[0];

  // 모바일에서는 드로어로 동작하므로 항상 펼친(레이블 보이는) 상태로 렌더
  const sidebarCollapsed = collapsed && !isMobile;
  const w = collapsed ? "var(--admin-sidebar-collapsed)" : "var(--admin-sidebar-w)";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: isMobile ? "1fr" : `${w} 1fr`,
        transition: "grid-template-columns .25s ease",
        background: "var(--admin-bg)",
      }}
    >
      {/* 모바일 드로어 백드롭 */}
      {isMobile && drawerOpen && (
        <div
          onClick={() => setDrawerOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            background: "rgba(0,0,0,.4)",
          }}
        />
      )}
      <aside
        style={{
          background: "#fff",
          borderRight: "1px solid var(--admin-border)",
          display: "flex",
          flexDirection: "column",
          ...(isMobile
            ? {
                position: "fixed",
                top: 0,
                left: 0,
                width: "var(--admin-sidebar-w)",
                maxWidth: "82vw",
                height: "100vh",
                zIndex: 50,
                transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
                transition: "transform .25s ease",
                boxShadow: drawerOpen ? "0 0 40px rgba(0,0,0,.18)" : "none",
              }
            : {
                position: "sticky",
                top: 0,
                height: "100vh",
              }),
        }}
      >
        {/* Logo (click → dashboard) */}
        <button
          type="button"
          onClick={() => router.push("/dashboard")}
          title="대시보드로 이동"
          style={{
            height: "var(--admin-topbar-h)",
            display: "flex",
            alignItems: "center",
            padding: sidebarCollapsed ? 0 : "0 18px",
            justifyContent: sidebarCollapsed ? "center" : "flex-start",
            gap: 10,
            borderBottom: "1px solid var(--admin-border)",
            background: "transparent",
            textAlign: "left",
            width: "100%",
            transition: "background .15s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f5f8")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
        >
          <img
            src="/zigg-logo.png"
            alt="ZIGG"
            width={32}
            height={32}
            style={{
              width: 32,
              height: 32,
              borderRadius: 9,
              objectFit: "cover",
              boxShadow: "0 1px 2px rgba(0,0,0,.08)",
              flexShrink: 0,
            }}
          />
          {!sidebarCollapsed && (
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.15 }}>
              <span style={{ fontWeight: 700, fontSize: 14, color: "var(--admin-ink)" }}>
                ZIGG Admin
              </span>
              <span
                style={{ fontSize: 11, color: "var(--admin-ink-3)", fontWeight: 500 }}
              >
                X GODITION
              </span>
            </div>
          )}
        </button>

        {/* Nav */}
        <nav
          style={{
            padding: "14px 10px",
            display: "flex",
            flexDirection: "column",
            gap: 2,
            flex: 1,
            overflowY: "auto",
          }}
        >
          {!sidebarCollapsed && (
            <div
              style={{
                padding: "6px 12px",
                fontSize: 11,
                color: "var(--admin-ink-3)",
                fontWeight: 600,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              운영 메뉴
            </div>
          )}
          {NAV.map((item) => {
            const active = item.id === current.id;
            const badgeCount =
              item.id === "voices"
                ? unansweredCount
                : item.id === "trainers"
                ? trainerPendingCount
                : 0;
            const badgeTitle =
              item.id === "trainers" ? `승인 대기 ${badgeCount}건` : `미응답 ${badgeCount}건`;
            return (
              <button
                key={item.id}
                onClick={() => router.push(item.path)}
                title={sidebarCollapsed ? item.label : ""}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: sidebarCollapsed ? "12px 0" : "11px 12px",
                  borderRadius: 10,
                  justifyContent: sidebarCollapsed ? "center" : "flex-start",
                  background: active ? "var(--admin-blue-tint)" : "transparent",
                  color: active ? "var(--admin-blue)" : "var(--admin-ink)",
                  fontWeight: active ? 600 : 500,
                  fontSize: 14,
                  position: "relative",
                  transition: "background .15s",
                }}
                onMouseEnter={(e) => {
                  if (!active) e.currentTarget.style.background = "#f4f5f8";
                }}
                onMouseLeave={(e) => {
                  if (!active) e.currentTarget.style.background = "transparent";
                }}
              >
                {active && !sidebarCollapsed && (
                  <span
                    style={{
                      position: "absolute",
                      left: -10,
                      top: 8,
                      bottom: 8,
                      width: 3,
                      borderRadius: 4,
                      background: "var(--admin-blue)",
                    }}
                  />
                )}
                <span style={{ position: "relative", display: "grid", placeItems: "center" }}>
                  <AdminIcon
                    name={active && item.activeIcon ? item.activeIcon : item.icon}
                    size={20}
                    opacity={active ? 1 : 0.7}
                  />
                  {badgeCount > 0 && sidebarCollapsed && (
                    <span
                      title={badgeTitle}
                      style={{
                        position: "absolute",
                        top: -3,
                        right: -4,
                        minWidth: 14,
                        height: 14,
                        padding: "0 4px",
                        borderRadius: 999,
                        background: "#ff453a",
                        color: "#fff",
                        fontSize: 9,
                        fontWeight: 700,
                        display: "grid",
                        placeItems: "center",
                        border: "1.5px solid #fff",
                        fontVariantNumeric: "tabular-nums",
                        lineHeight: 1,
                      }}
                    >
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </span>
                {!sidebarCollapsed && (
                  <>
                    <span>{item.label}</span>
                    {badgeCount > 0 && (
                      <span
                        title={badgeTitle}
                        style={{
                          marginLeft: "auto",
                          minWidth: 20,
                          height: 18,
                          padding: "0 6px",
                          borderRadius: 999,
                          background: "#ff453a",
                          color: "#fff",
                          fontSize: 11,
                          fontWeight: 700,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontVariantNumeric: "tabular-nums",
                          lineHeight: 1,
                        }}
                      >
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer (user info only — logout moved to topbar) */}
        {!sidebarCollapsed && (
          <div
            style={{
              borderTop: "1px solid var(--admin-border)",
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: "#e8e8ee",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: 600,
                fontSize: 12,
              }}
            >
              AD
            </div>
            <div style={{ display: "flex", flexDirection: "column", lineHeight: 1.2 }}>
              <span style={{ fontSize: 13, fontWeight: 600 }}>관리자</span>
              <span style={{ fontSize: 11, color: "var(--admin-ink-3)" }}>
                godition@naver.com
              </span>
            </div>
          </div>
        )}
      </aside>

      <div style={{ minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header
          style={{
            height: "var(--admin-topbar-h)",
            background: "#fff",
            borderBottom: "1px solid var(--admin-border)",
            display: "flex",
            alignItems: "center",
            padding: isMobile ? "0 12px" : "0 24px",
            gap: isMobile ? 8 : 16,
            position: "sticky",
            top: 0,
            zIndex: 20,
          }}
        >
          <button
            onClick={isMobile ? () => setDrawerOpen(true) : toggleCollapsed}
            title={isMobile ? "메뉴 열기" : "메뉴 접기"}
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f5f8")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <AdminIcon name="hamburger" size={18} />
          </button>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 14,
              minWidth: 0,
              overflow: "hidden",
            }}
          >
            {!isMobile && (
              <>
                <span style={{ color: "var(--admin-ink-3)" }}>운영</span>
                <span style={{ color: "var(--admin-ink-3)" }}>›</span>
              </>
            )}
            <span
              style={{
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {current.label}
            </span>
          </div>

          <div style={{ flex: 1 }} />

          <ServerToggle compact={isMobile} />

          <button
            onClick={handleLogout}
            title="로그아웃"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 34,
              padding: isMobile ? "0 9px" : "0 12px",
              borderRadius: 8,
              border: "1px solid var(--admin-border)",
              background: "#fff",
              color: "var(--admin-ink-2)",
              fontWeight: 600,
              fontSize: 13,
              flexShrink: 0,
              transition: "background .15s, border-color .15s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#f4f5f8";
              e.currentTarget.style.borderColor = "#d0d0d8";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#fff";
              e.currentTarget.style.borderColor = "var(--admin-border)";
            }}
          >
            <AdminIcon name="logout" size={16} />
            {!isMobile && "로그아웃"}
          </button>
        </header>

        <main
          style={{ minHeight: "calc(100vh - var(--admin-topbar-h))", minWidth: 0 }}
        >
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminShell;
