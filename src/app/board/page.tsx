"use client";

import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Navigation from "@/components/NavigationBar";
import { navigationItems } from "@/utils/navigation";

interface BoardPost {
  id: number;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  views: number;
  category: string;
}

const Board: React.FC = () => {
  const router = useRouter();
  const { setIsLoggedIn, isLoggedIn } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("free");
  const [posts, setPosts] = useState<BoardPost[]>([
    {
      id: 1,
      title: "자유로운 소통 공간입니다",
      content: "자유롭게 의견을 나누고 정보를 공유해보세요.",
      author: "관리자",
      createdAt: "2024-01-15",
      views: 42,
      category: "free"
    },
    {
      id: 2,
      title: "오늘 날씨가 정말 좋네요",
      content: "오늘 날씨가 정말 좋아서 기분이 좋습니다.",
      author: "사용자1",
      createdAt: "2024-01-14",
      views: 28,
      category: "free"
    },
    {
      id: 3,
      title: "새로운 서비스 홍보합니다",
      content: "혁신적인 서비스를 소개합니다. 많은 관심 부탁드립니다.",
      author: "기업A",
      createdAt: "2024-01-13",
      views: 65,
      category: "promotion"
    },
    {
      id: 4,
      title: "개발자 구인합니다",
      content: "프론트엔드 개발자를 구인합니다. 연락처로 문의해주세요.",
      author: "스타트업B",
      createdAt: "2024-01-12",
      views: 89,
      category: "promotion"
    },
    {
      id: 5,
      title: "30일 코딩 첼린지",
      content: "30일 동안 매일 코딩하는 첼린지에 참여해보세요!",
      author: "개발팀",
      createdAt: "2024-01-11",
      views: 156,
      category: "challenge"
    },
    {
      id: 6,
      title: "독서 첼린지",
      content: "한 달에 한 권씩 책을 읽는 첼린지입니다.",
      author: "독서모임",
      createdAt: "2024-01-10",
      views: 89,
      category: "challenge"
    }
  ]);

  const categories = [
    { id: "free", name: "자유", color: "bg-blue-500" },
    { id: "promotion", name: "홍보/구인", color: "bg-green-500" },
    { id: "challenge", name: "첼린지", color: "bg-purple-500" }
  ];

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

  const handleDeletePost = (id: number) => {
    if (confirm("정말로 이 글을 삭제하시겠습니까?")) {
      setPosts(posts.filter(post => post.id !== id));
      alert("글이 삭제되었습니다.");
    }
  };

  const filteredPosts = posts.filter(post => post.category === activeTab);

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
              onClick={() => router.push(`/board/write?category=${activeTab}`)}
              className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-semibold"
            >
              글 쓰기
            </button>
          </div>
          
          {/* 탭 네비게이션 */}
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-8">
              {categories.map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveTab(category.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm ${
                    activeTab === category.id
                      ? `border-${category.color.replace('bg-', '')} text-${category.color.replace('bg-', '')}`
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {category.name}
                </button>
              ))}
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
                    조회수
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    관리
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPosts.map((post) => (
                  <tr key={post.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {post.id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {post.title}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {post.author}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {post.createdAt}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {post.views}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        삭제
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