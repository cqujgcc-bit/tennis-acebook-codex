import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Calendar, Users } from "lucide-react";
import Navbar from "@/components/tennis/Navbar";

export default function CoachStudents() {
  const { isAuthenticated } = useAuth();
  const { data: students, isLoading } = trpc.coach.students.useQuery(undefined, { enabled: isAuthenticated });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-3xl">
        <h1 className="font-serif text-3xl font-bold mb-6">我的学员</h1>
        {isLoading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : !students || students.length === 0 ? (
          <div className="text-center py-20">
            <Users className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">暂无学员</p>
          </div>
        ) : (
          <div className="space-y-3">
            {students.map(s => (
              <div key={s.id} className="card-elegant p-4 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="font-serif text-xl font-bold text-primary">{(s.name ?? "学").charAt(0)}</span>
                </div>
                <div className="flex-1">
                  <div className="font-medium">{s.name ?? "学员"}</div>
                  <div className="text-sm text-muted-foreground mt-0.5">
                    {s.totalLessons} 课时 · 消费 ¥{s.totalSpent} · 最近上课 {s.lastLesson}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
