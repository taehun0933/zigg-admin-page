"use client";

import React from "react";

const ApplicantDetailModalContent: React.FC = () => {
  return (
    <div className="p-6 space-y-8">
      {/* 상단 프로필 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 왼쪽 프로필 정보 */}
        <div className="bg-gray-100 p-6 rounded-lg space-y-2">
          <div className="w-32 h-40 bg-gray-300 rounded-md mx-auto mb-4" />
          <h2 className="text-lg font-bold">권태훈 // 비주얼</h2>
          <p className="text-sm text-gray-600">스리랑카 // 22</p>
          <p className="text-sm text-gray-600">남 // 190 / 135kg</p>
          <p className="text-sm text-blue-500 underline">Instagram Link</p>
          <p className="mt-4 font-semibold">연락처</p>
          <p className="text-sm text-gray-600">이메일</p>
        </div>

        {/* 오른쪽 자기소개 */}
        <div className="bg-gray-100 p-6 rounded-lg">
          <label className="block text-sm font-semibold mb-2">Label</label>
          <textarea
            readOnly
            defaultValue="유저의 개인적인 자기 소개 (짧음)"
            className="w-full h-40 p-2 border border-gray-300 rounded resize-none bg-white"
          />
        </div>
      </div>

      {/* 이미지 썸네일 리스트 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="aspect-square bg-gray-200 rounded flex items-center justify-center"
          >
            <span className="text-gray-400 text-3xl">🖼</span>
          </div>
        ))}
      </div>

      {/* 비디오 썸네일 */}
      <div className="w-full aspect-video bg-gray-200 rounded flex items-center justify-center">
        <span className="text-5xl text-gray-400">▶</span>
      </div>
    </div>
  );
};

export default ApplicantDetailModalContent;
