import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { ArrowRight, Award, Calendar, CheckCircle, ChevronRight, MapPin, MessageSquare, Shield, Star, Swords, Trophy, Users, Zap } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/tennis/Navbar";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const { data: coaches } = trpc.coach.list.useQuery({ limit: 3 });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ─── Hero Section ──────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 bg-court" />
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 60px, rgba(255,255,255,0.1) 60px, rgba(255,255,255,0.1) 61px),
              repeating-linear-gradient(90deg, transparent, transparent 60px, rgba(255,255,255,0.1) 60px, rgba(255,255,255,0.1) 61px)`
          }}
        />

        <div className="container relative py-20 md:py-28">
          {/* City selector */}
          <div className="flex justify-center mb-10 animate-fade-in">
            <div className="flex items-center gap-3 bg-white/15 backdrop-blur-md border border-white/30 rounded-2xl px-5 py-3">
              <MapPin className="w-5 h-5 text-accent shrink-0" />
              <span className="text-white font-semibold text-lg">深圳</span>
              <span className="text-white/40 text-sm">|</span>
              <span className="text-white/60 text-sm">更多城市即将开放</span>
            </div>
          </div>

          {/* Title */}
          <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold text-white text-center leading-tight mb-4 animate-slide-up">
            AceBook
          </h1>
          <p className="text-white/70 text-center text-base md:text-lg mb-14 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            约球 · 找教练 · 一站式网球服务
          </p>

          {/* Dual Entry Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto animate-slide-up items-stretch" style={{ animationDelay: "0.2s" }}>
            {/* 约球 */}
            <Link href="/matches" className="flex">
              <div className="group relative bg-white/10 hover:bg-white/18 backdrop-blur-md border border-white/20 hover:border-white/40 rounded-2xl p-8 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl w-full flex flex-col">
                <div className="w-14 h-14 rounded-2xl bg-accent/90 flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <Swords className="w-7 h-7 text-foreground" />
                </div>
                <h2 className="font-serif text-2xl font-bold text-white mb-2">约球</h2>
                <p className="text-white/70 text-sm leading-relaxed mb-6">
                  发布或加入球局，快速找到球友，一起上场打球
                </p>
                <div className="flex items-center text-accent font-semibold text-sm mt-auto">
                  立即约球 <ArrowRight className="ml-1.5 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>

            {/* 找教练 */}
            <Link href="/coaches" className="flex">
              <div className="group relative bg-white/10 hover:bg-white/18 backdrop-blur-md border border-white/20 hover:border-white/40 rounded-2xl p-8 cursor-pointer transition-all duration-200 hover:scale-[1.02] hover:shadow-2xl w-full flex flex-col">
                <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-200">
                  <Trophy className="w-7 h-7 text-white" />
                </div>
                <h2 className="font-serif text-2xl font-bold text-white mb-2">找教练</h2>
                <p className="text-white/70 text-sm leading-relaxed mb-6">
                  匹配全国顶级职业教练，一键预约，在线支付，精准提升
                </p>
                <div className="flex items-center text-white/80 font-semibold text-sm mt-auto">
                  浏览教练 <ArrowRight className="ml-1.5 w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          </div>

          {/* Platform Feature Pills */}
          <div className="flex flex-wrap justify-center gap-3 mt-12 animate-slide-up" style={{ animationDelay: "0.3s" }}>
            {[
              { icon: "🎾", text: "找球友一起打球" },
              { icon: "🎫", text: "预约职业私教" },
              { icon: "📍", text: "全国优质场地" },
              { icon: "👥", text: "网球社区平台" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-4 py-2">
                <span className="text-base">{item.icon}</span>
                <span className="text-white/90 text-sm font-medium">{item.text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Wave divider */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
            <path d="M0 80L1440 80L1440 40C1200 80 960 0 720 40C480 80 240 0 0 40L0 80Z" fill="oklch(0.98 0.005 95)" />
          </svg>
        </div>
      </section>

      {/* ─── Features ──────────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl font-bold text-foreground mb-4">
              为什么选择 AceBook
            </h2>
            <p className="text-muted-foreground text-lg max-w-xl mx-auto">
              从预约到上课，全程数字化管理，让每一次训练都高效而愉悦
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div key={f.title} className="card-elegant p-6 animate-slide-up" style={{ animationDelay: `${i * 0.05}s` }}>
                <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <f.icon className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground text-lg mb-2">{f.title}</h3>
                <p className="text-muted-foreground text-sm leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Coaches Preview ───────────────────────────────────────────────── */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="font-serif text-4xl font-bold text-foreground mb-3">
                精选教练
              </h2>
              <p className="text-muted-foreground">每位教练均经过严格资质审核</p>
            </div>
            <Link href="/coaches">
              <Button variant="ghost" className="text-primary font-medium">
                查看全部 <ChevronRight className="ml-1 w-4 h-4" />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {coaches && coaches.length > 0 ? (
              coaches.map((coach) => (
                <CoachCard key={coach.id} coach={coach} />
              ))
            ) : (
              // Placeholder cards when no coaches yet
              placeholderCoaches.map((coach) => (
                <CoachCard key={coach.id} coach={coach} isPlaceholder />
              ))
            )}
          </div>
        </div>
      </section>

      {/* ─── How It Works ──────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="font-serif text-4xl font-bold text-foreground mb-4">
              四步开始训练
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={step.title} className="text-center animate-slide-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="relative inline-flex mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-court flex items-center justify-center shadow-lg">
                    <step.icon className="w-7 h-7 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-accent text-foreground text-xs font-bold flex items-center justify-center">
                    {i + 1}
                  </div>
                </div>
                <h3 className="font-semibold text-foreground mb-2">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.desc}</p>
                {i < 3 && (
                  <div className="hidden md:block absolute right-0 top-8 text-muted-foreground">
                    <ChevronRight className="w-5 h-5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Venues Preview ────────────────────────────────────────────────── */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="font-serif text-4xl font-bold text-foreground mb-4">
              深圳优质场地
            </h2>
            <p className="text-muted-foreground">覆盖大学城、南山、福田三大区域</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {venueAreas.map((area) => (
              <div key={area.name} className="card-elegant overflow-hidden">
                <div className="h-32 bg-court-light flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 text-primary mx-auto mb-2" />
                    <div className="font-serif font-bold text-2xl text-primary">{area.name}</div>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-muted-foreground text-sm mb-3">{area.desc}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {area.venues.map(v => (
                      <span key={v} className="text-xs px-2 py-1 bg-muted rounded-md text-muted-foreground">{v}</span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ───────────────────────────────────────────────────────────── */}
      <section className="py-20">
        <div className="container">
          <div className="bg-court rounded-2xl p-12 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-10"
              style={{
                backgroundImage: `radial-gradient(circle at 20% 50%, oklch(0.82 0.16 120), transparent 50%),
                  radial-gradient(circle at 80% 50%, oklch(0.82 0.16 120), transparent 50%)`
              }}
            />
            <div className="relative">
              <h2 className="font-serif text-4xl font-bold text-white mb-4">
                开始您的网球之旅
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-md mx-auto">
                现在注册，即可享受首课优惠。专业教练，精准提升，从今天开始。
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link href="/coaches">
                  <Button size="lg" className="bg-accent text-foreground hover:bg-accent/90 font-semibold px-8 h-12 rounded-xl">
                    立即预约
                  </Button>
                </Link>
                {!isAuthenticated && (
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white/40 text-white hover:bg-white/10 h-12 px-8 rounded-xl"
                    onClick={() => window.location.href = '/login'}
                  >
                    免费注册
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Footer ────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border/50 py-10">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-court rounded-lg flex items-center justify-center">
                <Trophy className="w-3.5 h-3.5 text-white" />
              </div>
              <span className="font-serif font-semibold text-foreground">AceBook</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © 2025 AceBook · 全国网球约球平台 · 约球 · 找教练
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function CoachCard({ coach, isPlaceholder }: { coach: any; isPlaceholder?: boolean }) {
  return (
    <div className={`card-elegant overflow-hidden ${isPlaceholder ? "opacity-70" : ""}`}>
      <div className="h-48 bg-court-light flex items-center justify-center relative">
        {coach.avatar ? (
          <img src={coach.avatar} alt={coach.displayName} className="w-full h-full object-cover" />
        ) : (
          <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center">
            <span className="font-serif text-3xl font-bold text-primary">
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
        <div className="flex items-start justify-between mb-2">
          <div>
            <h3 className="font-semibold text-foreground text-lg">{coach.displayName}</h3>
            <p className="text-muted-foreground text-sm mt-0.5 line-clamp-1">{coach.tagline}</p>
          </div>
          <div className="text-right shrink-0 ml-3">
            <div className="price-tag text-lg">¥{coach.pricePerHour}</div>
            <div className="text-xs text-muted-foreground">/小时</div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-3 mb-4">
          <div className="flex items-center gap-1">
            <Star className="w-3.5 h-3.5 star-rating fill-current" />
            <span className="text-sm font-medium">{coach.avgRating ?? "5.0"}</span>
          </div>
          <div className="text-muted-foreground text-xs">·</div>
          <div className="text-sm text-muted-foreground">{coach.totalLessons} 课时</div>
          <div className="text-muted-foreground text-xs">·</div>
          <div className="text-sm text-muted-foreground">{coach.yearsExperience} 年经验</div>
        </div>

        {coach.specialties && coach.specialties.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {(coach.specialties as string[]).slice(0, 3).map((s: string) => (
              <span key={s} className="text-xs px-2 py-0.5 bg-primary/8 text-primary rounded-md">{s}</span>
            ))}
          </div>
        )}

        {!isPlaceholder && (
          <Link href={`/coaches/${coach.id}`}>
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg">
              查看详情 · 预约课程
            </Button>
          </Link>
        )}
        {isPlaceholder && (
          <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg" disabled>
            即将开放
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Static Data ──────────────────────────────────────────────────────────────
const features = [
  { icon: Trophy, title: "顶级职业教练", desc: "所有教练均为前ATP职业球员或国家级认证教练，水平卓越，经验丰富。" },
  { icon: Calendar, title: "灵活约课系统", desc: "在线选择教练、时间、场地，一键完成预约，告别繁琐的点对点沟通。" },
  { icon: MapPin, title: "全国场地覆盖", desc: "覆盖全国主要城市优质网球场地，就近选择，方便快捷。" },
  { icon: Shield, title: "安全在线支付", desc: "支持微信支付，课程费用安全托管，取消可退款，保障双方权益。" },
  { icon: Zap, title: "实时通知提醒", desc: "预约确认、取消、上课提醒全程推送，信息零延迟，再也不会错过课程。" },
  { icon: MessageSquare, title: "真实学员评价", desc: "每节课后学员可留下真实评价，帮助您选择最适合的教练。" },
];

const steps = [
  { icon: Users, title: "选择教练", desc: "浏览教练档案，查看背景、评价和定价" },
  { icon: Calendar, title: "选择时间", desc: "查看教练可用时间，选择最适合的时段" },
  { icon: MapPin, title: "选择场地", desc: "从全国各城市优质场地中选择" },
  { icon: CheckCircle, title: "支付确认", desc: "在线支付，预约即刻确认，双方同时收到通知" },
];

// 城市扩展预留：当前只激活深圳，后续开放其他城市时展开此数组
const venueAreas = [
  {
    name: "大学城",
    desc: "深圳大学城核心区域，学术氛围浓厚，场地设施完善，适合专业训练。",
    venues: ["大学城体育中心", "深大粤海校区"],
  },
  {
    name: "南山",
    desc: "科技创新中心，高端场地云集，室内外兼备，不受天气影响。",
    venues: ["粤海文体中心", "蛇口体育中心", "深圳湾体育中心"],
  },
  {
    name: "福田",
    desc: "CBD核心地带，专业场地资源丰富，交通便利，配套设施完善。",
    venues: ["香蜜体育中心", "中心公园体育中心", "黑马俱乐部"],
  },
];

const placeholderCoaches = [
  {
    id: 1,
    displayName: "张威教练",
    tagline: "前ATP职业球员 · 12年执教经验",
    pricePerHour: "700",
    avgRating: "4.97",
    totalLessons: 856,
    yearsExperience: 12,
    isVerified: true,
    specialties: ["发球技术", "底线对抗", "竞技提升"],
  },
  {
    id: 2,
    displayName: "李明教练",
    tagline: "国家队前成员 · 专注青少年培训",
    pricePerHour: "600",
    avgRating: "4.95",
    totalLessons: 623,
    yearsExperience: 8,
    isVerified: true,
    specialties: ["青少年培训", "基础技术", "战术体系"],
  },
  {
    id: 3,
    displayName: "王芳教练",
    tagline: "WTA职业球员 · 女子专项教练",
    pricePerHour: "800",
    avgRating: "5.0",
    totalLessons: 412,
    yearsExperience: 10,
    isVerified: true,
    specialties: ["网前截击", "发球技术", "体能训练"],
  },
];
