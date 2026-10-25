import LectureSubmissionClient from "./LectureSubmissionClient";

interface LectureSubmissionPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

// 트레이너 — 수강생 과제 영상 + 피드백 (?id=클래스&sid=제출물)
export default async function LectureSubmissionPage({ searchParams }: LectureSubmissionPageProps) {
  const params = await searchParams;
  const id = Number(params.id);
  const sid = Number(params.sid);
  const valid = (n: number) => Number.isFinite(n) && n > 0;
  return (
    <LectureSubmissionClient
      lectureId={valid(id) ? id : null}
      submissionId={valid(sid) ? sid : null}
    />
  );
}
