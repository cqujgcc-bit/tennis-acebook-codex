import { useState, useMemo } from "react";
import { useMatchCountdown } from "@/hooks/useMatchCountdown";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/tennis/Navbar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, MapPin, Clock, Users, Trophy, User } from "lucide-react";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";

const MATCH_TYPE_LABELS: Record<string, string> = {
  singles: "单打",
  doubles: "双打",
  mixed_doubles: "混双",
  practice: "练球",
  group: "团体",
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

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "招募中", color: "bg-green-100 text-green-700" },
  full: { label: "已满员", color: "bg-yellow-100 text-yellow-700" },
  cancelled: { label: "已取消", color: "bg-red-100 text-red-700" },
  completed: { label: "已结束", color: "bg-gray-100 text-gray-500" },
};

// 获取日期字符串 (YYYY-MM-DD)
function getDateStr(offset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toISOString().slice(0, 10);
}

function getWeekEnd(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  const daysToSunday = day === 0 ? 0 : 7 - day;
  d.setDate(d.getDate() + daysToSunday);
  return d.toISOString().slice(0, 10);
}

// 名额进度条
function ParticipantBar({ current, max }: { current: number; max: number }) {
  const pct = Math.min(100, Math.round((current / max) * 100));
  const color = pct >= 100 ? "bg-red-400" : pct >= 75 ? "bg-amber-400" : "bg-green-400";
  return (
    <div className="mt-2">
      <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" />
          {current}/{max} 人
        </span>
        <span>{max - current > 0 ? `还差 ${max - current} 人` : "已满员"}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// NTRP 水平标签辅助函数
function ntrpLabel(min?: number | null, max?: number | null): string | null {
  if (!min && !max) return null;
  if (min && max) return `NTRP ${min}~${max}`;
  if (min) return `NTRP ${min}+`;
  return `NTRP ≤${max}`;
}

// 费用分摊标签
const COST_SPLIT_LABELS: Record<string, string> = {
  aa: "AA制",
  free: "免费",
  host_pays: "主请客",
  custom: "自定义",
};

function MatchCard({ match, onJoin, isJoining }: { match: any; onJoin: (id: number) => void; isJoining: boolean }) {
  const statusInfo = STATUS_LABELS[match.status] ?? { label: match.status, color: "bg-gray-100 text-gray-500" };
  const isEnded = match.status === "completed" || match.status === "cancelled";
  const { timeLeft, isStarted } = useMatchCountdown(match.matchDate, match.startTime, match.status);
  const ntrpTag = ntrpLabel(match.ntrpMin ? Number(match.ntrpMin) : null, match.ntrpMax ? Number(match.ntrpMax) : null);

  return (
    <Link href={`/matches/${match.id}`}>
      <Card className={`hover:shadow-md transition-all cursor-pointer border border-border/60 hover:border-primary/30 group ${isEnded ? "opacity-70" : ""}`}>
        <CardContent className="p-4">
          <div className="flex items-start justify-between mb-3">
            <div className="flex gap-2 flex-wrap">
              <Badge variant="secondary" className="text-xs">
                {MATCH_TYPE_LABELS[match.matchType] ?? match.matchType}
              </Badge>
              {ntrpTag ? (
                <Badge variant="outline" className="text-xs text-blue-600 border-blue-200 bg-blue-50">
                  {ntrpTag}
                </Badge>
              ) : (
                <Badge variant="outline" className="text-xs">
                  {LEVEL_LABELS[match.levelRequired] ?? match.levelRequired}
                </Badge>
              )}
            </div>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>

          <h3 className={`font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors ${isEnded ? "text-muted-foreground" : "text-foreground"}`}>
            {match.title}
          </h3>

          {match.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{match.description}</p>
          )}

          <div className="space-y-1.5 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span>{match.matchDate} {match.startTime}{match.endTime ? `–${match.endTime}` : ""}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{match.venueName}</span>
              {(match as any).courtNo && (
                <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium shrink-0">
                  {(match as any).courtNo}
                </span>
              )}
            </div>
            {/* 费用分摊 + 自带球 */}
            <div className="flex items-center gap-2 flex-wrap">
              {match.costSplitType && match.costSplitType !== "aa" && (
                <span className="text-xs bg-amber-50 text-amber-600 border border-amber-200 px-1.5 py-0.5 rounded-full">
                  {COST_SPLIT_LABELS[match.costSplitType] ?? match.costSplitType}
                </span>
              )}
              {match.costPerPerson && Number(match.costPerPerson) > 0 && (
                <span className="text-xs text-muted-foreground">¥{Number(match.costPerPerson).toFixed(0)}/人</span>
              )}
              {match.bringOwnBall && (
                <span className="text-xs bg-green-50 text-green-600 border border-green-200 px-1.5 py-0.5 rounded-full">🎾 自带球</span>
              )}
            </div>
          </div>

          {/* 名额进度条 */}
          <ParticipantBar current={match.currentParticipants} max={match.maxParticipants} />

          {/* 倒计时 */}
          {timeLeft && !isEnded && (
            <div className={`mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
              isStarted ? "bg-green-100 text-green-700" : "bg-amber-50 text-amber-600 border border-amber-200"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                isStarted ? "bg-green-500 animate-pulse" : "bg-amber-500"
              }`} />
              {timeLeft}
            </div>
          )}

          {match.status === "open" && (
            <Button
              size="sm"
              className="w-full mt-3"
              onClick={(e) => { e.preventDefault(); onJoin(match.id); }}
              disabled={isJoining}
            >
              立即报名
            </Button>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

type DateFilter = "all" | "today" | "tomorrow" | "week";

const DATE_FILTER_LABELS: Record<DateFilter, string> = {
  all: "全部",
  today: "今天",
  tomorrow: "明天",
  week: "本周",
};

type ViewMode = "all" | "authored" | "joined";

export default function MatchList() {
  const { isAuthenticated } = useAuth();
  const [viewMode, setViewMode] = useState<ViewMode>("all");
  const [matchType, setMatchType] = useState<string>("all");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [ntrpFilter, setNtrpFilter] = useState<string>("all"); // "all" | "1.0-2.5" | "3.0-3.5" | "4.0-4.5" | "5.0-6.0"

  // 计算日期范围
  const { dateFrom, dateTo } = useMemo(() => {
    if (dateFilter === "today") return { dateFrom: getDateStr(0), dateTo: getDateStr(0) };
    if (dateFilter === "tomorrow") return { dateFrom: getDateStr(1), dateTo: getDateStr(1) };
    if (dateFilter === "week") return { dateFrom: getDateStr(0), dateTo: getWeekEnd() };
    return { dateFrom: undefined, dateTo: undefined };
  }, [dateFilter]);

  const { ntrpMin, ntrpMax } = useMemo(() => {
    const map: Record<string, { ntrpMin?: number; ntrpMax?: number }> = {
      "1.0-2.5": { ntrpMax: 2.5 },
      "3.0-3.5": { ntrpMin: 3.0, ntrpMax: 3.5 },
      "4.0-4.5": { ntrpMin: 4.0, ntrpMax: 4.5 },
      "5.0-6.0": { ntrpMin: 5.0 },
    };
    return map[ntrpFilter] ?? {};
  }, [ntrpFilter]);

  const queryInput = useMemo(() => ({
    matchType: matchType === "all" ? undefined : matchType,
    levelRequired: levelFilter === "all" ? undefined : levelFilter,
    dateFrom,
    dateTo,
    onlyAvailable: onlyAvailable || undefined,
    city: "shenzhen",
    ntrpMin,
    ntrpMax,
    limit: 50,
  }), [matchType, levelFilter, dateFrom, dateTo, onlyAvailable, ntrpMin, ntrpMax]);

  // Fetch active matches (open + full)
  const { data: activeMatches, isLoading: loadingActive } = trpc.match.list.useQuery(queryInput, { enabled: viewMode === "all" });

  // Fetch my matches (authored + joined)
  const { data: myMatchesData, isLoading: loadingMyMatches } = trpc.match.myMatches.useQuery(
    undefined,
    { enabled: isAuthenticated && (viewMode === "authored" || viewMode === "joined") }
  );

  const joinMutation = trpc.match.join.useMutation({
    onSuccess: () => toast.success("报名成功！"),
    onError: (e) => toast.error(e.message),
  });

  const handleJoin = (matchId: number) => {
    if (!isAuthenticated) {
      window.location.href = getLoginUrl();
      return;
    }
    joinMutation.mutate({ matchId });
  };

  // Filter active: open or full, AND the match datetime has not passed yet
  const activeList = (activeMatches ?? []).filter((m: any) => {
    if (m.status !== "open" && m.status !== "full") return false;
    // Build a comparable datetime string "YYYY-MM-DDTHH:MM" and compare with now
    const matchDt = new Date(`${m.matchDate}T${m.startTime}:00`);
    return matchDt.getTime() > Date.now();
  });

  // My matches
  const myAuthoredList = myMatchesData?.authored ?? [];
  const myJoinedList = myMatchesData?.joined ?? [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-6 h-6 text-primary" />
              约球
            </h1>
            <p className="text-muted-foreground text-sm mt-1">找球友，约比赛，享受网球的乐趣</p>
          </div>
          {isAuthenticated ? (
            <Link href="/matches/create">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                发布约球
              </Button>
            </Link>
          ) : (
            <Button className="gap-2" onClick={() => window.location.href = getLoginUrl()}>
              <Plus className="w-4 h-4" />
              登录后发布
            </Button>
          )}
        </div>

        {/* View Mode Tabs */}
        <div className="flex gap-1 bg-white border border-border/60 rounded-xl p-1 mb-4 w-fit">
          <button
            onClick={() => setViewMode("all")}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
              viewMode === "all" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            全部
          </button>
          {isAuthenticated && (
            <>
              <button
                onClick={() => setViewMode("authored")}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === "authored" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <User className="w-3.5 h-3.5" />
                我发布的
              </button>
              <button
                onClick={() => setViewMode("joined")}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                  viewMode === "joined" ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                我参加的
              </button>
            </>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-border/60 p-4 mb-6 space-y-3">
          {/* 日期快速筛选 */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-muted-foreground shrink-0">日期：</span>
            <div className="flex gap-1.5 flex-wrap">
              {(["all", "today", "tomorrow", "week"] as DateFilter[]).map((d) => (
                <button
                  key={d}
                  onClick={() => setDateFilter(d)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-all ${
                    dateFilter === d
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "bg-gray-100 text-muted-foreground hover:bg-gray-200"
                  }`}
                >
                  {DATE_FILTER_LABELS[d]}
                </button>
              ))}
            </div>
          </div>

          {/* 类型 + 水平 + 仅有空位 */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground shrink-0">类型：</span>
              <Select value={matchType} onValueChange={setMatchType}>
                <SelectTrigger className="w-28 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部</SelectItem>
                  <SelectItem value="singles">单打</SelectItem>
                  <SelectItem value="doubles">双打</SelectItem>
                  <SelectItem value="mixed_doubles">混双</SelectItem>
                  <SelectItem value="practice">练球</SelectItem>
                  <SelectItem value="group">团体</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground shrink-0">NTRP：</span>
              <Select value={ntrpFilter} onValueChange={setNtrpFilter}>
                <SelectTrigger className="w-36 h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">不限水平</SelectItem>
                  <SelectItem value="1.0-2.5">初学级（1.0-2.5）</SelectItem>
                  <SelectItem value="3.0-3.5">中级（3.0-3.5）</SelectItem>
                  <SelectItem value="4.0-4.5">高级（4.0-4.5）</SelectItem>
                  <SelectItem value="5.0-6.0">竞技级（5.0+）</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <Switch
                id="only-available"
                checked={onlyAvailable}
                onCheckedChange={setOnlyAvailable}
              />
              <Label htmlFor="only-available" className="text-sm text-muted-foreground cursor-pointer">
                仅显示有空位
              </Label>
            </div>
          </div>
        </div>

        {/* Active Matches Section (全部视图) */}
        {viewMode === "all" && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <h2 className="text-lg font-semibold text-foreground">进行中</h2>
              <span className="text-sm text-muted-foreground">({loadingActive ? "…" : activeList.length} 条)</span>
            </div>
            {loadingActive ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
              </div>
            ) : activeList.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl bg-white">
                <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground font-medium">
                  {dateFilter !== "all" || matchType !== "all" || levelFilter !== "all" || onlyAvailable
                    ? "当前筛选条件下暂无约球活动"
                    : "暂无招募中的约球活动"}
                </p>
                <p className="text-muted-foreground text-sm mt-1">
                  {dateFilter !== "all" || matchType !== "all" || levelFilter !== "all" || onlyAvailable
                    ? "试试调整筛选条件"
                    : "成为第一个发布约球的人吧！"}
                </p>
                {isAuthenticated && (dateFilter === "all" && matchType === "all" && levelFilter === "all" && !onlyAvailable) && (
                  <Link href="/matches/create">
                    <Button className="mt-4 gap-2" size="sm">
                      <Plus className="w-4 h-4" />
                      发布约球
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeList.map((match: any) => (
                  <MatchCard key={match.id} match={match} onJoin={handleJoin} isJoining={joinMutation.isPending} />
                ))}
              </div>
            )}
          </section>
        )}

        {/* 已结束球局 Section（全部视图，时间已过但status尚未更新的也归入此处） */}
        {viewMode === "all" && (() => {
          const expiredList = (activeMatches ?? []).filter((m: any) => {
            if (m.status === "cancelled" || m.status === "completed") return true;
            if (m.status !== "open" && m.status !== "full") return false;
            const matchDt = new Date(`${m.matchDate}T${m.startTime}:00`);
            return matchDt.getTime() <= Date.now();
          });
          if (expiredList.length === 0) return null;
          return (
            <section className="mb-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-2 h-2 rounded-full bg-gray-400" />
                <h2 className="text-lg font-semibold text-muted-foreground">已结束</h2>
                <span className="text-sm text-muted-foreground">({expiredList.length} 条)</span>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {expiredList.map((match: any) => (
                  <MatchCard key={match.id} match={match} onJoin={handleJoin} isJoining={joinMutation.isPending} />
                ))}
              </div>
            </section>
          );
        })()}

        {/* 我发布的 / 我参加的 视图 */}
        {(viewMode === "authored" || viewMode === "joined") && (
          <section className="mb-10">
            <div className="flex items-center gap-2 mb-4">
              <span className="w-2 h-2 rounded-full bg-primary" />
              <h2 className="text-lg font-semibold text-foreground">
                {viewMode === "authored" ? "我发布的球局" : "我参加的球局"}
              </h2>
              <span className="text-sm text-muted-foreground">
                ({loadingMyMatches ? "…" : viewMode === "authored" ? myAuthoredList.length : myJoinedList.length} 条)
              </span>
            </div>
            {loadingMyMatches ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => <Skeleton key={i} className="h-52 rounded-xl" />)}
              </div>
            ) : (viewMode === "authored" ? myAuthoredList : myJoinedList).length === 0 ? (
              <div className="text-center py-12 border border-dashed border-border rounded-xl bg-white">
                <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-30" />
                <p className="text-muted-foreground font-medium">
                  {viewMode === "authored" ? "还没有发布过约球" : "还没有参加过球局"}
                </p>
                {viewMode === "authored" && (
                  <Link href="/matches/create">
                    <Button className="mt-4 gap-2" size="sm">
                      <Plus className="w-4 h-4" />
                      发布约球
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {(viewMode === "authored" ? myAuthoredList : myJoinedList).map((match: any) => (
                  <MatchCard key={match.id} match={match} onJoin={handleJoin} isJoining={joinMutation.isPending} />
                ))}
              </div>
            )}
          </section>
        )}


      </div>

      {/* Floating Action Button - 发布球局 */}
      <div className="fixed bottom-6 right-6 z-50">
        {isAuthenticated ? (
          <Link href="/matches/create">
            <button
              className="flex items-center gap-2 bg-primary text-primary-foreground shadow-lg hover:shadow-xl rounded-full px-5 py-3.5 font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
              style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}
            >
              <Plus className="w-5 h-5" />
              <span>发球局</span>
            </button>
          </Link>
        ) : (
          <button
            onClick={() => window.location.href = getLoginUrl()}
            className="flex items-center gap-2 bg-primary text-primary-foreground shadow-lg hover:shadow-xl rounded-full px-5 py-3.5 font-semibold text-sm transition-all duration-200 hover:scale-105 active:scale-95"
            style={{ boxShadow: '0 4px 24px rgba(0,0,0,0.18)' }}
          >
            <Plus className="w-5 h-5" />
            <span>登录后发布</span>
          </button>
        )}
      </div>
    </div>
  );
}
