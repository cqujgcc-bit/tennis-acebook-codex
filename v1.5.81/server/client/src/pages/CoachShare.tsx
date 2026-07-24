import { useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useParams, useLocation } from "wouter";

export default function CoachShare() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isLoading } = trpc.coach.getBySlug.useQuery({ slug });
  const [, navigate] = useLocation();

  useEffect(() => {
    if (data?.coach?.id) {
      navigate(`/coaches/${data.coach.id}`);
    }
  }, [data, navigate]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center">加载中...</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center">教练不存在</div>;

  return <div className="min-h-screen flex items-center justify-center">跳转中...</div>;
}
