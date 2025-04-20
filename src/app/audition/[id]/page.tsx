"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Navigation, { NavItem } from "@/components/NavigationBar";
import { useAuth } from "@/contexts/AuthContext";
import Modal from "@/components/Modal";
import { AuditionProfileType } from "@/types/audition";
import ApplicantCard from "@/components/ApplicantCard";
import { Pagination } from "@mui/material";
import ApplicantDetailModalContent from "@/components/ApplicantDetailModalContent";
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
        url: "/profile-placeholder.png",
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
  {
    id: 3,
    name: "김민지",
    ageOrYear: "20",
    height: "162",
    weight: "48kg",
    gender: "여",
    nation: "대한민국",
    desiredPosition: "보컬",
    images: [
      {
        id: 3,
        url: "/profile-placeholder.png",
        width: 300,
        height: 300,
        uploadState: "PENDING",
      },
    ],
    videos: [],
    instagramId: "https://instagram.com/minji_vocal",
    contactInfo: "010-2222-3333",
    isLiked: false,
    isScrap: false,
    userId: 3,
    auditionId: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 4,
    name: "이서준",
    ageOrYear: "24",
    height: "181",
    weight: "75kg",
    gender: "남",
    nation: "일본",
    desiredPosition: "래퍼",
    images: [
      {
        id: 4,
        url: "/profile-placeholder.png",
        width: 300,
        height: 300,
        uploadState: "PENDING",
      },
    ],
    videos: [],
    instagramId: "https://instagram.com/seojoon_rap",
    contactInfo: "010-4444-5555",
    isLiked: true,
    isScrap: true,
    userId: 4,
    auditionId: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 5,
    name: "박하늘",
    ageOrYear: "19",
    height: "168",
    weight: "52kg",
    gender: "여",
    nation: "중국",
    desiredPosition: "댄서",
    images: [
      {
        id: 5,
        url: "/profile-placeholder.png",
        width: 300,
        height: 300,
        uploadState: "PENDING",
      },
    ],
    videos: [],
    instagramId: "https://instagram.com/haneul_dance",
    contactInfo: "",
    isLiked: false,
    isScrap: false,
    userId: 5,
    auditionId: 1,
    createdAt: new Date().toISOString(),
  },
  {
    id: 6,
    name: "정유진",
    ageOrYear: "23",
    height: "170",
    weight: "54kg",
    gender: "여",
    nation: "베트남",
    desiredPosition: "올라운더",
    images: [
      {
        id: 6,
        url: "/profile-placeholder.png",
        width: 300,
        height: 300,
        uploadState: "PENDING",
      },
    ],
    videos: [],
    instagramId: "",
    contactInfo: "010-6666-7777",
    isLiked: false,
    isScrap: true,
    userId: 6,
    auditionId: 1,
    createdAt: new Date().toISOString(),
  },
];

const AuditionDetailPage: React.FC = () => {
  const router = useRouter();
  const { setIsLoggedIn, isLoggedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [page, setPage] = useState(1);
  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setPage(value);
  };

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
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="지원자 세부정보"
        sizeMode="LARGE"
      >
        <ApplicantDetailModalContent />
      </Modal>

      <Navigation items={navItems} />
      <main className="max-w-7xl mx-auto px-4 pt-12 pb-24">
        {/* 섹션: 오디션 지원자 리스트 */}
        <section className="mb-12">
          <h2 className="text-2xl font-semibold mb-6 text-center">
            오디션 지원자 리스트
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center">
            {mockApplicants.map((profile) => (
              <ApplicantCard
                auditionProfile={profile}
                key={profile.id}
                handleOnClick={() => {
                  setIsModalOpen(true);
                }}
              />
            ))}
          </div>
          <div className="flex justify-center mt-8">
            <Pagination
              count={10}
              showFirstButton
              showLastButton
              onChange={handlePageChange}
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default AuditionDetailPage;
