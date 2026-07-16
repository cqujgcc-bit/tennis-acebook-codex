import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

import { Award, Calendar, ChevronLeft, Clock, ExternalLink, MapPin, Share2, Shield, Star, Trophy, Users } from "lucide-react";
import { Link, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/tennis/Navbar";
import { toast } from "sonner";

export default function CoachDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const { data, isLoading } = trpc.coach.getById.useQuery({ id: parseInt(id) });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-12">
          <div className="animate-pulse space-y-4">
            <div className="h-64 bg-muted rounded-2xl" />
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="h-4 bg-muted rounded w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;
  const { coach, reviews, venues, availability, reservedSlots } = data;

  const handleShare = () => {
    const url = `${window.location.origin}/coach/${coach.shareSlug}`;
    navigator.clipboard.writeText(url);
    toast.success("分享链接已复制");
  };

  // Build booking URL with prefilled params from a reserved slot
  const buildBookingUrl = (slot: any) => {
    const params = new URLSearchParams({
      date: slot.specificDate,
      startTime: slot.startTime,
      endTime: slot.endTime,
      ...(slot.venueId ? { venueId: String(slot.venueId) } : {}),
    });
    return `/book/${coach.id}?${params.toString()}`;
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Cover */}
      <div className="h-48 bg-court relative">
        <div className="absolute inset-0 opacity-20"
          style={{ background: "radial-gradient(ellipse at 30% 50%, oklch(0.82 0.16 120), transparent 60%)" }}
        />
      </div>

      <div className="container pb-16">
        {/* Back */}
        <Link href="/coaches">
          <button className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mt-4 mb-6 transition-colors">
            <ChevronLeft className="w-4 h-4" />
            返回教练列表
          </button>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left: Coach Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Profile Header */}
            <div className="card-elegant p-6">
              <div className="flex items-start gap-5">
                <div className="w-24 h-24 rounded-2xl bg-court-light flex items-center justify-center shrink-0 overflow-hidden">
                  {coach.avatar ? (
                    <img src={coach.avatar} alt={coach.displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-serif text-4xl font-bold text-primary">
                      {coach.displayName.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-serif text-3xl font-bold text-foreground">{coach.displayName}</h1>
                    {coach.isVerified && (
                      <span className="badge-verified">
                        <Shield className="w-3 h-3" />
                        已认证
                      </span>
                    )}
                  </div>
                  <p className="text-muted-foreground mt-1">{coach.tagline}</p>

                  <div className="flex flex-wrap items-center gap-4 mt-3">
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 star-rating fill-current" />
                      <span className="font-semibold">{coach.avgRating}</span>
                      <span className="text-muted-foreground text-sm">({reviews.length} 评价)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                      <Clock className="w-4 h-4" />
                      {coach.yearsExperience} 年执教
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                      <Users className="w-4 h-4" />
                      {coach.totalStudents} 名学员
                    </div>
                    <div className="flex items-center gap-1.5 text-muted-foreground text-sm">
                      <Trophy className="w-4 h-4" />
                      {coach.totalLessons} 课时
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" onClick={handleShare} className="shrink-0">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Bio */}
            {coach.bio && (
              <div className="card-elegant p-6">
                <h2 className="font-serif text-xl font-semibold mb-3">教练简介</h2>
                <p className="text-muted-foreground leading-relaxed">{coach.bio}</p>
              </div>
            )}

            {/* Certifications */}
            {coach.certifications && (coach.certifications as string[]).length > 0 && (
              <div className="card-elegant p-6">
                <h2 className="font-serif text-xl font-semibold mb-4">资质认证</h2>
                <div className="space-y-2">
                  {(coach.certifications as string[]).map((cert) => (
                    <div key={cert} className="flex items-center gap-2.5">
                      <Award className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm text-foreground">{cert}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Specialties */}
            {coach.specialties && (coach.specialties as string[]).length > 0 && (
              <div className="card-elegant p-6">
                <h2 className="font-serif text-xl font-semibold mb-4">擅长方向</h2>
                <div className="flex flex-wrap gap-2">
                  {(coach.specialties as string[]).map((s) => (
                    <span key={s} className="px-3 py-1.5 bg-primary/8 text-primary rounded-full text-sm font-medium">{s}</span>
                  ))}
                </div>
              </div>
            )}

            {/* Achievements */}
            {coach.achievements && (coach.achievements as string[]).length > 0 && (
              <div className="card-elegant p-6">
                <h2 className="font-serif text-xl font-semibold mb-4">荣誉成就</h2>
                <div className="space-y-2">
                  {(coach.achievements as string[]).map((a) => (
                    <div key={a} className="flex items-center gap-2.5">
                      <Trophy className="w-4 h-4 text-yellow-500 shrink-0" />
                      <span className="text-sm text-foreground">{a}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Video Introduction - only show when content is approved */}
            {(coach as any).contentReviewStatus === "approved" && (coach as any).videoUrl && (
              <div className="card-elegant p-6">
                <h2 className="font-serif text-xl font-semibold mb-4">视频介绍</h2>
                <div className="aspect-video rounded-xl overflow-hidden bg-black">
                  {(() => {
                    const url: string = (coach as any).videoUrl;
                    // Bilibili
                    const bvMatch = url.match(/bilibili\.com\/video\/(BV[\w]+)/);
                    if (bvMatch) {
                      return <iframe src={`https://player.bilibili.com/player.html?bvid=${bvMatch[1]}&page=1&high_quality=1`} className="w-full h-full" allowFullScreen scrolling="no" frameBorder="0" />;
                    }
                    // YouTube
                    const ytMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]+)/);
                    if (ytMatch) {
                      return <iframe src={`https://www.youtube.com/embed/${ytMatch[1]}`} className="w-full h-full" allowFullScreen frameBorder="0" />;
                    }
                    // Fallback: link
                    return (
                      <div className="w-full h-full flex items-center justify-center">
                        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-white hover:text-primary transition-colors">
                          <ExternalLink className="w-5 h-5" />
                          <span>点击观看视频介绍</span>
                        </a>
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Social Media Links - only show when content is approved */}
            {(coach as any).contentReviewStatus === "approved" && (coach as any).socialLinks && Object.values((coach as any).socialLinks as Record<string, string>).some(v => v) && (
              <div className="card-elegant p-6">
                <h2 className="font-serif text-xl font-semibold mb-4">社交媒体</h2>
                <div className="flex flex-wrap gap-3">
                  {Object.entries((coach as any).socialLinks as Record<string, string>).map(([key, val]) => {
                    if (!val) return null;
                    const labels: Record<string, string> = { xiaohongshu: "小红书", wechat: "微信公众号", weibo: "微博", douyin: "抖音", other: "其他" };
                    const isUrl = val.startsWith("http");
                    return (
                      <a
                        key={key}
                        href={isUrl ? val : undefined}
                        target={isUrl ? "_blank" : undefined}
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full border border-border hover:border-primary hover:text-primary transition-colors text-sm"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {labels[key] ?? key}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Reserved Slots (Available Time Slots) */}
            {reservedSlots && reservedSlots.length > 0 && (
              <div className="card-elegant p-6">
                <h2 className="font-serif text-xl font-semibold mb-4">可预约时段</h2>
                <p className="text-sm text-muted-foreground mb-4">以下时段教练已预留场地，可直接选择预约</p>
                <div className="space-y-3">
                  {reservedSlots.map((slot: any) => (
                    <div key={slot.id} className="flex items-center justify-between gap-3 p-4 rounded-xl border border-border/60 bg-card hover:border-primary/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                            {slot.specificDate}
                          </div>
                          <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                            {slot.startTime} – {slot.endTime}
                          </div>
                        </div>
                        {slot.venueName && (
                          <div className="flex items-center gap-1.5 mt-1.5 text-sm text-muted-foreground">
                            <MapPin className="w-3.5 h-3.5 shrink-0 text-primary/70" />
                            <span>{slot.venueName}{slot.courtNo ? ` · ${slot.courtNo}` : ""}</span>
                            {slot.venueMapUrl && (
                              <a
                                href={slot.venueMapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-0.5 text-xs text-primary hover:underline ml-1"
                                onClick={e => e.stopPropagation()}
                              >
                                <ExternalLink className="w-3 h-3" />
                                导航
                              </a>
                            )}
                          </div>
                        )}
                        {slot.venueNote && (
                          <div className="mt-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                            {slot.venueNote}
                          </div>
                        )}
                      </div>
                      {isAuthenticated ? (
                        <Link href={buildBookingUrl(slot)}>
                          <Button size="sm" className="shrink-0 bg-primary text-primary-foreground">
                            立即预约
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          size="sm"
                          className="shrink-0"
                          variant="outline"
                          onClick={() => window.location.href = '/login'}
                        >
                          登录预约
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly Availability */}
            {(() => {
              const weeklySlots = (availability ?? []).filter((s: any) => s.dayOfWeek !== null && s.dayOfWeek !== undefined);
              if (weeklySlots.length === 0) return null;
              const DAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
              const grouped: Record<number, any[]> = {};
              weeklySlots.forEach((s: any) => {
                if (!grouped[s.dayOfWeek]) grouped[s.dayOfWeek] = [];
                grouped[s.dayOfWeek].push(s);
              });
              const sortedDays = Object.keys(grouped).map(Number).sort((a, b) => {
                // Sort Mon–Sun (1-6, then 0)
                const order = [1,2,3,4,5,6,0];
                return order.indexOf(a) - order.indexOf(b);
              });
              // Get today's dayOfWeek to highlight
              const todayDow = new Date().getDay();
              // Helper: split a time range into 1-hour slots
              const splitIntoHourSlots = (startTime: string, endTime: string): Array<{start: string; end: string}> => {
                const [sh, sm] = startTime.split(":").map(Number);
                const [eh, em] = endTime.split(":").map(Number);
                const startMin = sh * 60 + sm;
                const endMin = eh * 60 + em;
                const slots: Array<{start: string; end: string}> = [];
                for (let t = startMin; t + 60 <= endMin; t += 60) {
                  const s = `${String(Math.floor(t/60)).padStart(2,"0")}:${String(t%60).padStart(2,"0")}`;
                  const e = `${String(Math.floor((t+60)/60)).padStart(2,"0")}:${String((t+60)%60).padStart(2,"0")}`;
                  slots.push({ start: s, end: e });
                }
                return slots;
              };

              return (
                <div className="card-elegant p-6">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="w-4 h-4 text-primary" />
                    <h2 className="font-serif text-xl font-semibold">每周固定空闲</h2>
                  </div>
                  <p className="text-sm text-muted-foreground mb-4">点击具体时段可直接发起预约（1小时/节）</p>
                  <div className="space-y-3">
                    {sortedDays.map(day => (
                      <div key={day} className={`rounded-xl border p-3.5 transition-colors ${
                        day === todayDow ? "border-primary/40 bg-primary/5" : "border-border/60 bg-card"
                      }`}>
                        <div className="flex items-center gap-2 mb-2.5">
                          <span className={`text-sm font-semibold ${
                            day === todayDow ? "text-primary" : "text-foreground"
                          }`}>{DAY_NAMES[day]}</span>
                          {day === todayDow && (
                            <span className="text-xs px-1.5 py-0.5 bg-primary/15 text-primary rounded-full">今天</span>
                          )}
                          {/* Show full availability range as hint */}
                          <span className="text-xs text-muted-foreground ml-1">
                            {grouped[day].map((s: any) => `${s.startTime.slice(0,5)}–${s.endTime.slice(0,5)}`).join("、")}
                          </span>
                        </div>
                        {/* Render 1-hour sub-slots for each availability range */}
                        <div className="flex flex-wrap gap-1.5">
                          {grouped[day].flatMap((s: any) =>
                            splitIntoHourSlots(s.startTime.slice(0,5), s.endTime.slice(0,5)).map(slot => (
                              isAuthenticated ? (
                                <Link
                                  key={`${s.id}-${slot.start}`}
                                  href={`/book/${coach.id}?weekday=${day}&startTime=${slot.start}&endTime=${slot.end}`}
                                >
                                  <button className="text-xs px-2.5 py-1.5 rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground transition-colors font-medium">
                                    {slot.start}–{slot.end}
                                  </button>
                                </Link>
                              ) : (
                                <button
                                  key={`${s.id}-${slot.start}`}
                                  className="text-xs px-2.5 py-1.5 rounded-lg border border-primary/30 bg-primary/5 text-primary hover:bg-primary hover:text-primary-foreground transition-colors font-medium"
                                  onClick={() => window.location.href = '/login'}
                                >
                                  {slot.start}–{slot.end}
                                </button>
                              )
                            ))
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

            {/* Venues */}
            {venues.length > 0 && (
              <div className="card-elegant p-6">
                <h2 className="font-serif text-xl font-semibold mb-4">常用场地</h2>
                <div className="space-y-3">
                  {venues.map(({ venue, isPreferred }) => (
                    <div key={venue.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm">{venue.name}</span>
                          {isPreferred && (
                            <span className="text-xs px-1.5 py-0.5 bg-primary/10 text-primary rounded">首选</span>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{venue.address}</div>
                        <div className="text-xs text-muted-foreground">{venue.area} · {venue.openTime}-{venue.closeTime}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            {reviews.length > 0 && (
              <div className="card-elegant p-6">
                <h2 className="font-serif text-xl font-semibold mb-4">学员评价</h2>
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="pb-4 border-b border-border/50 last:border-0 last:pb-0">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map(s => (
                            <Star key={s} className={`w-3.5 h-3.5 ${s <= review.rating ? "star-rating fill-current" : "text-muted-foreground"}`} />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(review.createdAt).toLocaleDateString("zh-CN")}
                        </span>
                      </div>
                      {review.content && <p className="text-sm text-foreground">{review.content}</p>}
                      {review.tags && (review.tags as string[]).length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {(review.tags as string[]).map(t => (
                            <span key={t} className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">{t}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: Booking Card */}
          <div className="lg:col-span-1">
            <div className="card-elegant p-6 sticky top-24">
              <div className="text-center mb-5">
                <div className="price-tag text-4xl">¥{coach.pricePerHour}</div>
                <div className="text-muted-foreground text-sm mt-1">/小时</div>
              </div>

              <Separator className="mb-5" />

              <div className="space-y-3 mb-6">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">课程时长</span>
                  <span className="font-medium">60 分钟起</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">上课地点</span>
                  <span className="font-medium">大学城/南山/福田</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">响应时间</span>
                  <span className="font-medium text-green-600">通常 2 小时内</span>
                </div>
                {reservedSlots && reservedSlots.length > 0 && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">可预约时段</span>
                    <span className="font-medium text-primary">{reservedSlots.length} 个</span>
                  </div>
                )}
              </div>

              {isAuthenticated ? (
                <Link href={`/book/${coach.id}`}>
                  <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-12 text-base font-semibold">
                    <Calendar className="mr-2 w-4 h-4" />
                    立即预约课程
                  </Button>
                </Link>
              ) : (
                <Button
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl h-12 text-base font-semibold"
                  onClick={() => window.location.href = '/login'}
                >
                  登录后预约
                </Button>
              )}

              <p className="text-xs text-muted-foreground text-center mt-3">
                支持微信支付 · 可取消退款
              </p>

              {/* Invite Code */}
              {coach.inviteCode && (
                <div className="mt-5 p-3 bg-muted/50 rounded-lg text-center">
                  <div className="text-xs text-muted-foreground mb-1">教练邀请码</div>
                  <div className="font-mono font-bold text-primary text-lg tracking-widest">{coach.inviteCode}</div>
                  <div className="text-xs text-muted-foreground mt-1">首课可享优惠</div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
