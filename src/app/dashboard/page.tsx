"use client";

// pages/DashboardPage.tsx
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navigation, { NavItem } from "@/components/NavigationBar";
import Header from "@/components/Header";
import DashboardCard from "@/components/DashboardCard"; // DashboardCard 임포트
import { useAuth } from "@/contexts/AuthContext";

export default function DashboardPage() {
  const router = useRouter();
  const { setIsLoggedIn, isLoggedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/signin");
    } else {
      setIsLoading(false);
    }
  }, [isLoggedIn, router]);

  // 로그아웃 핸들러: 로그아웃 시 상태를 false로 업데이트합니다.
  const handleLogout = () => {
    setIsLoggedIn(false);
    router.push("/signin");
  };

  // Navigation에 전달할 항목 배열 (절대경로 사용)
  const navItems: NavItem[] = [
    {
      label: "오디션 관리",
      onClick: () => router.push("/audition"),
    },
    {
      label: "공지사항 관리",
      onClick: () => router.push("/announcement"),
    },
    {
      label: "로그아웃",
      onClick: handleLogout,
    },
  ];

  if (isLoading) {
    return null; // 로딩 중이거나 로그인되지 않은 경우 아무것도 표시하지 않음
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navigation items={navItems} />
      <Header
        title="관리자 대시보드"
        subTitle="모든 관리자 기능을 확인할 수 있는 곳입니다."
      />

      {/* 메인 콘텐츠: DashboardCard를 사용하여 카드 전체 클릭 시 해당 페이지로 이동 */}
      <main className="max-w-6xl mx-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-8 pt-12">
        <DashboardCard
          title="오디션 현황"
          description="최신 오디션 정보와 진행 중인 일정을 확인하세요. 다가오는 오디션 이벤트 및 지원 현황도 함께 제공합니다."
          onClick={() => router.push("/audition")}
        />
        <DashboardCard
          title="공지사항"
          description="최신 업데이트, 중요한 공지 및 시스템 변경 사항을 확인하세요. 모든 관리자에게 필요한 정보가 담겨 있습니다."
          onClick={() => router.push("/announcement")}
        />
      </main>
    </div>
  );
}
