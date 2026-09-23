import { trpc } from "@/lib/trpc";
import { Award, Clock, Filter, MapPin, Search, Shield, Star, Trophy, X } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/tennis/Navbar";
import { useState, useMemo, useCallback } from "react";

const DAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const DAY_OPTIONS = [
  { label: "周一", value: "1" },
  { label: "周二", value: "2" },
  { label: "周三", value: "3" },
  { label: "周四", value: "4" },
  { label: "周五", value: "5" },
  { label: "周六", value: "6" },
  { label: "周日", value: "0" },
];
const TIME_OPTIONS = [
  "07:00","08:00","09:00","10:00","11:00","12:00",
  "13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00"
];

function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng/2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function CoachList() {
  const [search, setSearch] = useState("");
  const [filterDay, setFilterDay] = useState<string>("");
  const [filterStart, setFilterStart] = useState<string>("");
  const [filterEnd, setFilterEnd] = useState<string>("");
  const [nearbyMode, setNearbyMode] = useState(false);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState<string | null>(null);

  const handleNearby = useCallback(() => {
    if (nearbyMode) { setNearbyMode(false); setUserLat(null); setUserLng(null); setLocError(null); return; }
    setLocating(true); setLocError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setUserLat(pos.coords.latitude); setUserLng(pos.coords.longitude); setNearbyMode(true); setLocating(false); },
      (err) => { setLocError("无法获取位置，请允许浏览器定位权限"); setLocating(false); }
    );
  }, [nearbyMode]);

  // Build query input — only pass availability filter when all three fields are set
  const queryInput = useMemo(() => {
    const base: any = { limit: 50 };
    if (filterDay !== "" && filterStart && filterEnd) {
      base.dayOfWeek = parseInt(filterDay);
      base.startTime = filterStart;
      base.endTime = filterEnd;
    }
    return base;
  }, [filterDay, filterStart, filterEnd]);

  const { data: coaches, isLoading } = trpc.coach.list.useQuery(queryInput);

  const filtered = useMemo(() => {
    let list = (coaches ?? []).filter(c =>
      !search || c.displayName.includes(search) || (c.tagline ?? "").includes(search)
    );
    if (nearbyMode && userLat !== null && userLng !== null) {
      // Attach min distance from any of coach's teaching locations
      list = list.map(c => {
        const locs: any[] = c.teachingLocations ?? [];
        const dists = locs
          .filter((l: any) => l.latitude && l.longitude)
          .map((l: any) => calcDistance(userLat!, userLng!, parseFloat(l.latitude), parseFloat(l.longitude)));
        return { ...c, _minDist: dists.length > 0 ? Math.min(...dists) : Infinity };
      });
      list = list.filter((c: any) => c._minDist < 50); // within 50km
      list.sort((a: any, b: any) => a._minDist - b._minDist);
    }
    return list;
  }, [coaches, search, nearbyMode, userLat, userLng]);

  const hasFilter = filterDay !== "" || filterStart || filterEnd;

  const clearFilter = () => {
    setFilterDay(""); setFilterStart(""); setFilterEnd("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Header */}
      <div className="bg-court py-14">
        <div className="container text-center">
          <h1 className="font-serif text-4xl md:text-5xl font-bold text-white mb-4">
            专业教练团队
          </h1>
          <p className="text-white/80 text-lg max-w-xl mx-auto mb-6">
            每位教练均经过严格资质审核，职业背景真实可查
          </p>
          {/* Stats Row */}
          <div className="flex flex-wrap justify-center gap-6 mb-8">
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-5 py-2">
              <Trophy className="w-4 h-4 text-accent" />
              <span className="text-white text-sm font-medium">平均课时费 600 元/小时</span>
            </div>
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-5 py-2">
              <MapPin className="w-4 h-4 text-accent" />
              <span className="text-white text-sm font-medium">8+ 优质网球场地</span>
            </div>
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-5 py-2">
              <Star className="w-4 h-4 text-accent" />
              <span className="text-white text-sm font-medium">98% 学员好评率</span>
            </div>
            <div className="flex items-center gap-2 bg-white/15 backdrop-blur-sm rounded-full px-5 py-2">
              <Shield className="w-4 h-4 text-accent" />
              <span className="text-white text-sm font-medium">资质审核 真实可查</span>
            </div>
          </div>
          <div className="max-w-md mx-auto relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索教练姓名、特长..."
              className="pl-10 bg-white/95 border-0 h-11 rounded-xl"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="border-b border-border/60 bg-card/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container py-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground shrink-0">
              <Filter className="w-4 h-4" />
              <span>按空闲时间筛选：</span>
            </div>
            <Select value={filterDay} onValueChange={setFilterDay}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue placeholder="星期" />
              </SelectTrigger>
              <SelectContent>
                {DAY_OPTIONS.map(d => (
                  <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStart} onValueChange={setFilterStart}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue placeholder="开始时间" />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.slice(0, -1).map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-muted-foreground text-xs">至</span>
            <Select value={filterEnd} onValueChange={setFilterEnd}>
              <SelectTrigger className="h-8 w-24 text-xs">
                <SelectValue placeholder="结束时间" />
              </SelectTrigger>
              <SelectContent>
                {TIME_OPTIONS.slice(1).map(t => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilter && (
              <Button size="sm" variant="ghost" className="h-8 px-2 text-xs gap-1" onClick={clearFilter}>
                <X className="w-3.5 h-3.5" />
                清除筛选
              </Button>
            )}
            {hasFilter && filterDay !== "" && filterStart && filterEnd && (
              <Badge variant="secondary" className="text-xs">
                {DAY_NAMES[parseInt(filterDay)]} {filterStart}–{filterEnd} · 共 {filtered.length} 位教练有空
              </Badge>
            )}
            <div className="ml-auto flex items-center gap-2">
              <Button
                size="sm"
                variant={nearbyMode ? "default" : "outline"}
                className="h-8 text-xs gap-1"
                onClick={handleNearby}
                disabled={locating}
              >
                <MapPin className="w-3.5 h-3.5" />
                {locating ? "定位中..." : nearbyMode ? "附近教练已开启" : "附近教练"}
              </Button>
              {locError && <span className="text-xs text-red-500">{locError}</span>}
              {nearbyMode && userLat && <span className="text-xs text-muted-foreground">已找到 {filtered.length} 位附近50km内教练</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Coach Grid */}
      <div className="container py-12">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="card-elegant h-80 animate-pulse bg-muted" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            {hasFilter ? (
              <>
                <p className="text-muted-foreground text-lg">该时间段暂无空闲教练</p>
                <p className="text-muted-foreground text-sm mt-2">请尝试其他时间段，或清除筛选查看全部教练</p>
                <Button variant="outline" className="mt-4" onClick={clearFilter}>查看全部教练</Button>
              </>
            ) : (
              <>
                <p className="text-muted-foreground text-lg">暂无教练数据</p>
                <p className="text-muted-foreground text-sm mt-2">教练正在入驻中，请稍后再来</p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((coach) => (
              <CoachCard key={coach.id} coach={coach} highlightDay={filterDay !== "" ? parseInt(filterDay) : undefined} nearbyMode={nearbyMode} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CoachCard({ coach, highlightDay, nearbyMode }: { coach: any; highlightDay?: number; nearbyMode?: boolean }) {
  // Build a compact weekly availability summary
  const weeklySlots = useMemo(() => {
    const slots = (coach.availability ?? []).filter((s: any) => s.dayOfWeek !== null && s.dayOfWeek !== undefined);
    const grouped: Record<number, string[]> = {};
    slots.forEach((s: any) => {
      if (!grouped[s.dayOfWeek]) grouped[s.dayOfWeek] = [];
      grouped[s.dayOfWeek].push(`${s.startTime.slice(0,5)}–${s.endTime.slice(0,5)}`);
    });
    return grouped;
  }, [coach.availability]);

  const availDays = Object.keys(weeklySlots).map(Number).sort((a, b) => a - b);

  return (
    <div className="card-elegant overflow-hidden">
      <div className="h-52 bg-court-light flex items-center justify-center relative">
        {coach.avatar ? (
          <img src={coach.avatar} alt={coach.displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-24 h-24 rounded-full bg-primary/15 flex items-center justify-center">
            <span className="font-serif text-4xl font-bold text-primary">
              {coach.displayName?.charAt(0)}
            </span>
          </div>
        )}
        {coach.isVerified && (
          <div className="absolute top-3 right-3 badge-verified">
            <Shield className="w-3 h-3" />
            已认证
          </div>
        )}
      </div>

      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-foreground text-xl">{coach.displayName}</h3>
            <p className="text-muted-foreground text-sm mt-0.5 line-clamp-2">{coach.tagline}</p>
          </div>
          <div className="text-right shrink-0 ml-3">
            <div className="price-tag text-xl">¥{coach.pricePerHour}</div>
            <div className="text-xs text-muted-foreground">/小时</div>
          </div>
        </div>

        <div className="flex items-center gap-4 mb-4">
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4 star-rating fill-current" />
            <span className="text-sm font-semibold">{coach.avgRating ?? "5.0"}</span>
          </div>
          <span className="text-muted-foreground text-xs">·</span>
          <span className="text-sm text-muted-foreground">{coach.totalLessons} 课时</span>
          <span className="text-muted-foreground text-xs">·</span>
          <span className="text-sm text-muted-foreground">{coach.yearsExperience} 年</span>
        </div>

        {coach.specialties && (coach.specialties as string[]).length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {(coach.specialties as string[]).slice(0, 3).map((s: string) => (
              <span key={s} className="text-xs px-2.5 py-1 bg-primary/8 text-primary rounded-full">{s}</span>
            ))}
          </div>
        )}

        {/* Weekly availability summary */}
        {availDays.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center gap-1 mb-1.5">
              <Clock className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">每周空闲</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {availDays.map(day => (
                <span
                  key={day}
                  className={`text-xs px-2 py-0.5 rounded-full border ${
                    highlightDay === day
                      ? "bg-primary/15 text-primary border-primary/30 font-medium"
                      : "bg-muted/60 text-muted-foreground border-border/50"
                  }`}
                >
                  {DAY_NAMES[day]}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Teaching Locations (preferred) or Venues */}
        {(() => {
          const locs: any[] = coach.teachingLocations ?? [];
          const primaryLoc = locs.find((l: any) => l.isPrimary) ?? locs[0];
          if (primaryLoc) return (
            <div className="flex items-center gap-1 mb-3">
              <MapPin className="w-3.5 h-3.5 text-green-600 shrink-0" />
              <span className="text-xs text-green-700 font-medium truncate">{primaryLoc.name}</span>
              {nearbyMode && (coach as any)._minDist !== undefined && (coach as any)._minDist < Infinity && (
                <span className="text-xs text-muted-foreground ml-auto shrink-0">{((coach as any)._minDist).toFixed(1)}km</span>
              )}
            </div>
          );
          if (coach.venues && coach.venues.length > 0) return (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {coach.venues.slice(0, 2).map((v: any) => (
                <span key={v.venue?.id ?? v.id} className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-muted text-muted-foreground rounded-full">
                  <MapPin className="w-2.5 h-2.5" />
                  {v.venue?.name ?? v.name}
                </span>
              ))}
            </div>
          );
          return null;
        })()}

        {/* PKU alumni discount badge */}
        {coach.pkuDiscount && coach.pkuDiscount > 0 && (
          <div className="mb-3">
            <span className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-red-50 text-red-700 border border-red-200 rounded-full">
              <Award className="w-3 h-3" />
              北大校友专属{coach.pkuDiscount}折优惠
            </span>
          </div>
        )}

        <Link href={`/coaches/${coach.id}`}>
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg font-medium">
            查看详情 · 立即预约
          </Button>
        </Link>
      </div>
    </div>
  );
}
