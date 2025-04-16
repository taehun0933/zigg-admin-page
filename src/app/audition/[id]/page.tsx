"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navigation, { NavItem } from "@/components/NavigationBar";
import { useAuth } from "@/contexts/AuthContext";
import Modal from "@/components/Modal";
import { AuditionProfileType } from "@/types/audition";
import ApplicantCard from "@/components/ApplicantCard";

const mockApplicants: AuditionProfileType[] = [
  {
    id: 1,
    name: "권태훈",
    ageOrYear: "22",
    height: "190",
    weight: "135kg",
    gender: "남",
    nation: "스리랑카",
    desiredPosition: "비주얼",
    images: [
      {
        id: 1,
        url: "/profile-placeholder.png", // public 폴더에 placeholder 이미지 하나 넣어두면 됨
        width: 300,
        height: 300,
        uploadState: "PENDING",
      },
    ],
    videos: [],
    instagramId: "https://instagram.com/kwon_taehun",
    contactInfo: "010-1234-5678",
    isLiked: false,
    isScrap: false,
    userId: 1,
    auditionId: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 2,
    name: "홍길동",
    ageOrYear: "25",
    height: "178",
    weight: "70kg",
    gender: "남",
    nation: "대한민국",
    desiredPosition: "댄서",
    images: [
      {
        id: 2,
        url: "/profile-placeholder.png",
        width: 300,
        height: 300,
        uploadState: "PENDING",
      },
    ],
    videos: [],
    instagramId: "",
    contactInfo: "",
    isLiked: true,
    isScrap: false,
    userId: 2,
    auditionId: 1,
    createdAt: new Date().toISOString(),
  },
];

const AuditionDetailPage: React.FC = () => {
  const router = useRouter();
  const { setIsLoggedIn, isLoggedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/signin");
    } else {
      setIsLoading(false);
    }
  }, [isLoggedIn, router]);

  useEffect(() => {}, []);

  const handleLogout = () => {
    setIsLoggedIn(false);
    router.push("/signin");
  };

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
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navigation items={navItems} />
      <main className="max-w-7xl mx-auto px-4 pt-12 pb-24">
        {/* 섹션: 오디션 지원자 리스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            오디션 지원자 리스트
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockApplicants.map((profile) => (
              <ApplicantCard auditionProfile={profile} key={profile.id} />
            ))}
          </div>
        </section>
      </main>
    </div>
  );
};

export default AuditionDetailPage;
