import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertTriangle, Calendar, Check, ChevronLeft, Clock, CreditCard, MapPin, Star, User } from "lucide-react";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/tennis/Navbar";
import { toast } from "sonner";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const STATUS_MAP: Record<string, { label: string; color: string; desc: string }> = {
  pending: { label: "处理中", color: "text-yellow-600 bg-yellow-50", desc: "预约处理中" },
  confirmed: { label: "已确认", color: "text-green-600 bg-green-50", desc: "预约已确认，请准时到场。教练和学员均已收到确认通知" },
  completed: { label: "已完成", color: "text-blue-600 bg-blue-50", desc: "课程已完成" },
  cancelled_by_student: { label: "已取消", color: "text-gray-600 bg-gray-50", desc: "您已取消此预约" },
  cancelled_by_coach: { label: "教练取消", color: "text-red-600 bg-red-50", desc: "教练取消了此课程，费用已退回" },
  rejected: { label: "已拒绝", color: "text-red-600 bg-red-50", desc: "教练拒绝了此预约，费用已退回" },
};

export default function BookingDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const utils = trpc.useUtils();
  const [rating, setRating] = useState(5);
  const [reviewContent, setReviewContent] = useState("");
  const [reviewTags, setReviewTags] = useState<string[]>([]);

  const { data: booking, isLoading } = trpc.booking.getById.useQuery({ id: parseInt(id) });

  const cancelBooking = trpc.booking.cancel.useMutation({
    onSuccess: () => {
      toast.success("预约已取消，费用将退回");
      utils.booking.getById.invalidate({ id: parseInt(id) });
    },
    onError: (e) => toast.error(e.message),
  });

  const submitReview = trpc.booking.submitReview.useMutation({
    onSuccess: () => {
      toast.success("评价提交成功！");
      utils.booking.getById.invalidate({ id: parseInt(id) });
    },
    onError: (e) => toast.error(e.message),
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-12 max-w-2xl">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-40 bg-muted rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!booking) return null;

  const status = STATUS_MAP[booking.status] ?? { label: booking.status, color: "text-gray-600 bg-gray-50", desc: "" };
  const canCancel = ["pending", "confirmed"].includes(booking.status);
  const canReview = booking.status === "completed";

  const REVIEW_TAGS = ["技术专业", "耐心细致", "讲解清晰", "训练高效", "氛围轻松", "准时守信"];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8 max-w-2xl">
        <Link href="/my-bookings">
          <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            返回我的预约
          </button>
        </Link>

        {/* Status Banner */}
        <div className={`rounded-xl p-4 mb-6 ${status.color}`}>
          <div className="font-semibold">{status.label}</div>
          <div className="text-sm mt-0.5 opacity-80">{status.desc}</div>
        </div>

        {/* Booking Info */}
        <div className="card-elegant p-6 space-y-4 mb-5">
          <h2 className="font-serif text-xl font-semibold">预约详情</h2>

          <div className="space-y-3">
            <InfoRow icon={<User className="w-4 h-4" />} label="授课教练" value={booking.coach?.displayName ?? "教练"} />
            <InfoRow icon={<Calendar className="w-4 h-4" />} label="上课日期" value={booking.lessonDate} />
            <InfoRow icon={<Clock className="w-4 h-4" />} label="上课时间" value={`${booking.startTime} - ${booking.endTime}`} />
            <InfoRow icon={<MapPin className="w-4 h-4" />} label="上课场地" value={booking.venue?.name ?? "待定"} />
            {booking.venue?.address && (
              <InfoRow icon={<MapPin className="w-4 h-4 opacity-0" />} label="" value={booking.venue.address} />
            )}
            {booking.venue?.mapUrl && (
              <div className="flex items-center gap-3 py-1">
                <MapPin className="w-4 h-4 opacity-0" />
                <a href={booking.venue.mapUrl} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-primary hover:underline">
                  <MapPin className="w-3.5 h-3.5" />导航到场地
                </a>
              </div>
            )}
            {booking.venue?.bookingNote && (
              <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="text-xs font-medium text-amber-800 mb-1">📝 场地预约说明</div>
                <div className="text-xs text-amber-700">{booking.venue.bookingNote}</div>
              </div>
            )}
          </div>

          {booking.studentNote && (
            <div className="pt-3 border-t border-border/50">
              <div className="text-sm text-muted-foreground mb-1">备注</div>
              <div className="text-sm">{booking.studentNote}</div>
            </div>
          )}
        </div>

        {/* Payment Info */}
        <div className="card-elegant p-6 space-y-3 mb-5">
          <h2 className="font-serif text-xl font-semibold">费用明细</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">课程单价</span>
              <span>¥{booking.pricePerHour}/小时</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">课程时长</span>
              <span>{booking.durationHours} 小时</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">课程费用</span>
              <span>¥{booking.totalAmount}</span>
            </div>
            {parseFloat(booking.discountAmount ?? "0") > 0 && (
              <div className="flex justify-between text-green-600">
                <span>优惠减免</span>
                <span>-¥{booking.discountAmount}</span>
              </div>
            )}
            <Separator />
            <div className="flex justify-between font-semibold text-base">
              <span>实付金额</span>
              <span className="price-tag text-lg">¥{booking.finalAmount}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground pt-1">
            <CreditCard className="w-3.5 h-3.5" />
            <span>微信支付 · 订单号：{booking.bookingNo}</span>
          </div>
        </div>

        {/* Actions */}
        {canCancel && (
          <div className="card-elegant p-5 mb-5">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50">
                  <AlertTriangle className="w-4 h-4 mr-2" />
                  取消预约
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>确认取消预约？</AlertDialogTitle>
                  <AlertDialogDescription>
                    取消后，课程费用将退回原支付方式。此操作不可撤销。
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>返回</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-red-600 text-white hover:bg-red-700"
                    onClick={() => cancelBooking.mutate({ bookingId: booking.id })}
                  >
                    确认取消
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}

        {/* Review */}
        {canReview && (
          <div className="card-elegant p-6">
            <h2 className="font-serif text-xl font-semibold mb-4">课程评价</h2>

            <div className="mb-4">
              <div className="text-sm text-muted-foreground mb-2">评分</div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(s => (
                  <button key={s} onClick={() => setRating(s)}>
                    <Star className={`w-8 h-8 transition-colors ${s <= rating ? "star-rating fill-current" : "text-muted-foreground/30"}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <div className="text-sm text-muted-foreground mb-2">标签（可多选）</div>
              <div className="flex flex-wrap gap-2">
                {REVIEW_TAGS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => setReviewTags(prev =>
                      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                    )}
                    className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                      reviewTags.includes(tag)
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>

            <Textarea
              placeholder="分享您的上课体验..."
              value={reviewContent}
              onChange={e => setReviewContent(e.target.value)}
              className="resize-none mb-4"
              rows={3}
            />

            <Button
              className="w-full bg-primary text-primary-foreground"
              onClick={() => submitReview.mutate({
                bookingId: booking.id,
                rating,
                content: reviewContent,
                tags: reviewTags,
              })}
              disabled={submitReview.isPending}
            >
              <Check className="w-4 h-4 mr-2" />
              提交评价
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <span className="text-primary mt-0.5">{icon}</span>
      {label && <span className="text-muted-foreground w-16 shrink-0">{label}</span>}
      <span className="text-foreground">{value}</span>
    </div>
  );
}
