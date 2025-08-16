"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navigation from "@/components/NavigationBar";
import { navigationItems } from "@/utils/navigation";
import { AdminBoardPost, getAdminPosts } from "@/apis/board";

interface BoardPost {
  id: number;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  views: number;
  category: string;
}

// 상단에 매핑 추가
const activeTabClasses: Record<string, string> = {
  free: "text-blue-600 border-blue-600",
  promotion: "text-green-600 border-green-600",
  challenge: "text-purple-600 border-purple-600",
};

// 교체 후
const formatYmdHm = (iso: string) => {
  const parts = new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));

  const get = (t: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === t)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}`;
};

const Board: React.FC = () => {
  const router = useRouter();
  const { setIsLoggedIn, isLoggedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("free");
  const [posts, setPosts] = useState<AdminBoardPost[]>([]);

  const boardIdMap: Record<string, number> = {
    free: 1,
    promotion: 2,
    challenge: 3,
  };

  const fetchPosts = async (category: string) => {
    try {
      const boardId = boardIdMap[category];
      const data = await getAdminPosts(boardId);
      setPosts(data);
    } catch (e) {
      console.error("게시글 불러오기 실패:", e);
    }
  };


  const categories = [
    { id: "free", name: "자유", color: "bg-blue-500" },
    { id: "promotion", name: "홍보/구인", color: "bg-green-500" },
    { id: "challenge", name: "첼린지", color: "bg-purple-500" }
  ];

// 로그인 체크 전용
  useEffect(() => {
    if (!isLoggedIn) {
      router.replace("/signin");
    }
  }, [isLoggedIn, router]);

    // 게시글 불러오기 전용
  useEffect(() => {
    if (isLoggedIn) {
      setIsLoading(true);
      fetchPosts(activeTab).finally(() => setIsLoading(false));
    }
  }, [isLoggedIn, activeTab]); // 👈 activeTab 변화만 감지

  const handleLogout = () => {
    setIsLoggedIn(false);
    router.push("/signin");
  };

  const handleDeletePost = (id: number) => {
    if (confirm("정말로 이 글을 삭제하시겠습니까?")) {
      setPosts(posts.filter(post => post.postId !== id));
      alert("글이 삭제되었습니다.");
    }
  };

  const filteredPosts = posts.filter(post => post.boardId === boardIdMap[activeTab]);

  const navItems = navigationItems(router, handleLogout);

  if (isLoading) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <Navigation items={navItems} />
      <main className="max-w-6xl mx-auto p-4 pt-12">
        <div className="bg-white rounded-lg shadow-lg p-6">
          {/* 상단 - 제목과 글 쓰기 버튼 */}
          <div className="flex justify-between items-center mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">게시판 관리</h1>
              <p className="text-gray-600 mt-2">카테고리별 게시글 관리</p>
            </div>
              <button
                onClick={() =>
                  router.push(`/board/write?category=${activeTab}&boardId=${boardIdMap[activeTab]}`)
                }
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
              >
                글 쓰기
              </button>
          </div>
          
          {/* 탭 네비게이션 */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8" role="tablist" aria-label="게시판 카테고리">
              {categories.map((category) => {
                const isActive = activeTab === category.id;
                return (
                  <button
                    key={category.id}
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setActiveTab(category.id)}
                    className={[
                      "py-2 px-1 text-sm font-medium border-b-2 transition-colors",
                      isActive
                        ? activeTabClasses[category.id] // 활성 색상(파란/초록/보라)
                        : "text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300",
                    ].join(" ")}
                  >
                    {category.name}
                  </button>
                );
              })}
            </nav>
          </div>
                    
          {/* 글 목록 */}
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    번호
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    제목
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작성자
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    작성일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPosts.map((post) => (
                  <tr key={post.postId} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {post.postId}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {post.postTitle}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {post.postCreator.userName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {formatYmdHm(post.createdAt)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() =>
                          router.push(`/board/edit?boardId=${post.boardId}&postId=${post.postId}`)
                        }
                        className="text-red-600 hover:text-red-900"
                      >
                        수정 및 삭제
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          {filteredPosts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">등록된 게시글이 없습니다.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Board; 