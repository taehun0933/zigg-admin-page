"use client";

import { useRouter } from "next/navigation";

interface AnnouncementProps {
  setIsLoggedIn: React.Dispatch<React.SetStateAction<boolean>>;
}

const Announcement: React.FC<AnnouncementProps> = ({ setIsLoggedIn }) => {
  const router = useRouter();

  const handleGoBack = () => {
    router.back();
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center items-center font-sans">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-gray-800">공지사항</h1>
        <p className="mt-4 text-xl text-gray-600">
          현재 공지사항 페이지는 준비 중입니다.
        </p>
        <p className="mt-2 text-lg text-gray-600">
          곧 업데이트 될 예정이오니 잠시만 기다려 주세요.
        </p>
        <button
          onClick={handleGoBack}
          className="mt-12 w-36 h-12 bg-blue-500 text-white rounded-xl text-lg font-bold"
        >
          돌아가기
        </button>
      </div>
    </div>
  );
};

export default Announcement;
