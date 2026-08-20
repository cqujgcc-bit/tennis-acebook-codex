import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import Navbar from "@/components/tennis/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, MapPin, Upload, X, Loader2, Sparkles,
  Calendar, Clock, Users, Banknote, FileText, Phone, Image as ImageIcon, ChevronDown
} from "lucide-react";
import MatchSharePoster from "@/components/tennis/MatchSharePoster";
import { toast } from "sonner";
import { getLoginUrl } from "@/const";
import { MapView, loadAMapScript, type AMapInstance, type AMapAutoCompleteTip } from "@/components/Map";
import { cn } from "@/lib/utils";
import { Building2 } from "lucide-react";

// ITF 水平等级（保留兼容性）
const ITF_LEVELS = [
  { value: "any", label: "不限水平" },
  { value: "itf1", label: "ITF 1 - 初学者" },
  { value: "itf2", label: "ITF 2 - 入门级" },
  { value: "itf3", label: "ITF 3 - 初级" },
  { value: "itf4", label: "ITF 4 - 初中级" },
  { value: "itf5", label: "ITF 5 - 中级" },
  { value: "itf6", label: "ITF 6 - 中高级" },
  { value: "itf7", label: "ITF 7 - 高级" },
  { value: "itf8", label: "ITF 8 - 竞技级" },
  { value: "itf9", label: "ITF 9 - 精英级" },
  { value: "itf10", label: "ITF 10 - 职业级" },
];

// NTRP 水平等级
const NTRP_LEVELS = [
  { value: 1.0, label: "1.0 - 完全初学" },
  { value: 1.5, label: "1.5 - 初学者" },
  { value: 2.0, label: "2.0 - 入门级" },
  { value: 2.5, label: "2.5 - 初级" },
  { value: 3.0, label: "3.0 - 初中级" },
  { value: 3.5, label: "3.5 - 中级" },
  { value: 4.0, label: "4.0 - 中高级" },
  { value: 4.5, label: "4.5 - 高级" },
  { value: 5.0, label: "5.0 - 竞技级" },
  { value: 5.5, label: "5.5 - 精英级" },
  { value: 6.0, label: "6.0 - 职业级" },
];

// 费用分摊方式
const COST_SPLIT_TYPES = [
  { value: "aa", label: "AA制（均摊）", icon: "⚖️" },
  { value: "free", label: "免费活动", icon: "🎁" },
  { value: "host_pays", label: "发起人请客", icon: "🎉" },
  { value: "custom", label: "自定义", icon: "✏️" },
];

const MATCH_TYPES = [
  { value: "singles", label: "单打", icon: "🎾" },
  { value: "doubles", label: "双打", icon: "🤝" },
  { value: "mixed_doubles", label: "混双", icon: "⚡" },
  { value: "practice", label: "练球", icon: "🏋️" },
  { value: "group", label: "团体", icon: "👥" },
];

const HOUR_OPTIONS = Array.from({ length: 18 }, (_, i) => {
  const h = String(i + 6).padStart(2, "0");
  return { value: h, label: `${h}:00` };
});

const MINUTE_OPTIONS = [0, 15, 30, 45].map(m => ({
  value: String(m).padStart(2, "0"),
  label: `${String(m).padStart(2, "0")} 分`,
}));

const DURATION_OPTIONS = [
  { value: "1", label: "1 小时" },
  { value: "1.5", label: "1.5 小时" },
  { value: "2", label: "2 小时" },
  { value: "2.5", label: "2.5 小时" },
  { value: "3", label: "3 小时" },
];

function calcEndTime(startHour: string, startMinute: string, duration: string): string {
  if (!startHour || !startMinute || !duration) return "";
  const totalStart = parseInt(startHour) * 60 + parseInt(startMinute);
  const totalEnd = totalStart + parseFloat(duration) * 60;
  const endH = Math.floor(totalEnd / 60);
  const endM = totalEnd % 60;
  return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
}

// 分区标题组件
function SectionTitle({ icon, title, required }: { icon: React.ReactNode; title: string; required?: boolean }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
        {icon}
      </div>
      <span className="font-semibold text-sm text-foreground">{title}</span>
      {required && <span className="text-red-500 text-xs">*必填</span>}
    </div>
  );
}

export default function CreateMatch() {
  const [, navigate] = useLocation();
  const { isAuthenticated, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 自动带入用户联系方式
  const autoContact = useMemo(() => {
    if (!user) return "";
    const parts: string[] = [];
    if ((user as any).wechatId) parts.push(`微信: ${(user as any).wechatId}`);
    if ((user as any).phone) parts.push(`手机: ${(user as any).phone}`);
    return parts.join("  ");
  }, [user]);

  const [form, setForm] = useState({
    title: "",
    matchType: "doubles" as "singles" | "doubles" | "mixed_doubles" | "practice" | "group",
    levelRequired: "any" as "any" | "itf1" | "itf2" | "itf3" | "itf4" | "itf5" | "itf6" | "itf7" | "itf8" | "itf9" | "itf10",
    matchDate: "",
    startTime: "",
    endTime: "",
    venueName: "",
    venueAddress: "",
    courtNo: "",
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    maxParticipants: 4,
    description: "",
    contactInfo: "",
    costPerPerson: "" as string,
    imageUrl: "",
    city: "shenzhen",
    ntrpMin: undefined as number | undefined,
    ntrpMax: undefined as number | undefined,
    costSplitType: "aa" as "free" | "aa" | "host_pays" | "custom",
    bringOwnBall: false,
    feeRequired: false,
    feePerPerson: "" as string,
  });

  const [startHour, setStartHour] = useState("");
  const [startMinute, setStartMinute] = useState("00");
  const [duration, setDuration] = useState("2");

  const [showPoster, setShowPoster] = useState(false);
  const [createdMatch, setCreatedMatch] = useState<{
    id: number; title: string; matchType: string; levelRequired: string;
    matchDate: string; startTime: string; endTime?: string | null;
    venueName: string; venueAddress?: string | null;
    courtNo?: string | null; imageUrl?: string | null;
    currentParticipants: number; maxParticipants: number;
    costPerPerson?: number | string | null; description?: string | null;
  } | null>(null);

  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [predictions, setPredictions] = useState<AMapAutoCompleteTip[]>([])
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [showPredictions, setShowPredictions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const mapRef = useRef<AMapInstance | null>(null);
  const markerRef = useRef<unknown>(null);

  // 数据库球场搜索
  const [venueSearchKeyword, setVenueSearchKeyword] = useState("");
  const { data: dbVenues } = trpc.venue.list.useQuery(
    { search: venueSearchKeyword, limit: 5 },
    { enabled: venueSearchKeyword.length >= 1 }
  );
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(null);

  const handleMapReady = useCallback((map: AMapInstance) => {
    mapRef.current = map;
    setMapReady(true);
  }, []);

  // 预加载高德地图脚本，不等地图渲染就可以搜索
  useEffect(() => { loadAMapScript().catch(() => {}); }, []);

  const handleVenueInput = (value: string) => {
    setForm(f => ({ ...f, venueName: value }));
    setVenueSearchKeyword(value);
    // 如果用户手动修改，清除已选球场
    if (selectedVenueId) setSelectedVenueId(null);
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    if (value.length < 1) {
      setPredictions([]);
      setShowPredictions(false);
      return;
    }
    setSearchLoading(true);
    debounceTimer.current = setTimeout(async () => {
      try {
        await loadAMapScript();
        // 用 AMap.plugin() 确保 AutoComplete 插件已完全加载
        const doSearch = () => {
          if (!window.AMap?.AutoComplete) {
            setSearchLoading(false);
            return;
          }
          const ac = new window.AMap.AutoComplete({ city: '深圳', citylimit: false });
          ac.search(value, (status: string, result: { tips?: AMapAutoCompleteTip[] }) => {
            setSearchLoading(false);
            if (status === 'complete' && result?.tips?.length) {
              const filtered = result.tips.filter(t => t.name && t.name.trim());
              setPredictions(filtered.slice(0, 8));
              setShowPredictions(filtered.length > 0);
            } else {
              setPredictions([]);
              setShowPredictions(false);
            }
          });
        };
        if (window.AMap?.AutoComplete) {
          doSearch();
        } else if (window.AMap && typeof (window.AMap as unknown as { plugin?: (plugins: string[], cb: () => void) => void }).plugin === 'function') {
          (window.AMap as unknown as { plugin: (plugins: string[], cb: () => void) => void }).plugin(['AMap.AutoComplete'], doSearch);
        } else {
          setSearchLoading(false);
        }
      } catch {
        setSearchLoading(false);
      }
    }, 200);
  };

  // 选择数据库球场
  const handleSelectDbVenue = (venue: NonNullable<typeof dbVenues>[number]) => {
    setSelectedVenueId(venue.id);
    setVenueSearchKeyword("");
    setShowPredictions(false);
    setPredictions([]);
    setForm(f => ({
      ...f,
      venueName: venue.name,
      venueAddress: venue.address ?? "",
      latitude: venue.latitude ? Number(venue.latitude) : undefined,
      longitude: venue.longitude ? Number(venue.longitude) : undefined,
      // 自动将球场封面图设为活动背景图
      imageUrl: venue.coverImage ?? f.imageUrl,
    }));
    if (venue.coverImage) {
      setImagePreview(venue.coverImage);
    }
    // 在地图上定位
    if (mapRef.current && venue.latitude && venue.longitude && window.AMap) {
      const lat = Number(venue.latitude);
      const lng = Number(venue.longitude);
      mapRef.current.setCenter([lng, lat]);
      mapRef.current.setZoom(17);
      if (markerRef.current) {
        (markerRef.current as { setMap: (m: null) => void }).setMap(null);
      }
      markerRef.current = new window.AMap.Marker({
        position: [lng, lat],
        map: mapRef.current,
        title: venue.name,
      });
    }
  };

  const handleSelectPlace = (poi: AMapAutoCompleteTip) => {
    setShowPredictions(false);
    const lat = poi.location?.lat;
    const lng = poi.location?.lng;
    const rawName = poi.name;
    const courtMatch = rawName.match(/([A-Za-z0-9一二三四五六七八九十]+[号]?场)/);
    const parsedCourtNo = courtMatch ? courtMatch[1] : "";
    const cleanName = parsedCourtNo ? rawName.replace(courtMatch![0], "").replace(/[-\s]+$/, "").trim() || rawName : rawName;
    setForm(f => ({
      ...f,
      venueName: cleanName,
      venueAddress: Array.isArray(poi.address) ? poi.address.join('') : (typeof poi.address === 'string' ? poi.address : ""),
      latitude: lat,
      longitude: lng,
      courtNo: f.courtNo || parsedCourtNo,
    }));
    if (mapRef.current && lat && lng && window.AMap) {
      mapRef.current.setCenter([lng, lat]);
      mapRef.current.setZoom(17);
      if (markerRef.current) {
        (markerRef.current as { setMap: (m: null) => void }).setMap(null);
      }
      markerRef.current = new window.AMap.Marker({
        position: [lng, lat],
        map: mapRef.current,
        title: poi.name,
      });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("图片不能超过10MB"); return; }
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("上传失败");
      const data = await res.json();
      setForm(f => ({ ...f, imageUrl: data.url }));
      setImagePreview(URL.createObjectURL(file));
      toast.success("图片上传成功");
    } catch {
      toast.error("图片上传失败，请重试");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleAutoTitle = () => {
    const parts: string[] = [];
    const typeLabel = MATCH_TYPES.find(t => t.value === form.matchType)?.label ?? "";
    if (typeLabel) parts.push(typeLabel);
    if (form.matchDate) {
      const d = new Date(form.matchDate);
      const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
      parts.push(weekdays[d.getDay()]);
    }
    if (form.startTime) {
      parts.push(form.endTime ? `${form.startTime}-${form.endTime}` : form.startTime);
    }
    if (form.venueName) parts.push(form.venueName);
    if (form.levelRequired !== "any") {
      const lvl = ITF_LEVELS.find(l => l.value === form.levelRequired);
      if (lvl) parts.push(lvl.label.split(" - ")[1] ?? "");
    }
    if (parts.length > 0) {
      setForm(f => ({ ...f, title: parts.join(" · ") }));
      toast.success("标题已自动生成，可继续修改");
    } else {
      toast.info("请先填写比赛类型、时间或场地，再自动生成标题");
    }
  };

  const createMutation = trpc.match.create.useMutation({
    onSuccess: (data) => {
      toast.success("约球发布成功！");
      setCreatedMatch({
        id: (data as any).matchId ?? 0,
        title: form.title,
        matchType: form.matchType,
        levelRequired: form.levelRequired,
        matchDate: form.matchDate,
        startTime: form.startTime,
        endTime: form.endTime || null,
        venueName: form.venueName,
        venueAddress: form.venueAddress || null,
        courtNo: form.courtNo || null,
        imageUrl: form.imageUrl || null,
        currentParticipants: 1,
        maxParticipants: form.maxParticipants,
        costPerPerson: form.costPerPerson ? parseFloat(form.costPerPerson) : null,
        description: form.description || null,
      });
      setShowPoster(true);
    },
    onError: (e) => toast.error(e.message),
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#f5f7f5]">
        <Navbar />
        <div className="container py-20 text-center">
          <p className="text-muted-foreground mb-4">请先登录后再发布约球</p>
          <Button onClick={() => window.location.href = getLoginUrl()}>立即登录</Button>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error("请填写约球标题"); return; }
    if (!form.matchDate) { toast.error("请选择日期"); return; }
    if (!form.startTime) { toast.error("请选择开始时间"); return; }
    if (!form.venueName.trim()) { toast.error("请填写场地名称"); return; }
    // 去掉地址中的邮编（6位数字结尾）
    const cleanAddress = (addr: string) => addr.replace(/[,，]?\s*\d{6}\s*$/, "").trim();
    const payload = {
      ...form,
      endTime: form.endTime || undefined,
      venueAddress: form.venueAddress ? cleanAddress(form.venueAddress) : undefined,
      courtNo: form.courtNo || undefined,
      description: form.description || undefined,
      contactInfo: form.contactInfo || autoContact || undefined,
      costPerPerson: form.costPerPerson ? parseFloat(form.costPerPerson) : undefined,
      imageUrl: form.imageUrl || undefined,
      feeRequired: form.feeRequired,
      feePerPerson: form.feeRequired ? parseFloat(form.feePerPerson) : undefined,
    };
    createMutation.mutate(payload);
  };

  return (
    <div className="min-h-screen bg-[#f5f7f5]">
      <Navbar />

      {/* 顶部标题栏 */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="container max-w-2xl flex items-center gap-3 py-3">
          <button
            type="button"
            onClick={() => navigate("/matches")}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="font-bold text-lg flex-1">发布约球</h1>
          <Button
            type="button"
            size="sm"
            disabled={createMutation.isPending}
            onClick={handleSubmit as any}
            className="bg-primary text-white px-5"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "发布"}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="container max-w-2xl py-4 space-y-3 pb-28">

        {/* ── 1. 比赛类型 ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <SectionTitle icon={<span className="text-base">🎾</span>} title="比赛类型" required />
          <div className="grid grid-cols-5 gap-2">
            {MATCH_TYPES.map(t => (
              <button
                key={t.value}
                type="button"
                onClick={() => setForm(f => ({ ...f, matchType: t.value as any }))}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 rounded-xl border-2 text-xs font-medium transition-all",
                  form.matchType === t.value
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                )}
              >
                <span className="text-lg">{t.icon}</span>
                {t.label}
              </button>
            ))}
          </div>

          {/* NTRP 水平范围 */}
          <div className="mt-3">
            <Label className="text-xs text-muted-foreground mb-1.5 block">NTRP 水平范围（不填=不限）</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select value={form.ntrpMin !== undefined ? String(form.ntrpMin) : "any"} onValueChange={(v) => setForm({ ...form, ntrpMin: v === "any" ? undefined : Number(v) })}>
                <SelectTrigger className="bg-gray-50 border-0 h-10">
                  <SelectValue placeholder="最低水平" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">不限最低</SelectItem>
                  {NTRP_LEVELS.map(l => (
                    <SelectItem key={l.value} value={String(l.value)}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={form.ntrpMax !== undefined ? String(form.ntrpMax) : "any"} onValueChange={(v) => setForm({ ...form, ntrpMax: v === "any" ? undefined : Number(v) })}>
                <SelectTrigger className="bg-gray-50 border-0 h-10">
                  <SelectValue placeholder="最高水平" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">不限最高</SelectItem>
                  {NTRP_LEVELS.map(l => (
                    <SelectItem key={l.value} value={String(l.value)}>{l.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(form.ntrpMin !== undefined || form.ntrpMax !== undefined) && (
              <p className="text-xs text-primary mt-1.5">
                水平范围：{form.ntrpMin ?? "不限"} ~ {form.ntrpMax ?? "不限"}
              </p>
            )}
          </div>
        </div>

        {/* ── 2. 时间安排 ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <SectionTitle icon={<Calendar className="w-4 h-4" />} title="时间安排" required />

          {/* 日期 */}
          <div className="mb-3">
            <Label className="text-xs text-muted-foreground mb-1.5 block">活动日期</Label>
            <Input
              type="date"
              value={form.matchDate}
              onChange={(e) => setForm({ ...form, matchDate: e.target.value })}
              className="bg-gray-50 border-0 h-10"
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          {/* 开始时间 */}
          <div className="mb-3">
            <Label className="text-xs text-muted-foreground mb-1.5 block">开始时间</Label>
            <div className="grid grid-cols-2 gap-2">
              <Select value={startHour} onValueChange={(h) => {
                setStartHour(h);
                const st = `${h}:${startMinute}`;
                const et = calcEndTime(h, startMinute, duration);
                setForm(f => ({ ...f, startTime: st, endTime: et }));
              }}>
                <SelectTrigger className="bg-gray-50 border-0 h-10">
                  <SelectValue placeholder="选择小时" />
                </SelectTrigger>
                <SelectContent className="max-h-52">
                  {HOUR_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={startMinute} onValueChange={(m) => {
                setStartMinute(m);
                const st = `${startHour}:${m}`;
                const et = calcEndTime(startHour, m, duration);
                setForm(f => ({ ...f, startTime: startHour ? st : "", endTime: et }));
              }}>
                <SelectTrigger className="bg-gray-50 border-0 h-10">
                  <SelectValue placeholder="选择分钟" />
                </SelectTrigger>
                <SelectContent>
                  {MINUTE_OPTIONS.map(o => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 时长 */}
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">活动时长</Label>
            <div className="grid grid-cols-5 gap-1.5">
              {DURATION_OPTIONS.map(o => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => {
                    setDuration(o.value);
                    const et = calcEndTime(startHour, startMinute, o.value);
                    setForm(f => ({ ...f, endTime: et }));
                  }}
                  className={cn(
                    "py-2 rounded-lg text-xs font-medium border-2 transition-all",
                    duration === o.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
            {form.startTime && form.endTime && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-primary bg-primary/5 rounded-lg px-3 py-2">
                <Clock className="w-3.5 h-3.5" />
                <span className="font-medium">{form.startTime} — {form.endTime}</span>
              </div>
            )}
          </div>
        </div>

        {/* ── 3. 活动地点 ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <SectionTitle icon={<MapPin className="w-4 h-4" />} title="活动地点" required />

          {/* 已选球场展示 */}
          {selectedVenueId && (() => {
            const v = dbVenues?.find(x => x.id === selectedVenueId) ||
              { id: selectedVenueId, name: form.venueName, coverImage: form.imageUrl, district: '', address: form.venueAddress };
            return (
              <div className="mb-3 rounded-xl overflow-hidden border-2 border-primary relative">
                {v.coverImage && (
                  <div className="h-28 relative">
                    <img src={v.coverImage} alt={v.name} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-2 left-3 text-white">
                      <p className="font-semibold text-sm">{v.name}</p>
                      <p className="text-xs opacity-80">{v.address || form.venueAddress}</p>
                    </div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => { setSelectedVenueId(null); setForm(f => ({ ...f, venueName: "", venueAddress: "", imageUrl: "", latitude: undefined, longitude: undefined })); setImagePreview(""); }}
                  className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
                <div className="px-3 py-2 bg-primary/5 flex items-center gap-2">
                  <Building2 className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs text-primary font-medium">已选择球场 · 封面图已自动设为活动背景</span>
                </div>
              </div>
            );
          })()}

          {/* 搜索框 */}
          {!selectedVenueId && (
          <div className="relative mb-2">
            <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="搜索球场名称（如：莲花山网球场）"
              value={form.venueName}
              onChange={(e) => handleVenueInput(e.target.value)}
              onFocus={() => predictions.length > 0 && setShowPredictions(true)}
              onBlur={() => setTimeout(() => { setShowPredictions(false); setVenueSearchKeyword(""); }, 200)}
              className="pl-9 bg-gray-50 border-0 h-10"
            />
            {searchLoading && (
              <Loader2 className="absolute right-3 top-2.5 w-4 h-4 animate-spin text-muted-foreground" />
            )}
            {/* 数据库球场建议（优先显示） */}
            {venueSearchKeyword.length >= 1 && dbVenues && dbVenues.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 bg-white border rounded-xl shadow-lg mt-1 overflow-hidden">
                <div className="px-3 py-1.5 bg-primary/5 border-b">
                  <span className="text-xs text-primary font-medium flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> 深圳球场库
                  </span>
                </div>
                {dbVenues.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className="w-full text-left hover:bg-gray-50 text-sm border-b last:border-b-0 flex items-center gap-3 pr-3"
                    onMouseDown={() => handleSelectDbVenue(v)}
                  >
                    {v.coverImage ? (
                      <img src={v.coverImage} alt={v.name} className="w-16 h-12 object-cover flex-shrink-0" />
                    ) : (
                      <div className="w-16 h-12 bg-gray-100 flex items-center justify-center flex-shrink-0">
                        <Building2 className="w-5 h-5 text-gray-300" />
                      </div>
                    )}
                    <div className="flex-1 py-2">
                      <div className="font-medium text-foreground text-sm">{v.name}</div>
                      <div className="text-muted-foreground text-xs mt-0.5">{v.district || v.address}</div>
                    </div>
                  </button>
                ))}
                {/* 分隔线：高德搜索结果 */}
                {showPredictions && predictions.length > 0 && (
                  <>
                    <div className="px-3 py-1.5 bg-gray-50 border-b border-t">
                      <span className="text-xs text-muted-foreground">其他地点</span>
                    </div>
                    {predictions.map((p, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm border-b last:border-b-0 flex items-start gap-2"
                        onMouseDown={() => handleSelectPlace(p)}
                      >
                        <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div>
                          <div className="font-medium text-foreground">{p.name}</div>
                          <div className="text-muted-foreground text-xs mt-0.5">{typeof p.address === 'string' ? p.address : ''}</div>
                        </div>
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
            {/* 仅高德结果（无数据库匹配时） */}
            {venueSearchKeyword.length >= 1 && (!dbVenues || dbVenues.length === 0) && showPredictions && predictions.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 bg-white border rounded-xl shadow-lg mt-1 max-h-52 overflow-y-auto">
                {predictions.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm border-b last:border-b-0 flex items-start gap-2"
                    onMouseDown={() => handleSelectPlace(p)}
                  >
                    <MapPin className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="font-medium text-foreground">{p.name}</div>
                      <div className="text-muted-foreground text-xs mt-0.5">{typeof p.address === 'string' ? p.address : ''}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          )}

          {/* 场地号码 */}
          <Input
            placeholder="场地号码（选填，如：3号场、A场、室内场）"
            value={form.courtNo}
            onChange={(e) => setForm(f => ({ ...f, courtNo: e.target.value }))}
            className="bg-gray-50 border-0 h-10 mb-2"
          />

          {/* 已定位提示 */}
          {form.latitude && (
            <div className="flex items-center gap-1.5 text-xs text-green-600 bg-green-50 rounded-lg px-3 py-1.5 mb-2">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
              已定位坐标，活动将显示在地图上
            </div>
          )}

          {/* 地图 — 始终渲染，不可折叠 */}
          <div className="rounded-xl overflow-hidden border border-gray-100 h-52 relative">
            <MapView
              onMapReady={handleMapReady}
              className="w-full h-full"
            />
            {!mapReady && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                <div className="flex flex-col items-center gap-2 text-muted-foreground">
                  <Loader2 className="w-6 h-6 animate-spin" />
                  <span className="text-xs">地图加载中...</span>
                </div>
              </div>
            )}
            {mapReady && !form.latitude && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 text-white text-xs px-3 py-1.5 rounded-full pointer-events-none">
                搜索球场名称后可在地图定位
              </div>
            )}
          </div>
        </div>

        {/* ── 4. 人数与费用 ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <SectionTitle icon={<Users className="w-4 h-4" />} title="人数与费用" required />
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">需要人数</Label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg font-bold hover:bg-gray-200 transition-colors"
                  onClick={() => setForm(f => ({ ...f, maxParticipants: Math.max(2, f.maxParticipants - 1) }))}
                >−</button>
                <div className="flex-1 h-9 flex items-center justify-center bg-gray-50 rounded-lg font-bold text-lg">
                  {form.maxParticipants}
                </div>
                <button
                  type="button"
                  className="w-9 h-9 rounded-lg bg-gray-100 flex items-center justify-center text-lg font-bold hover:bg-gray-200 transition-colors"
                  onClick={() => setForm(f => ({ ...f, maxParticipants: Math.min(20, f.maxParticipants + 1) }))}
                >+</button>
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">人均费用（可选）</Label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-muted-foreground text-sm">¥</span>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  placeholder="0 = 免费"
                  value={form.costPerPerson}
                  onChange={(e) => setForm({ ...form, costPerPerson: e.target.value })}
                  className="pl-7 bg-gray-50 border-0 h-9"
                />
              </div>
            </div>
          </div>

          {/* 费用分摊方式 */}
          <div className="mb-3">
            <Label className="text-xs text-muted-foreground mb-1.5 block">费用分摊方式</Label>
            <div className="grid grid-cols-4 gap-1.5">
              {COST_SPLIT_TYPES.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, costSplitType: t.value as any }))}
                  className={cn(
                    "flex flex-col items-center gap-1 py-2 rounded-xl border-2 text-xs font-medium transition-all",
                    form.costSplitType === t.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-gray-100 bg-gray-50 text-gray-600 hover:border-gray-200"
                  )}
                >
                  <span className="text-base">{t.icon}</span>
                  <span className="text-[10px] leading-tight text-center">{t.label.split('（')[0]}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 是否自带球 */}
          <div className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2.5 mb-3">
            <div>
              <p className="text-sm font-medium">需要自带球</p>
              <p className="text-xs text-muted-foreground">参与者需自带网球</p>
            </div>
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, bringOwnBall: !f.bringOwnBall }))}
              className={cn(
                "w-11 h-6 rounded-full transition-colors relative",
                form.bringOwnBall ? "bg-primary" : "bg-gray-200"
              )}
            >
              <span className={cn(
                "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                form.bringOwnBall ? "translate-x-5" : "translate-x-0.5"
              )} />
            </button>
          </div>

          {/* 微信支付托管 */}
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-primary/5 border border-primary/20 rounded-xl px-3 py-2.5">
              <div>
                <p className="text-sm font-medium text-primary">开启微信支付托管</p>
                <p className="text-xs text-primary/70">报名时需预付场地费，成局后结算给发起者</p>
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, feeRequired: !f.feeRequired }))}
                className={cn(
                  "w-11 h-6 rounded-full transition-colors relative",
                  form.feeRequired ? "bg-primary" : "bg-gray-200"
                )}
              >
                <span className={cn(
                  "absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
                  form.feeRequired ? "translate-x-5" : "translate-x-0.5"
                )} />
              </button>
            </div>

            {form.feeRequired && (
              <div className="bg-white border-2 border-primary/20 rounded-xl p-3 animate-in fade-in slide-in-from-top-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block">预付人均费用</Label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-primary font-bold text-sm">¥</span>
                  <Input
                    type="number"
                    min={0.01}
                    step={0.01}
                    placeholder="输入需预付的金额"
                    value={form.feePerPerson}
                    onChange={(e) => setForm({ ...form, feePerPerson: e.target.value })}
                    className="pl-7 bg-gray-50 border-0 h-9 text-primary font-bold"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-2">
                  * 开启后，参与者点击“参加”将直接跳转微信支付。资金将由平台托管，球局结束后自动结算。
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── 5. 活动说明 ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <SectionTitle icon={<FileText className="w-4 h-4" />} title="活动说明" />
          <Textarea
            placeholder="介绍一下这次约球的详情、要求、注意事项等..."
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="bg-gray-50 border-0 resize-none"
            rows={3}
          />
        </div>

        {/* ── 6. 联系方式 ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <SectionTitle icon={<Phone className="w-4 h-4" />} title="联系方式" />
          <Input
            placeholder="微信号、手机号等"
            value={form.contactInfo || autoContact}
            onChange={(e) => setForm({ ...form, contactInfo: e.target.value })}
            className="bg-gray-50 border-0 h-10"
          />
          {autoContact && !form.contactInfo && (
            <p className="text-xs text-muted-foreground mt-1.5">已自动带入您的联系方式，可直接修改</p>
          )}
        </div>

        {/* ── 7. 约球标题（自动生成，放最后） ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <SectionTitle icon={<Sparkles className="w-4 h-4" />} title="约球标题" required />
          <p className="text-xs text-muted-foreground mb-2">
            填写上方信息后可一键生成，也可自行编写
          </p>
          <div className="relative">
            <Input
              placeholder="例：双打 · 周六 · 14:00-16:00 · 莲花山网球场"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="bg-gray-50 border-0 h-10 pr-24"
            />
            <button
              type="button"
              onClick={handleAutoTitle}
              className="absolute right-2 top-1.5 flex items-center gap-1 text-xs text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/20 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
            >
              <Sparkles className="w-3 h-3" />
              自动生成
            </button>
          </div>
          {form.title && (
            <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
              <span className="text-green-500">✓</span> 标题已填写，可继续修改
            </p>
          )}
        </div>

        {/* ── 8. 活动图片（放最后） ── */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <SectionTitle icon={<ImageIcon className="w-4 h-4" />} title="活动图片（可选）" />
          {imagePreview ? (
            <div className="relative w-full h-44 rounded-xl overflow-hidden">
              <img src={imagePreview} alt="活动图片" className="w-full h-full object-cover" />
              <button
                type="button"
                className="absolute top-2 right-2 bg-black/50 text-white rounded-full p-1.5 hover:bg-black/70 transition-colors"
                onClick={() => { setImagePreview(""); setForm(f => ({ ...f, imageUrl: "" })); }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingImage}
              className="w-full h-28 border-2 border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors bg-gray-50"
            >
              {uploadingImage ? (
                <><Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">上传中...</span></>
              ) : (
                <><Upload className="w-6 h-6" /><span className="text-sm">点击上传活动图片（最大10MB）</span></>
              )}
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
          <p className="text-xs text-muted-foreground mt-2 text-center">
            ⚠️ 请勿上传违法违规、色情暴力等非法图片，违者将被封号处理
          </p>
        </div>

        {/* 底部发布按钮（固定底部，所有设备可见） */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t px-4 py-3 z-10">
          <div className="max-w-2xl mx-auto flex items-center gap-3">
            <div className="flex-1 text-sm text-muted-foreground">
              {form.title ? (
                <span className="font-medium text-foreground truncate block">{form.title}</span>
              ) : (
                <span>填写完信息后点击发布</span>
              )}
            </div>
            <Button
              type="submit"
              className="h-11 px-8 text-base font-semibold shrink-0"
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />发布中...</>
              ) : "✅ 发布约球"}
            </Button>
          </div>
        </div>

      </form>

      {/* 发布成功后分享海报弹窗 */}
      {createdMatch && (
        <MatchSharePoster
          open={showPoster}
          onClose={() => {
            setShowPoster(false);
            navigate("/matches");
          }}
          match={createdMatch}
        />
      )}
    </div>
  );
}
