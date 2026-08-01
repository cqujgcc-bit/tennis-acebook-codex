import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Calendar, ChevronRight, Clock, MapPin, Star, Trophy } from "lucide-react";
import { Link } from "wouter";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/tennis/Navbar";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "处理中", color: "bg-yellow-100 text-yellow-700" },
  confirmed: { label: "已确认", color: "bg-green-100 text-green-700" },
  completed: { label: "已完成", color: "bg-blue-100 text-blue-700" },
  cancelled_by_student: { label: "已取消", color: "bg-gray-100 text-gray-600" },
  cancelled_by_coach: { label: "教练取消", color: "bg-red-100 text-red-600" },
  rejected: { label: "已拒绝", color: "bg-red-100 text-red-600" },
};

const REVIEW_TAGS = ["技术讲解清晰", "耐心专业", "训练强度适中", "时间守时", "氛围轻松", "进步明显", "场地选择好"];

export default function MyBookings() {
  const { isAuthenticated, user } = useAuth();
  const isCoachOrAdmin = user?.role === "coach" || user?.role === "admin";
  const utils = trpc.useUtils();
  const { data: bookings, isLoading } = trpc.booking.myBookings.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  // Review dialog state
  const [reviewTarget, setReviewTarget] = useState<{ bookingId: number; coachName: string } | null>(null);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [content, setContent] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const submitReview = trpc.booking.submitReview.useMutation({
    onSuccess: () => {
      toast.success("评价已提交，感谢您的反馈！");
      utils.booking.myBookings.invalidate();
      setReviewTarget(null);
      setRating(5);
      setContent("");
      setSelectedTags([]);
    },
    onError: (e) => toast.error(e.message),
  });

  const openReviewDialog = (e: React.MouseEvent, booking: any) => {
    e.preventDefault();
    e.stopPropagation();
    setRating(5);
    setHoverRating(0);
    setContent("");
    setSelectedTags([]);
    setReviewTarget({ bookingId: booking.id, coachName: booking.coach?.displayName ?? "教练" });
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold mb-3">请先登录</h2>
          <Button onClick={() => window.location.href = '/login?return=/my-bookings'} className="bg-primary text-primary-foreground">
            立即登录
          </Button>
        </div>
      </div>
    );
  }

  const upcoming = bookings?.filter(b => ["pending", "confirmed"].includes(b.status)) ?? [];
  const past = bookings?.filter(b => ["completed", "cancelled_by_student", "cancelled_by_coach", "rejected"].includes(b.status)) ?? [];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8 max-w-3xl">
        <h1 className="font-serif text-3xl font-bold mb-6">{isCoachOrAdmin ? "我的课程" : "我的预约"}</h1>

        <Tabs defaultValue="upcoming">
          <TabsList className="mb-6">
            <TabsTrigger value="upcoming">即将上课 {upcoming.length > 0 && `(${upcoming.length})`}</TabsTrigger>
            <TabsTrigger value="past">历史记录</TabsTrigger>
          </TabsList>

          <TabsContent value="upcoming">
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2].map(i => <div key={i} className="h-28 bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : upcoming.length === 0 ? (
              <div className="text-center py-16">
                <Calendar className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">暂无待上课程</p>
                <Link href="/coaches">
                  <Button className="mt-4 bg-primary text-primary-foreground">浏览教练</Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {upcoming.map(b => <BookingCard key={b.id} booking={b} onReview={openReviewDialog} />)}
              </div>
            )}
          </TabsContent>

          <TabsContent value="past">
            {past.length === 0 ? (
              <div className="text-center py-16">
                <Clock className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">暂无历史记录</p>
              </div>
            ) : (
              <div className="space-y-4">
                {past.map(b => <BookingCard key={b.id} booking={b} onReview={openReviewDialog} />)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Review Dialog */}
      <Dialog open={!!reviewTarget} onOpenChange={(open) => { if (!open) setReviewTarget(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>评价课程</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-4">
            <p className="text-sm text-muted-foreground">
              为 <span className="font-medium text-foreground">{reviewTarget?.coachName}</span> 的课程打分
            </p>

            {/* Star Rating */}
            <div>
              <div className="text-sm font-medium mb-2">综合评分</div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    className="transition-transform active:scale-90"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    onClick={() => setRating(star)}
                  >
                    <Star
                      className={`w-8 h-8 transition-colors ${
                        star <= (hoverRating || rating)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  </button>
                ))}
                <span className="ml-2 text-sm text-muted-foreground self-center">
                  {["", "较差", "一般", "还好", "不错", "非常好"][hoverRating || rating]}
                </span>
              </div>
            </div>

            {/* Tags */}
            <div>
              <div className="text-sm font-medium mb-2">评价标签（可多选）</div>
              <div className="flex flex-wrap gap-2">
                {REVIEW_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      selectedTags.includes(tag)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-primary/50"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Content */}
            <div>
              <div className="text-sm font-medium mb-2">详细评价（可选）</div>
              <Textarea
                placeholder="分享您的上课体验，帮助其他学员做出选择..."
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={3}
                className="resize-none"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewTarget(null)}>取消</Button>
            <Button
              className="bg-primary text-primary-foreground"
              disabled={submitReview.isPending}
              onClick={() => {
                if (!reviewTarget) return;
                submitReview.mutate({
                  bookingId: reviewTarget.bookingId,
                  rating,
                  content: content || undefined,
                  tags: selectedTags.length > 0 ? selectedTags : undefined,
                });
              }}
            >
              {submitReview.isPending ? "提交中..." : "提交评价"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function BookingCard({ booking, onReview }: { booking: any; onReview: (e: React.MouseEvent, b: any) => void }) {
  const status = STATUS_MAP[booking.status] ?? { label: booking.status, color: "bg-gray-100 text-gray-600" };
  const canReview = booking.status === "completed" && !booking.hasReviewed;

  return (
    <Link href={`/bookings/${booking.id}`}>
      <div className="card-elegant p-5 cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                {status.label}
              </span>
              <span className="text-xs text-muted-foreground">#{booking.bookingNo}</span>
              {booking.hasReviewed && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-50 text-yellow-600 flex items-center gap-1">
                  <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                  已评价
                </span>
              )}
            </div>

            <h3 className="font-semibold text-foreground">{booking.coach?.displayName ?? "教练"}</h3>

            <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {booking.lessonDate}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" />
                {booking.startTime} - {booking.endTime}
              </div>
              {booking.venue && (
                <div className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {booking.venue.name}
                </div>
              )}
            </div>
          </div>

          <div className="text-right shrink-0 flex flex-col items-end gap-2">
            <div className="price-tag text-lg">¥{booking.finalAmount}</div>
            {canReview ? (
              <Button
                size="sm"
                className="h-7 text-xs bg-yellow-500 hover:bg-yellow-600 text-white"
                onClick={(e) => onReview(e, booking)}
              >
                <Star className="w-3 h-3 mr-1" />
                写评价
              </Button>
            ) : (
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
