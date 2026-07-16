import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { Calendar, Check, ChevronLeft, ChevronRight, Clock, CreditCard, MapPin, Shield, Star, Tag, Trophy, User } from "lucide-react";
import { useState, useMemo } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import Navbar from "@/components/tennis/Navbar";
import { toast } from "sonner";

const STEPS = ["选择时间", "选择场地", "确认支付"];

const TIME_SLOTS = [
  "08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"
];

const DURATION_OPTIONS = [
  { value: "1", label: "1 小时", desc: "标准课程" },
  { value: "1.5", label: "1.5 小时", desc: "强化课程" },
  { value: "2", label: "2 小时", desc: "精英课程" },
];

export default function BookingFlow() {
  const { coachId } = useParams<{ coachId: string }>();
  const { isAuthenticated, user } = useAuth();
  const [, navigate] = useLocation();

  // Parse prefilled params from reserved slot link
  const searchParams = new URLSearchParams(window.location.search);
  const prefillDate = searchParams.get("date") ?? "";
  const prefillStartTime = searchParams.get("startTime") ?? "";
  const prefillEndTime = searchParams.get("endTime") ?? "";
  const prefillVenueId = searchParams.get("venueId") ? parseInt(searchParams.get("venueId")!) : null;

  // Compute prefill duration from start/end times
  const prefillDuration = useMemo(() => {
    if (!prefillStartTime || !prefillEndTime) return "1";
    const [sh, sm] = prefillStartTime.split(":").map(Number);
    const [eh, em] = prefillEndTime.split(":").map(Number);
    const diff = (eh * 60 + em - sh * 60 - sm) / 60;
    if (diff === 1.5) return "1.5";
    if (diff === 2) return "2";
    return "1";
  }, [prefillStartTime, prefillEndTime]);

  // If all required params are prefilled (from reserved slot link), skip to payment step
  const hasCompletePrefill = !!(prefillDate && prefillStartTime && prefillEndTime && prefillVenueId);

  const [step, setStep] = useState(hasCompletePrefill ? 2 : 0);
  const [selectedDate, setSelectedDate] = useState(prefillDate);
  const [selectedTime, setSelectedTime] = useState(prefillStartTime);
  const [duration, setDuration] = useState(prefillDuration);
  const [selectedVenueId, setSelectedVenueId] = useState<number | null>(prefillVenueId);
  const [useCustomVenue, setUseCustomVenue] = useState(false);
  const [customVenueName, setCustomVenueName] = useState("");
  const [customVenueAddress, setCustomVenueAddress] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [studentNote, setStudentNote] = useState("");
  const [couponResult, setCouponResult] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: coachData } = trpc.coach.getById.useQuery({ id: parseInt(coachId) });
  const { data: venues } = trpc.venue.list.useQuery();

  const createBooking = trpc.booking.create.useMutation({
    onSuccess: (data) => {
      toast.success("预约已确认！请准时到场。");
      navigate(`/bookings/${data.bookingId}`);
    },
    onError: (e) => {
      toast.error(e.message);
      setIsSubmitting(false);
    },
  });

  const coach = coachData?.coach;
  const coachVenues = coachData?.venues.map(v => v.venue) ?? [];

  const pricePerHour = parseFloat(coach?.pricePerHour ?? "600");
  const durationHours = parseFloat(duration);
  const totalAmount = useMemo(() => pricePerHour * durationHours, [pricePerHour, durationHours]);
  const discountAmount = couponResult?.valid ? parseFloat(couponResult.discount) : 0;
  const finalAmount = totalAmount - discountAmount;

  // If prefillEndTime is set (from reserved slot), use it directly;
  // otherwise compute from selectedTime + duration
  const endTime = useMemo(() => {
    if (prefillEndTime && selectedTime === prefillStartTime) return prefillEndTime;
    if (!selectedTime) return "";
    const [h, m] = selectedTime.split(":").map(Number);
    const endMinutes = h * 60 + m + durationHours * 60;
    const endH = Math.floor(endMinutes / 60);
    const endM = endMinutes % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  }, [selectedTime, durationHours, prefillEndTime, prefillStartTime]);

  // Generate next 14 days
  const availableDates = useMemo(() => {
    const dates = [];
    for (let i = 1; i <= 14; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push({
        value: d.toISOString().split("T")[0],
        label: d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" }),
        weekday: d.toLocaleDateString("zh-CN", { weekday: "short" }),
      });
    }
    return dates;
  }, []);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold mb-3">请先登录</h2>
          <p className="text-muted-foreground mb-6">登录后即可预约课程</p>
          <Button onClick={() => window.location.href = `/login?return=${encodeURIComponent(window.location.pathname)}`} className="bg-primary text-primary-foreground">
            立即登录
          </Button>
        </div>
      </div>
    );
  }

  const handleCheckCoupon = async () => {
    if (!couponCode.trim()) return;
    try {
      const utils = trpc.useUtils();
      const result = await utils.coupon.validate.fetch({
        code: couponCode,
        coachId: parseInt(coachId),
        amount: totalAmount.toString(),
      });
      setCouponResult(result);
      if (result.valid) {
        toast.success(`优惠券有效！节省 ¥${result.discount}`);
      } else {
        toast.error(result.message);
      }
    } catch {
      toast.error("验证失败");
    }
  };

  const handleSubmit = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error("请完整填写预约信息");
      return;
    }
    if (!useCustomVenue && !selectedVenueId) {
      toast.error("请选择上课场地");
      return;
    }
    if (useCustomVenue && !customVenueName.trim()) {
      toast.error("请填写场地名称");
      return;
    }
    setIsSubmitting(true);
    createBooking.mutate({
      coachId: parseInt(coachId),
      venueId: useCustomVenue ? undefined : (selectedVenueId ?? undefined),
      customVenueName: useCustomVenue ? customVenueName.trim() : undefined,
      customVenueAddress: useCustomVenue ? customVenueAddress.trim() : undefined,
      lessonDate: selectedDate,
      startTime: selectedTime,
      endTime,
      durationHours: duration,
      couponCode: couponResult?.valid ? couponCode : undefined,
      studentNote,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8 max-w-4xl">
        {/* Back */}
        <button
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground text-sm mb-6 transition-colors"
          onClick={() => {
            if (hasCompletePrefill) {
              navigate(`/coaches/${coachId}`);
            } else if (step > 0) {
              setStep(step - 1);
            } else {
              navigate(`/coaches/${coachId}`);
            }
          }}
        >
          <ChevronLeft className="w-4 h-4" />
          {hasCompletePrefill ? "返回教练页面" : step > 0 ? "上一步" : "返回教练页面"}
        </button>

        {/* Step Indicator - hidden when coming from reserved slot with complete prefill */}
        {!hasCompletePrefill && (
          <div className="flex items-center gap-2 mb-8">
            {STEPS.map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`flex items-center gap-2 ${i <= step ? "text-primary" : "text-muted-foreground"}`}>
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all ${
                    i < step ? "bg-primary border-primary text-primary-foreground" :
                    i === step ? "border-primary text-primary" :
                    "border-muted-foreground/30"
                  }`}>
                    {i < step ? <Check className="w-3.5 h-3.5" /> : i + 1}
                  </div>
                  <span className="text-sm font-medium hidden sm:block">{s}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div className={`h-0.5 w-8 sm:w-16 transition-all ${i < step ? "bg-primary" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Step 0: Date & Time */}
            {step === 0 && (
              <div className="card-elegant p-6 space-y-6 animate-fade-in">
                <h2 className="font-serif text-2xl font-semibold">选择上课时间</h2>

                {/* Date Selection */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">选择日期</Label>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {availableDates.map((d) => (
                      <button
                        key={d.value}
                        onClick={() => setSelectedDate(d.value)}
                        className={`p-2 rounded-lg text-center transition-all border ${
                          selectedDate === d.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:border-primary/50 hover:bg-primary/5"
                        }`}
                      >
                        <div className="text-xs opacity-70">{d.weekday}</div>
                        <div className="text-sm font-semibold mt-0.5">{d.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Time Selection */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">选择时间段</Label>
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {TIME_SLOTS.map((t) => (
                      <button
                        key={t}
                        onClick={() => setSelectedTime(t)}
                        className={`py-2.5 px-3 rounded-lg text-sm font-medium transition-all border ${
                          selectedTime === t
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:border-primary/50 hover:bg-primary/5"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <Label className="text-sm font-medium mb-3 block">课程时长</Label>
                  <div className="grid grid-cols-3 gap-3">
                    {DURATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setDuration(opt.value)}
                        className={`p-3 rounded-lg text-center transition-all border ${
                          duration === opt.value
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="font-semibold">{opt.label}</div>
                        <div className={`text-xs mt-0.5 ${duration === opt.value ? "text-primary-foreground/70" : "text-muted-foreground"}`}>
                          {opt.desc}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <Button
                  className="w-full bg-primary text-primary-foreground h-12 rounded-xl font-semibold"
                  disabled={!selectedDate || !selectedTime}
                  onClick={() => setStep(1)}
                >
                  下一步：选择场地
                  <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Step 1: Venue */}
            {step === 1 && (
              <div className="card-elegant p-6 space-y-5 animate-fade-in">
                <h2 className="font-serif text-2xl font-semibold">选择上课场地</h2>

                {/* Toggle: platform venue vs custom venue */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setUseCustomVenue(false)}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      !useCustomVenue ? "border-primary bg-primary/8 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    🏘️ 选择平台场地
                  </button>
                  <button
                    onClick={() => { setUseCustomVenue(true); setSelectedVenueId(null); }}
                    className={`flex-1 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      useCustomVenue ? "border-primary bg-primary/8 text-primary" : "border-border text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    📍 我自己订场
                  </button>
                </div>

                {useCustomVenue ? (
                  /* Custom venue form */
                  <div className="space-y-4">
                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
                      💡 您自行预订的场地，请填写具体信息以便教练确认到场
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">场地名称 <span className="text-destructive">*</span></Label>
                      <Input
                        placeholder="如：深大体育中心网球场 3号场"
                        value={customVenueName}
                        onChange={e => setCustomVenueName(e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-1.5 block">具体地址（选填）</Label>
                      <Input
                        placeholder="如：深圳市南山区留仙大道 2032 号"
                        value={customVenueAddress}
                        onChange={e => setCustomVenueAddress(e.target.value)}
                      />
                    </div>
                  </div>
                ) : coachVenues.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">教练常用场地（推荐）</p>
                    {coachVenues.map((venue) => (
                      <button
                        key={venue.id}
                        onClick={() => setSelectedVenueId(venue.id)}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          selectedVenueId === venue.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                            selectedVenueId === venue.id ? "border-primary" : "border-muted-foreground/30"
                          }`}>
                            {selectedVenueId === venue.id && (
                              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{venue.name}</div>
                            <div className="text-sm text-muted-foreground mt-0.5">{venue.address}</div>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                              <span className="px-2 py-0.5 bg-muted rounded">{venue.area}</span>
                              <span>{venue.openTime} - {venue.closeTime}</span>
                              <span>{venue.courtCount} 片场地</span>
                            </div>
                            {venue.mapUrl && (
                              <span className="inline-flex items-center gap-1 mt-1.5 text-xs text-primary">
                                <MapPin className="w-3 h-3" />查看地图
                              </span>
                            )}
                            {venue.bookingNote && selectedVenueId === venue.id && (
                              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                                📝 {venue.bookingNote}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                    {/* Map link shown below selected coach venue */}
                    {selectedVenueId && coachVenues.find(v => v.id === selectedVenueId)?.mapUrl && (
                      <div className="pl-4">
                        <a href={coachVenues.find(v => v.id === selectedVenueId)!.mapUrl!}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <MapPin className="w-3 h-3" />导航到所选场地
                        </a>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">平台全部场地</p>
                    {venues?.map((venue) => (
                      <button
                        key={venue.id}
                        onClick={() => setSelectedVenueId(venue.id)}
                        className={`w-full text-left p-4 rounded-xl border transition-all ${
                          selectedVenueId === venue.id
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center mt-0.5 shrink-0 ${
                            selectedVenueId === venue.id ? "border-primary" : "border-muted-foreground/30"
                          }`}>
                            {selectedVenueId === venue.id && (
                              <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="font-medium">{venue.name}</div>
                            <div className="text-sm text-muted-foreground mt-0.5">{venue.address}</div>
                            <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                              <span className="px-2 py-0.5 bg-muted rounded">{venue.area}</span>
                              <span>{venue.openTime} - {venue.closeTime}</span>
                            </div>
                            {venue.mapUrl && (
                              <span className="inline-flex items-center gap-1 mt-1.5 text-xs text-primary">
                                <MapPin className="w-3 h-3" />查看地图
                              </span>
                            )}
                            {venue.bookingNote && selectedVenueId === venue.id && (
                              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800">
                                📝 {venue.bookingNote}
                              </div>
                            )}
                          </div>
                        </div>
                      </button>
                    ))}
                    {/* Map link shown below selected all-venue */}
                    {selectedVenueId && venues?.find(v => v.id === selectedVenueId)?.mapUrl && (
                      <div className="pl-4">
                        <a href={venues.find(v => v.id === selectedVenueId)!.mapUrl!}
                          target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                          <MapPin className="w-3 h-3" />导航到所选场地
                        </a>
                      </div>
                    )}
                  </div>
                )}

                <div>
                  <Label className="text-sm font-medium mb-2 block">备注（选填）</Label>
                  <Textarea
                    placeholder="如有特殊需求或训练目标，请在此说明..."
                    value={studentNote}
                    onChange={e => setStudentNote(e.target.value)}
                    className="resize-none"
                    rows={3}
                  />
                </div>

                <Button
                  className="w-full bg-primary text-primary-foreground h-12 rounded-xl font-semibold"
                  disabled={useCustomVenue ? !customVenueName.trim() : !selectedVenueId}
                  onClick={() => setStep(2)}
                >
                  下一步：确认支付
                  <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            )}

            {/* Step 2: Payment */}
            {step === 2 && (
              <div className="card-elegant p-6 space-y-5 animate-fade-in">
                <h2 className="font-serif text-2xl font-semibold">确认预约信息</h2>

                {/* Summary */}
                <div className="bg-muted/50 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">上课时间：</span>
                    <span className="font-medium">{selectedDate} {selectedTime} - {endTime}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">课程时长：</span>
                    <span className="font-medium">{duration} 小时</span>
                  </div>
                  {useCustomVenue ? (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <MapPin className="w-4 h-4 text-primary" />
                        <span className="text-muted-foreground">上课场地：</span>
                        <span className="font-medium">{customVenueName}</span>
                        <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">自带场地</span>
                      </div>
                      {customVenueAddress && (
                        <div className="flex items-start gap-2 text-sm pl-6">
                          <span className="text-muted-foreground">{customVenueAddress}</span>
                        </div>
                      )}
                    </div>
                  ) : (() => {
                    const selVenue = venues?.find(v => v.id === selectedVenueId) ?? coachVenues.find(v => v.id === selectedVenueId);
                    return (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="w-4 h-4 text-primary" />
                          <span className="text-muted-foreground">上课场地：</span>
                          <span className="font-medium">{selVenue?.name}</span>
                        </div>
                        {selVenue?.address && (
                          <div className="flex items-start gap-2 text-sm pl-6">
                            <span className="text-muted-foreground">{selVenue.address}</span>
                          </div>
                        )}
                        {selVenue?.mapUrl && (
                          <div className="pl-6">
                            <a href={selVenue.mapUrl} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-xs text-primary hover:underline">
                              <MapPin className="w-3 h-3" />导航到场地
                            </a>
                          </div>
                        )}
                      </div>
                    );
                  })()}
                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-primary" />
                    <span className="text-muted-foreground">授课教练：</span>
                    <span className="font-medium">{coach?.displayName}</span>
                  </div>
                </div>

                {/* Coupon */}
                <div>
                  <Label className="text-sm font-medium mb-2 block">优惠券码（选填）</Label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="输入优惠券码"
                      value={couponCode}
                      onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponResult(null); }}
                      className="flex-1"
                    />
                    <Button variant="outline" onClick={handleCheckCoupon} disabled={!couponCode.trim()}>
                      <Tag className="w-4 h-4 mr-1" />
                      验证
                    </Button>
                  </div>
                  {couponResult?.valid && (
                    <p className="text-sm text-green-600 mt-1.5 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      {couponResult.coupon.name} · 优惠 ¥{couponResult.discount}
                    </p>
                  )}
                </div>

                {/* Price Breakdown */}
                <div className="border border-border rounded-xl p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">课程费用</span>
                    <span>¥{totalAmount.toFixed(2)}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                      <span>优惠减免</span>
                      <span>-¥{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <Separator />
                  <div className="flex justify-between font-semibold">
                    <span>实付金额</span>
                    <span className="price-tag text-xl">¥{finalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="flex items-center gap-3 p-3 border border-border rounded-xl">
                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                    <CreditCard className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <div className="text-sm font-medium">微信支付</div>
                    <div className="text-xs text-muted-foreground">安全快捷，支持退款</div>
                  </div>
                  <Check className="w-4 h-4 text-primary ml-auto" />
                </div>

                <div className="flex items-start gap-2 text-xs text-muted-foreground">
                  <Shield className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>课程费用将在教练确认后正式扣款。如教练拒绝或取消，费用将全额退回。</span>
                </div>

                <Button
                  className="w-full bg-primary text-primary-foreground h-12 rounded-xl font-semibold text-base"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "处理中..." : `确认支付 ¥${finalAmount.toFixed(2)}`}
                </Button>
              </div>
            )}
          </div>

          {/* Right: Coach Summary */}
          <div className="lg:col-span-1">
            {coach && (
              <div className="card-elegant p-5 sticky top-24">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-court-light flex items-center justify-center overflow-hidden">
                    {coach.avatar ? (
                      <img src={coach.avatar} alt={coach.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-serif text-2xl font-bold text-primary">
                        {coach.displayName.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div>
                    <div className="font-semibold">{coach.displayName}</div>
                    <div className="flex items-center gap-1 text-sm">
                      <Star className="w-3.5 h-3.5 star-rating fill-current" />
                      <span>{coach.avgRating}</span>
                      <span className="text-muted-foreground">· {coach.totalLessons} 课时</span>
                    </div>
                  </div>
                </div>

                <Separator className="mb-4" />

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">单价</span>
                    <span className="font-medium">¥{coach.pricePerHour}/小时</span>
                  </div>
                  {selectedDate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">日期</span>
                      <span className="font-medium">{selectedDate}</span>
                    </div>
                  )}
                  {selectedTime && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">时间</span>
                      <span className="font-medium">{selectedTime}{endTime ? ` - ${endTime}` : ""}</span>
                    </div>
                  )}
                  {duration && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">时长</span>
                      <span className="font-medium">{duration} 小时</span>
                    </div>
                  )}
                </div>

                {step >= 2 && (
                  <>
                    <Separator className="my-3" />
                    <div className="flex justify-between font-semibold">
                      <span>合计</span>
                      <span className="price-tag">¥{finalAmount.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
