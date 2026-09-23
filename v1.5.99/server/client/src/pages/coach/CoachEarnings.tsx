import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { DollarSign, TrendingUp } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/tennis/Navbar";

export default function CoachEarnings() {
  const { isAuthenticated } = useAuth();
  const { data: stats } = trpc.coach.stats.useQuery(undefined, { enabled: isAuthenticated });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-2xl">
        <h1 className="font-serif text-3xl font-bold mb-6">收入统计</h1>
        {stats ? (
          <div className="card-elegant p-6 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">本月课时</span>
              <span className="font-semibold">{stats.monthlyLessons} 节</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">本月收入</span>
              <span className="font-semibold text-green-600">¥{stats.monthlyEarnings}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">累计收入</span>
              <span className="font-semibold">¥{stats.total}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">已结算</span>
              <span className="font-semibold text-blue-600">¥{stats.settled}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">待结算</span>
              <span className="font-semibold text-yellow-600">¥{stats.pending}</span>
            </div>
            <Separator />
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">累计学员</span>
              <span className="font-semibold">{stats.totalStudents} 人</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">累计课时</span>
              <span className="font-semibold">{stats.totalLessons} 节</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <TrendingUp className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">暂无收入数据</p>
          </div>
        )}
      </div>
    </div>
  );
}
