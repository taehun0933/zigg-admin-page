import BoardEditClient from "./BoardEditClient";

interface BoardEditPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function BoardEditPage({
  searchParams,
}: BoardEditPageProps) {
  const params = await searchParams;
  const boardId = Number(params.boardId);
  const postId = Number(params.postId);

  return <BoardEditClient boardId={boardId} postId={postId} />;
}
