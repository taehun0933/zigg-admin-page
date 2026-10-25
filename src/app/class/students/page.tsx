import LectureStudentsAdminClient from "./LectureStudentsAdminClient";

interface LectureStudentsPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// 관리자 — 클래스 페이지: 주차별 영상 + 수강생 등록·해제 (?id=)
export default async function LectureStudentsPage({ searchParams }: LectureStudentsPageProps) {
  const params = await searchParams;
  const id = Number(params.id);
  return <LectureStudentsAdminClient lectureId={Number.isFinite(id) && id > 0 ? id : null} />;
}
