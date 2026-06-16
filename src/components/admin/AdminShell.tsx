"use client";

import React, { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import AdminIcon from "./AdminIcon";
import ServerToggle from "./ServerToggle";
import { useUnansweredInquiryCount } from "./useUnansweredInquiryCount";

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
  const unansweredCount = useUnansweredInquiryCount();

  useEffect(() => {
    const stored = localStorage.getItem(SIDEBAR_KEY);
    if (stored === "1") setCollapsed(true);
  }, []);

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

  const w = collapsed ? "var(--admin-sidebar-collapsed)" : "var(--admin-sidebar-w)";

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "grid",
        gridTemplateColumns: `${w} 1fr`,
        transition: "grid-template-columns .25s ease",
        background: "var(--admin-bg)",
      }}
    >
      <aside
        style={{
          background: "#fff",
          borderRight: "1px solid var(--admin-border)",
          position: "sticky",
          top: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
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
            padding: collapsed ? 0 : "0 18px",
            justifyContent: collapsed ? "center" : "flex-start",
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
          {!collapsed && (
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
          {!collapsed && (
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
            return (
              <button
                key={item.id}
                onClick={() => router.push(item.path)}
                title={collapsed ? item.label : ""}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: collapsed ? "12px 0" : "11px 12px",
                  borderRadius: 10,
                  justifyContent: collapsed ? "center" : "flex-start",
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
                {active && !collapsed && (
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
                  {item.id === "voices" && unansweredCount > 0 && collapsed && (
                    <span
                      title={`미응답 ${unansweredCount}건`}
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
                      {unansweredCount > 99 ? "99+" : unansweredCount}
                    </span>
                  )}
                </span>
                {!collapsed && (
                  <>
                    <span>{item.label}</span>
                    {item.id === "voices" && unansweredCount > 0 && (
                      <span
                        title={`미응답 ${unansweredCount}건`}
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
                        {unansweredCount > 99 ? "99+" : unansweredCount}
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer (user info only — logout moved to topbar) */}
        {!collapsed && (
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
            padding: "0 24px",
            gap: 16,
            position: "sticky",
            top: 0,
            zIndex: 20,
          }}
        >
          <button
            onClick={toggleCollapsed}
            title="메뉴 접기"
            style={{
              width: 36,
              height: 36,
              borderRadius: 8,
              display: "grid",
              placeItems: "center",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "#f4f5f8")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
          >
            <AdminIcon name="hamburger" size={18} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14 }}>
            <span style={{ color: "var(--admin-ink-3)" }}>운영</span>
            <span style={{ color: "var(--admin-ink-3)" }}>›</span>
            <span style={{ fontWeight: 600 }}>{current.label}</span>
          </div>

          <div style={{ flex: 1 }} />

          <ServerToggle />

          <button
            onClick={handleLogout}
            title="로그아웃"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              height: 34,
              padding: "0 12px",
              borderRadius: 8,
              border: "1px solid var(--admin-border)",
              background: "#fff",
              color: "var(--admin-ink-2)",
              fontWeight: 600,
              fontSize: 13,
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
            로그아웃
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
