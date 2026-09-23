import { useState } from "react";
import MatchSharePoster from "@/components/tennis/MatchSharePoster";
import { useMatchCountdown } from "@/hooks/useMatchCountdown";
import { useParams, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/tennis/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Clock, Users, ArrowLeft, AlertCircle, DollarSign, Share2, Phone, Lock, Star, TrendingUp } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

const MATCH_TYPE_LABELS: Record<string, string> = {
  singles: "单打", doubles: "双打", mixed_doubles: "混双", practice: "练球", group: "团体",
};
const LEVEL_LABELS: Record<string, string> = {
  any: "不限水平",
  itf1: "ITF 1 - 初学者",
  itf2: "ITF 2 - 入门级",
  itf3: "ITF 3 - 初级",
  itf4: "ITF 4 - 初中级",
  itf5: "ITF 5 - 中级",
  itf6: "ITF 6 - 中高级",
  itf7: "ITF 7 - 高级",
  itf8: "ITF 8 - 竞技级",
  itf9: "ITF 9 - 精英级",
  itf10: "ITF 10 - 职业级",
  beginner: "初级",
  intermediate: "中级",
  advanced: "高级",
};

export default function MatchDetail() {
  const { id } = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const matchId = parseInt(id ?? "0");
  const [imgError, setImgError] = useState(false);
  const [showPoster, setShowPoster] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewTarget, setReviewTarget] = useState<{ id: number; name: string } | null>(null);
  const [reviewForm, setReviewForm] = useState({ punctualityScore: 5, friendlinessScore: 5, levelMatchScore: 5, comment: "" });

  const { data, isLoading, refetch } = trpc.match.getById.useQuery({ id: matchId }, { enabled: !!matchId });

  const joinMutation = trpc.match.join.useMutation({
    onSuccess: () => { toast.success("报名成功！"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const leaveMutation = trpc.match.leave.useMutation({
    onSuccess: () => { toast.success("已取消报名"); refetch(); },
    onError: (e) => toast.error(e.message),
  });
  const cancelMutation = trpc.match.cancel.useMutation({
    onSuccess: () => { toast.success("约球已取消"); refetch(); },
    onError: (e) => toast.error(e.message),
  });

  const reviewMutation = trpc.match.review.useMutation({
    onSuccess: () => {
      toast.success("评价已提交！对方信用分将更新");
      setShowReviewDialog(false);
      setReviewTarget(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  // ⚠️ ALL hooks must be called unconditionally before any early return
  // Use safe fallback values when data is not yet available
  const match = data?.match;
  const { timeLeft, isStarted } = useMatchCountdown(
    match?.matchDate ?? "",
    match?.startTime ?? "",
    match?.status ?? "open"
  );

  // ── Early returns (after all hooks) ──────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container py-8 max-w-2xl">
          <Skeleton className="h-8 w-32 mb-6" />
          <Skeleton className="h-56 rounded-xl mb-4" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!data || !match) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="container py-20 text-center">
          <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">约球信息不存在</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/matches")}>返回约球</Button>
        </div>
      </div>
    );
  }

  const { participants, author } = data;
  const isAuthor = user?.id === match.authorId;
  const myParticipation = participants.find((p: any) => p.userId === user?.id && p.status === "confirmed");
  const confirmedParticipants = participants.filter((p: any) => p.status === "confirmed");
  const hasImage = !!match.imageUrl && !imgError;
  const imageUrl: string | undefined = match.imageUrl ?? undefined;

  const statusMap: Record<string, { label: string; color: string; dot: string }> = {
    open: { label: "招募中", color: "bg-green-100 text-green-700", dot: "bg-green-500 animate-pulse" },
    full: { label: "已满员", color: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
    cancelled: { label: "已取消", color: "bg-red-100 text-red-700", dot: "bg-red-400" },
    completed: { label: "已结束", color: "bg-gray-100 text-gray-500", dot: "bg-gray-400" },
  };
  const statusInfo = statusMap[match.status] ?? { label: match.status, color: "bg-gray-100 text-gray-500", dot: "bg-gray-400" };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container py-8 max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="sm" className="gap-1" onClick={() => navigate("/matches")}>
            <ArrowLeft className="w-4 h-4" /> 返回约球
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowPoster(true)}>
            <Share2 className="w-4 h-4" /> 分享
          </Button>
        </div>

        {/* Hero image */}
        {hasImage ? (
          <div className="relative w-full h-56 sm:h-72 rounded-2xl overflow-hidden mb-4 shadow-md">
            <img
              src={imageUrl}
              alt={match.title}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
              <span className="text-white text-sm font-semibold drop-shadow">{statusInfo.label}</span>
            </div>
            <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
              <span className="bg-black/40 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-medium">
                {MATCH_TYPE_LABELS[match.matchType] ?? match.matchType}
              </span>
              <span className="bg-black/40 backdrop-blur-sm text-white text-xs px-2.5 py-1 rounded-full font-medium">
                {LEVEL_LABELS[match.levelRequired] ?? match.levelRequired}
              </span>
            </div>
          </div>
        ) : null}

        <Card className="mb-4">
          <CardContent className="p-6">
            {/* Badges row — only shown when no hero image */}
            {!hasImage && (
              <div className="flex items-start justify-between mb-4">
                <div className="flex gap-2 flex-wrap">
                  <Badge variant="secondary">{MATCH_TYPE_LABELS[match.matchType] ?? match.matchType}</Badge>
                  <Badge variant="outline">{LEVEL_LABELS[match.levelRequired] ?? match.levelRequired}</Badge>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${statusInfo.dot}`} />
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusInfo.color}`}>{statusInfo.label}</span>
                </div>
              </div>
            )}

            {hasImage && (
              <div className="flex items-center gap-2 mb-3">
                <Badge variant="secondary">{MATCH_TYPE_LABELS[match.matchType] ?? match.matchType}</Badge>
                <Badge variant="outline">{LEVEL_LABELS[match.levelRequired] ?? match.levelRequired}</Badge>
              </div>
            )}

            <h1 className="text-xl font-bold text-foreground mb-3">{match.title}</h1>

            {/* 倒计时 */}
            {timeLeft && (
              <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium mb-4 ${
                isStarted
                  ? "bg-green-100 text-green-700"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${
                  isStarted ? "bg-green-500 animate-pulse" : "bg-amber-500"
                }`} />
                {timeLeft}
              </div>
            )}

            {match.description && (
              <p className="text-muted-foreground mb-4 leading-relaxed">{match.description}</p>
            )}

            <div className="space-y-2.5 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Clock className="w-4 h-4 shrink-0 text-primary" />
                <span className="font-medium text-foreground">{match.matchDate} {match.startTime}{match.endTime ? ` – ${match.endTime}` : ""}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="w-4 h-4 shrink-0 text-primary" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-foreground">{match.venueName}</span>
                    {(match as any).courtNo && (
                      <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">{(match as any).courtNo}</span>
                    )}
                    {(match.latitude && match.longitude) ? (
                      <a
                        href={`https://uri.amap.com/marker?position=${match.longitude},${match.latitude}&name=${encodeURIComponent(match.venueName)}&src=acebook&coordinate=gaode&callnative=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-600 hover:text-green-700 flex items-center gap-0.5 bg-green-50 hover:bg-green-100 px-2 py-0.5 rounded-full transition-colors"
                      >
                        🗺️ 高德导航
                      </a>
                    ) : match.venueName ? (
                      <a
                        href={`https://uri.amap.com/search?keyword=${encodeURIComponent(match.venueName)}&src=acebook&callnative=1`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-green-600 hover:text-green-700 flex items-center gap-0.5 bg-green-50 hover:bg-green-100 px-2 py-0.5 rounded-full transition-colors"
                      >
                        🗺️ 高德导航
                      </a>
                    ) : null}
                  </div>
                  {match.venueAddress && (
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {match.venueAddress.replace(/[,，]?\s*\d{6}\s*$/, "")}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Users className="w-4 h-4 shrink-0 text-primary" />
                <span>已报名 <strong className="text-foreground">{match.currentParticipants}</strong> / {match.maxParticipants} 人</span>
              </div>
              {match.costPerPerson != null && Number(match.costPerPerson) > 0 && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="w-4 h-4 shrink-0 text-primary" />
                  <span>人均费用 <strong className="text-foreground">¥{match.costPerPerson}</strong></span>
                </div>
              )}
              {/* 费用分摊方式 */}
              {(match as any).costSplitType && (match as any).costSplitType !== 'aa' && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <DollarSign className="w-4 h-4 shrink-0 text-primary" />
                  <span>费用分摊：<strong className="text-foreground">{({
                    free: '免费活动',
                    host_pays: '发起人请客',
                    custom: '自定义',
                    aa: 'AA制'
                  } as Record<string, string>)[(match as any).costSplitType] ?? (match as any).costSplitType}</strong></span>
                </div>
              )}
              {/* NTRP 水平要求 */}
              {((match as any).ntrpMin || (match as any).ntrpMax) && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <TrendingUp className="w-4 h-4 shrink-0 text-primary" />
                  <span>NTRP 要求：<strong className="text-foreground">
                    {(match as any).ntrpMin && (match as any).ntrpMax
                      ? `${(match as any).ntrpMin} ~ ${(match as any).ntrpMax}`
                      : (match as any).ntrpMin ? `${(match as any).ntrpMin}+` : `≤${(match as any).ntrpMax}`
                    }
                  </strong></span>
                </div>
              )}
              {/* 自带球 */}
              {(match as any).bringOwnBall && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="text-primary">🎾</span>
                  <span>参与者需自带网球</span>
                </div>
              )}
            </div>

            {/* 联系方式：已报名成员和发布者可见，未报名者显示隐藏提示 */}
            {match.contactInfo && (
              (isAuthor || !!myParticipation) ? (
                <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950/30 rounded-xl text-sm border border-blue-100 dark:border-blue-900">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Phone className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-medium text-blue-700 dark:text-blue-400">发布者联系方式</span>
                  </div>
                  <span className="text-blue-600 dark:text-blue-300 font-mono tracking-wide">{match.contactInfo}</span>
                </div>
              ) : (
                <div className="mt-4 p-3 bg-muted/60 rounded-xl text-sm border border-border flex items-center gap-2 text-muted-foreground">
                  <Lock className="w-3.5 h-3.5 shrink-0" />
                  <span>报名后可查看发布者联系方式</span>
                </div>
              )
            )}

            {/* Actions */}
            <div className="mt-5 flex gap-3">
              {!isAuthenticated ? (
                <Button className="flex-1" onClick={() => window.location.href = getLoginUrl()}>
                  登录后报名
                </Button>
              ) : isAuthor ? (
                match.status !== "cancelled" && match.status !== "completed" && (
                  <Button variant="destructive" onClick={() => cancelMutation.mutate({ matchId: match.id })} disabled={cancelMutation.isPending}>
                    取消约球
                  </Button>
                )
              ) : myParticipation ? (
                <Button variant="outline" onClick={() => leaveMutation.mutate({ matchId: match.id })} disabled={leaveMutation.isPending}>
                  取消报名
                </Button>
              ) : match.status === "open" ? (
                <Button className="flex-1" onClick={() => joinMutation.mutate({ matchId: match.id })} disabled={joinMutation.isPending}>
                  立即报名
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        {/* Participants */}
        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">报名人员 ({confirmedParticipants.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {confirmedParticipants.length === 0 ? (
              <p className="text-muted-foreground text-sm text-center py-4">暂无人报名，快来第一个报名吧！</p>
            ) : (
              <div className="space-y-3">
                {confirmedParticipants.map((p: any) => (
                  <div key={p.id} className="flex items-center gap-3">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={p.user?.avatar} />
                      <AvatarFallback className="text-xs">{p.user?.name?.charAt(0) ?? "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{p.user?.name ?? "匿名用户"}</span>
                        {p.user?.ntrpLevel && (
                          <span className="text-xs bg-blue-50 text-blue-600 border border-blue-200 px-1.5 py-0.5 rounded-full">NTRP {Number(p.user.ntrpLevel).toFixed(1)}</span>
                        )}
                      </div>
                      {p.message && <p className="text-xs text-muted-foreground">{p.message}</p>}
                    </div>
                    <div className="flex items-center gap-2 ml-auto">
                      {p.userId === match.authorId && (
                        <Badge variant="secondary" className="text-xs">发布者</Badge>
                      )}
                      {/* 球局已结束且当前用户是参与者且不是被评价者本人 */}
                      {isAuthenticated && (match.status === 'completed' || new Date(`${match.matchDate}T${match.startTime}:00`) < new Date()) &&
                        (isAuthor || !!myParticipation) && p.userId !== user?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-7 px-2 text-primary hover:bg-primary/10"
                          onClick={() => {
                            setReviewTarget({ id: p.userId, name: p.user?.name ?? '用户' });
                            setReviewForm({ punctualityScore: 5, friendlinessScore: 5, levelMatchScore: 5, comment: '' });
                            setShowReviewDialog(true);
                          }}
                        >
                          <Star className="w-3 h-3 mr-1" />评价
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Author */}
        {author && (
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Avatar className="w-10 h-10">
                <AvatarImage src={author.avatar ?? undefined} />
                <AvatarFallback>{author.name?.charAt(0) ?? "?"}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-xs text-muted-foreground">发布者</p>
                <p className="font-medium text-sm">{author.name}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Share Poster Dialog */}
      {showPoster && (
        <MatchSharePoster
          open={showPoster}
          onClose={() => setShowPoster(false)}
          match={match}
        />
      )}

      {/* 评价对话框 */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>评价球友：{reviewTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {[
              { key: 'punctualityScore', label: '准时度', desc: '是否准时到场' },
              { key: 'friendlinessScore', label: '友好度', desc: '态度是否友好' },
              { key: 'levelMatchScore', label: '水平匹配', desc: '水平是否符合预期' },
            ].map(({ key, label, desc }) => (
              <div key={key}>
                <Label className="text-sm font-medium">{label} <span className="text-muted-foreground text-xs">({desc})</span></Label>
                <div className="flex gap-1 mt-1.5">
                  {[1, 2, 3, 4, 5].map(score => (
                    <button
                      key={score}
                      type="button"
                      onClick={() => setReviewForm(f => ({ ...f, [key]: score }))}
                      className="flex-1"
                    >
                      <Star
                        className={`w-7 h-7 mx-auto transition-colors ${
                          score <= (reviewForm as any)[key] ? 'text-amber-400' : 'text-gray-200'
                        }`}
                        fill={score <= (reviewForm as any)[key] ? 'currentColor' : 'none'}
                      />
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div>
              <Label className="text-sm">评语（可选）</Label>
              <Textarea
                placeholder="分享一下这次球局的感受..."
                value={reviewForm.comment}
                onChange={e => setReviewForm(f => ({ ...f, comment: e.target.value }))}
                className="mt-1 resize-none"
                rows={2}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (!reviewTarget) return;
                reviewMutation.mutate({
                  matchId: match.id,
                  revieweeId: reviewTarget.id,
                  ...reviewForm,
                });
              }}
              disabled={reviewMutation.isPending}
            >
              提交评价
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
