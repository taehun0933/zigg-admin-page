"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Navigation, { NavItem } from "@/components/NavigationBar";
import { useAuth } from "@/contexts/AuthContext";
import Modal from "@/components/Modal";
import { AuditionInfoType, AuditionProfileType } from "@/types/audition";
import ApplicantCard from "@/components/ApplicantCard";
import { Pagination } from "@mui/material";
import ApplicantDetailModalContent from "@/components/ApplicantDetailModalContent";
import { getAuditionInfo } from "@/apis/audition";

const AuditionDetailPage: React.FC = () => {
  const router = useRouter();
  const { setIsLoggedIn, isLoggedIn } = useAuth();
  const params = useParams();
  const id = Number(params?.id);

  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [applicantInfoWithModal, setApplicantInfoWithModal] =
    useState<AuditionProfileType | null>(null);

  const [currentAuditionInfo, setCurrentAuditionInfo] =
    useState<AuditionInfoType | null>(null);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [currentPage, setCurrentPage] = useState<number>(1);

  const [filter, setFilter] = useState<"all" | "scrap" | "like">("all");

  const getAuditionInfoData = useCallback(async () => {
    try {
      const data = await getAuditionInfo({
        auditionId: id,
        pageNum: currentPage - 1, // 서버는 0-index니까
        filter,
      });
      setCurrentAuditionInfo(data);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error(error);
    }
  }, [id, currentPage, filter]);

  const handlePageChange = (
    event: React.ChangeEvent<unknown>,
    value: number
  ) => {
    setCurrentPage(value); // ❗ API 호출 없음
  };

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/signin");
    } else {
      getAuditionInfoData();
      setIsLoading(false);
    }
  }, [isLoggedIn, router, getAuditionInfoData]);

  const handleLogout = () => {
    setIsLoggedIn(false);
    router.push("/signin");
  };

  const navItems: NavItem[] = [
    { label: "오디션 관리", onClick: () => router.push("/audition") },
    { label: "공지사항 관리", onClick: () => router.push("/notice") },
    { label: "로그아웃", onClick: handleLogout },
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
        onClose={() => {
          setIsModalOpen(false);
          setApplicantInfoWithModal(null);
        }}
        title="지원자 세부정보"
        sizeMode="LARGE"
      >
        <ApplicantDetailModalContent applicantInfo={applicantInfoWithModal} />
      </Modal>

      <Navigation items={navItems} />

      <main className="max-w-7xl mx-auto px-4 pt-8 pb-8">
        <section className="mb-12">
          {/* 제목 + 필터 가로 정렬 */}
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">오디션 지원자 리스트</h2>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => router.push(`/audition/${id}/edit`)}
                className="px-4 py-2 bg-black text-white rounded hover:bg-gray-800 transition-colors"
              >
                오디션 수정하기
              </button>
              <div className="flex space-x-4">
                <label className="flex items-center space-x-1">
                  <input
                    type="radio"
                    name="filter"
                    value="all"
                    checked={filter === "all"}
                    onChange={() => {
                      setFilter("all");
                      setCurrentPage(1); // ❗ 필터 변경 시 1페이지 초기화
                    }}
                  />
                  <span>모두</span>
                </label>
                <label className="flex items-center space-x-1">
                  <input
                    type="radio"
                    name="filter"
                    value="scrap"
                    checked={filter === "scrap"}
                    onChange={() => {
                      setFilter("scrap");
                      setCurrentPage(1);
                    }}
                  />
                  <span>북마크만 보기</span>
                </label>
                <label className="flex items-center space-x-1">
                  <input
                    type="radio"
                    name="filter"
                    value="like"
                    checked={filter === "like"}
                    onChange={() => {
                      setFilter("like");
                      setCurrentPage(1);
                    }}
                  />
                  <span>좋아요만 보기</span>
                </label>
              </div>
            </div>
          </div>

          {/* 지원자 카드 그리드 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 justify-items-center">
            {currentAuditionInfo && currentAuditionInfo.content.length > 0 ? (
              currentAuditionInfo.content.map((profile) => (
                <ApplicantCard
                  key={profile.id}
                  auditionProfile={profile}
                  handleOnClick={() => {
                    setIsModalOpen(true);
                    setApplicantInfoWithModal(profile);
                  }}
                />
              ))
            ) : (
              <div className="col-span-1 md:col-span-2 lg:col-span-3 text-center text-gray-500 py-12">
                조건에 해당하는 지원자가 없습니다.
              </div>
            )}
          </div>

          {/* 페이지네이션 */}
          <div className="flex justify-center mt-8">
            <Pagination
              count={totalPages}
              page={currentPage}
              onChange={handlePageChange}
              showFirstButton
              showLastButton
            />
          </div>
        </section>
      </main>
    </div>
  );
};

export default AuditionDetailPage;
