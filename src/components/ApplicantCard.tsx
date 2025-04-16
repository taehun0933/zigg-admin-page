"use client";

import { AuditionProfileType } from "@/types/audition";
import { useRouter } from "next/navigation";
import React from "react";
// import { Bookmark, Heart } from "lucide-react"; // 원하는 아이콘 라이브러리로 교체 가능

interface ApplicantCardProps {
  auditionProfile: AuditionProfileType;
}

const ApplicantCard: React.FC<ApplicantCardProps> = ({ auditionProfile }) => {
  const router = useRouter();
  const {
    name,
    ageOrYear,
    height,
    weight,
    gender,
    nation,
    desiredPosition,
    images,
    instagramId,
  } = auditionProfile;

  const profileImage = images?.[0]?.url || "/default-profile.png";

  return (
    <div className="relative w-[280px] p-4 border rounded-lg shadow-md bg-white flex flex-col items-center text-center">
      {/* 상단 아이콘 */}
      <div className="absolute top-2 left-2 text-gray-400">
        {/* <Bookmark size={20} /> */}
      </div>
      <div className="absolute top-2 right-2 text-gray-400">
        {/* <Heart size={20} /> */}
      </div>

      {/* 프로필 이미지 */}
      <div className="w-32 h-32 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden mb-4">
        <img
          src={profileImage}
          alt="프로필 사진"
          className="object-cover w-full h-full"
        />
      </div>

      {/* 이름 / 포지션 */}
      <p className="font-semibold text-lg">
        {name} // {desiredPosition}
      </p>

      {/* 국적 / 나이 */}
      <p className="text-sm text-gray-500 mt-1">
        {nation} // {ageOrYear}
      </p>

      {/* 인스타그램 링크 */}
      <p className="text-sm text-gray-500">
        {instagramId || "인스타그램 링크"}
      </p>

      {/* 하단 정보: 성별 / 키 / 몸무게 */}
      <p className="mt-4 text-lg font-bold">
        {gender} // {height} // <span className="font-black">{weight}</span>
      </p>
    </div>
  );
};

export default ApplicantCard;
