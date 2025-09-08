"use client";

// pages/DashboardPage.tsx
import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Navigation from "@/components/NavigationBar";
import Header from "@/components/Header";
import DashboardCard from "@/components/DashboardCard"; // DashboardCard 임포트
import { useAuth } from "@/contexts/AuthContext";
import { navigationItems } from "@/utils/navigation";

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

  const handleLogout = () => {
    setIsLoggedIn(false);
    router.push("/signin");
  };

  // Navigation에 전달할 항목 배열 (공통 유틸리티 사용)
  const navItems = navigationItems(router, handleLogout);

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
          title="오디션 관리"
          description="새로운 오디션을 생성하고, 진행 중인 오디션의 지원자 정보를 조회해 보세요."
          onClick={() => router.push("/audition")}
        />
        <DashboardCard
          title="공지사항"
          description="ZIGG의 공지사항을 작성해 보세요. 현재는 작업 중인 기능입니다."
          onClick={() => router.push("/notice")}
        />
        <DashboardCard
          title="게시판 관리"
          description="게시판의 카테고리별 최상단 공지를 작성해보세요."
          onClick={() => router.push("/board")}
        />
      </main>
    </div>
  );
}
