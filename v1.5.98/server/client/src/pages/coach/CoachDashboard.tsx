import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

import {
  AlertTriangle, Building2, Calendar, Check, ChevronLeft, ChevronRight,
  Clock, DollarSign, MapPin, Plus, Star, Trash2, TrendingUp, Trophy, Users, X
} from "lucide-react";
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Navbar from "@/components/tennis/Navbar";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  pending: { label: "处理中", color: "bg-yellow-100 text-yellow-700 border-yellow-200" },
  confirmed: { label: "已确认", color: "bg-green-100 text-green-700 border-green-200" },
  completed: { label: "已完成", color: "bg-blue-100 text-blue-700 border-blue-200" },
  cancelled_by_student: { label: "学员取消", color: "bg-gray-100 text-gray-600 border-gray-200" },
  cancelled_by_coach: { label: "已取消", color: "bg-gray-100 text-gray-600 border-gray-200" },
  rejected: { label: "已拒绝", color: "bg-red-100 text-red-600 border-red-200" },
};

export default function CoachDashboard() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [venueDialogOpen, setVenueDialogOpen] = useState(false);
  // Reserved slots state
  const [slotDialogOpen, setSlotDialogOpen] = useState(false);
  const [slotDate, setSlotDate] = useState("");
  const [slotStartTime, setSlotStartTime] = useState("");
  const [slotVenueId, setSlotVenueId] = useState<string>("");
  const [slotCourtNo, setSlotCourtNo] = useState("");
  const [slotNote, setSlotNote] = useState("");

  // Generate next 30 days for date picker
  const slotAvailableDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i <= 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push({
        value: d.toISOString().split("T")[0],
        label: d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" }),
        weekday: d.toLocaleDateString("zh-CN", { weekday: "short" }),
        isToday: i === 0,
      });
    }
    return dates;
  }, []);

  // Time slots for start time
  const SLOT_START_TIMES = [
    "07:00","08:00","09:00","10:00","11:00","12:00",
    "13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00"
  ];

  // Duration options
  const SLOT_DURATIONS = [
    { label: "1小时", hours: 1 },
    { label: "1.5小时", hours: 1.5 },
    { label: "2小时", hours: 2 },
    { label: "2.5小时", hours: 2.5 },
    { label: "3小时", hours: 3 },
  ];
  const [slotDuration, setSlotDuration] = useState<number>(1);

  // Teaching locations state
  const [locationDialogOpen, setLocationDialogOpen] = useState(false);
  const [locName, setLocName] = useState("");
  const [locAddress, setLocAddress] = useState("");
  const [locLat, setLocLat] = useState("");
  const [locLng, setLocLng] = useState("");

  // Availability venue/location state
  const [availLocationId, setAvailLocationId] = useState<string>("");

  // Auto-compute end time from start + duration
  const computedEndTime = useMemo(() => {
    if (!slotStartTime) return "";
    const [h, m] = slotStartTime.split(":").map(Number);
    const endMin = h * 60 + m + slotDuration * 60;
    const endH = Math.floor(endMin / 60);
    const endM = endMin % 60;
    return `${String(endH).padStart(2, "0")}:${String(endM).padStart(2, "0")}`;
  }, [slotStartTime, slotDuration]);

  const { data: profileData } = trpc.coach.myProfile.useQuery(undefined, { enabled: isAuthenticated });
  const { data: myLocations, refetch: refetchLocations } = trpc.coach.myLocations.useQuery(undefined, { enabled: isAuthenticated });

  const addLocationMutation = trpc.coach.addLocation.useMutation({
    onSuccess: () => {
      toast.success("教学地点已添加");
      refetchLocations();
      setLocationDialogOpen(false);
      setLocName(""); setLocAddress(""); setLocLat(""); setLocLng("");
    },
    onError: (e) => toast.error(e.message),
  });

  const removeLocationMutation = trpc.coach.removeLocation.useMutation({
    onSuccess: () => { toast.success("地点已删除"); refetchLocations(); },
    onError: (e) => toast.error(e.message),
  });

  const setPrimaryLocationMutation = trpc.coach.setPrimaryLocation.useMutation({
    onSuccess: () => { toast.success("主要教学地点已设置"); refetchLocations(); },
    onError: (e) => toast.error(e.message),
  });
  const profile = profileData?.profile;
  const myVenues = profileData?.venues ?? [];

  // All available venues for selection
  const { data: allVenues } = trpc.coach.allVenues.useQuery(undefined, { enabled: isAuthenticated });

  const bindVenue = trpc.coach.bindVenue.useMutation({
    onSuccess: () => {
      toast.success("场地已添加");
      utils.coach.myProfile.invalidate();
      setVenueDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const unbindVenue = trpc.coach.unbindVenue.useMutation({
    onSuccess: () => {
      toast.success("场地已移除");
      utils.coach.myProfile.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });
  const { data: reservedSlots } = trpc.coach.reservedSlots.useQuery(undefined, { enabled: isAuthenticated });

  const addReservedSlot = trpc.coach.addReservedSlot.useMutation({
    onSuccess: () => {
      toast.success("时段已添加");
      utils.coach.reservedSlots.invalidate();
      setSlotDialogOpen(false);
      setSlotDate(""); setSlotStartTime("");
      setSlotVenueId(""); setSlotCourtNo(""); setSlotNote(""); setSlotDuration(1);
    },
    onError: (e) => toast.error(e.message),
  });

  const removeReservedSlot = trpc.coach.removeReservedSlot.useMutation({
    onSuccess: () => {
      toast.success("时段已删除");
      utils.coach.reservedSlots.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Weekly availability state
  const [availDayOfWeek, setAvailDayOfWeek] = useState<string>("");
  const [availStartTime, setAvailStartTime] = useState("");
  const [availEndTime, setAvailEndTime] = useState("");
  const [availSpecificDate, setAvailSpecificDate] = useState("");

  // Generate next 30 days for availability date picker
  const availAvailableDates = useMemo(() => {
    const dates = [];
    for (let i = 0; i <= 30; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      dates.push({
        value: d.toISOString().split("T")[0],
        label: d.toLocaleDateString("zh-CN", { month: "short", day: "numeric" }),
        weekday: d.toLocaleDateString("zh-CN", { weekday: "short" }),
        dayOfWeek: d.getDay(),
        isToday: i === 0,
      });
    }
    return dates;
  }, []);

  const DAY_NAMES_SHORT = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

  // Price per hour state
  const [priceInput, setPriceInput] = useState("");
  const [priceEditMode, setPriceEditMode] = useState(false);

  const addWeeklySlot = trpc.coach.addWeeklySlot.useMutation({
    onSuccess: () => {
      toast.success("空闲时段已添加");
      utils.coach.myProfile.invalidate();
      setAvailDayOfWeek(""); setAvailStartTime(""); setAvailEndTime("");
    },
    onError: (e) => toast.error(e.message),
  });

  const removeWeeklySlot = trpc.coach.removeWeeklySlot.useMutation({
    onSuccess: () => {
      toast.success("时段已删除");
      utils.coach.myProfile.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const updatePricePerHour = trpc.coach.updatePricePerHour.useMutation({
    onSuccess: () => {
      toast.success("课时单价已更新");
      utils.coach.myProfile.invalidate();
      setPriceEditMode(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const { data: pendingBookings } = trpc.coach.bookings.useQuery({ status: "pending" }, { enabled: isAuthenticated });
  const { data: allBookings } = trpc.coach.bookings.useQuery(undefined, { enabled: isAuthenticated });
  const { data: stats } = trpc.coach.stats.useQuery(undefined, { enabled: isAuthenticated });
  const { data: students } = trpc.coach.students.useQuery(undefined, { enabled: isAuthenticated });

  const confirmBooking = trpc.coach.confirmBooking.useMutation({
    onSuccess: () => {
      toast.success("已确认预约，学员已收到通知");
      utils.coach.bookings.invalidate();
      utils.coach.bookings.invalidate();
      utils.coach.stats.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectBooking = trpc.coach.rejectBooking.useMutation({
    onSuccess: () => {
      toast.success("已拒绝预约");
      utils.coach.bookings.invalidate();
      utils.coach.bookings.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const cancelBooking = trpc.coach.cancelBooking.useMutation({
    onSuccess: () => {
      toast.success("已取消课程，学员已收到通知");
      utils.coach.bookings.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  // Calendar helpers
  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date().toISOString().split("T")[0];

  const bookingsByDate = useMemo(() => {
    const map: Record<string, any[]> = {};
    (allBookings ?? []).forEach((b: any) => {
      if (!map[b.lessonDate]) map[b.lessonDate] = [];
      map[b.lessonDate].push(b);
    });
    return map;
  }, [allBookings]);

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold mb-3">请先登录</h2>
          <Button onClick={() => window.location.href = '/login'} className="bg-primary text-primary-foreground">
            立即登录
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="container py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-serif text-3xl font-bold">教练工作台</h1>
            <p className="text-muted-foreground mt-1">
              {profile ? `${profile.displayName} · AceBook` : "管理您的课程与学员"}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/coach-profile">
              <Button variant="outline" size="sm">编辑资料</Button>
            </Link>
            <Link href="/coach-promotion">
              <Button variant="outline" size="sm">推广工具</Button>
            </Link>
          </div>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <StatCard icon={<Calendar className="w-5 h-5" />} label="本月课时" value={stats.monthlyLessons} unit="节" color="text-primary" />
            <StatCard icon={<DollarSign className="w-5 h-5" />} label="本月收入" value={`¥${stats.monthlyEarnings}`} unit="" color="text-green-600" />
            <StatCard icon={<Users className="w-5 h-5" />} label="累计学员" value={stats.totalStudents} unit="人" color="text-blue-600" />
            <StatCard icon={<Star className="w-5 h-5" />} label="累计课时" value={stats.totalLessons} unit="节" color="text-yellow-500" />
          </div>
        )}

        {/* New bookings notification - auto-confirmed, no action needed */}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Calendar + Bookings */}
          <div className="lg:col-span-1 space-y-5">
            {/* Calendar */}
            <div className="card-elegant p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl font-semibold">排课日历</h2>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => setCalendarDate(new Date(year, month - 1, 1))}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm font-medium w-20 text-center">
                    {calendarDate.toLocaleDateString("zh-CN", { year: "numeric", month: "long" })}
                  </span>
                  <Button variant="ghost" size="icon" onClick={() => setCalendarDate(new Date(year, month + 1, 1))}>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-7 gap-1 mb-2">
                {["日", "一", "二", "三", "四", "五", "六"].map(d => (
                  <div key={d} className="text-center text-xs text-muted-foreground py-1">{d}</div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
                {Array.from({ length: daysInMonth }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const dayBookings = bookingsByDate[dateStr] ?? [];
                  const isToday = dateStr === today;
                  const hasBookings = dayBookings.length > 0;
                  const hasPending = dayBookings.some(b => b.status === "pending");

                  return (
                    <div
                      key={day}
                      className={`aspect-square rounded-lg flex flex-col items-center justify-center text-sm relative cursor-pointer transition-all
                        ${isToday ? "bg-primary text-primary-foreground font-bold" : "hover:bg-muted"}
                        ${hasBookings && !isToday ? "bg-primary/8 font-medium" : ""}
                      `}
                    >
                      <span>{day}</span>
                      {hasBookings && (
                        <div className="flex gap-0.5 mt-0.5">
                          {dayBookings.slice(0, 3).map((b, bi) => (
                            <div
                              key={bi}
                              className={`w-1 h-1 rounded-full ${
                                b.status === "pending" ? "bg-yellow-500" :
                                b.status === "confirmed" ? "bg-green-500" :
                                b.status === "completed" ? "bg-blue-400" : "bg-gray-400"
                              }`}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" />已确认</div>
                <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400" />已完成</div>
              </div>
            </div>

            {/* Bookings Tabs */}
            <div className="card-elegant p-6">
              <Tabs defaultValue="confirmed">
                <TabsList className="mb-4">
                  <TabsTrigger value="confirmed">已确认课程</TabsTrigger>
                  <TabsTrigger value="all">全部课程</TabsTrigger>
                </TabsList>

                <TabsContent value="confirmed">
                  {!allBookings || allBookings.filter(b => b.status === "confirmed").length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Calendar className="w-8 h-8 mx-auto mb-2" />
                      <p>暂无已确认课程</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allBookings.filter(b => b.status === "confirmed").map(b => (
                        <BookingRow key={b.id} booking={b} />
                      ))}
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="all">
                  {!allBookings || allBookings.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground">
                      <Calendar className="w-8 h-8 mx-auto mb-2" />
                      <p>暂无课程记录</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {allBookings.slice(0, 20).map(b => (
                        <BookingRow
                          key={b.id}
                          booking={b}
                          showCancel={["confirmed"].includes(b.status)}
                          onCancel={() => cancelBooking.mutate({ bookingId: b.id })}
                        />
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          </div>

          {/* Right: Students + Operations */}
          <div className="lg:col-span-2 space-y-6">
            <div className="card-elegant p-5">
              <h2 className="font-serif text-xl font-semibold mb-4">我的学员</h2>
              {!students || students.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2" />
                  <p className="text-sm">暂无学员</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {students.slice(0, 8).map(s => (
                    <div key={s.id} className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="font-serif text-sm font-bold text-primary">
                          {(s.name ?? "学").charAt(0)}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{s.name ?? "学员"}</div>
                        <div className="text-xs text-muted-foreground">{s.totalLessons} 课时 · 最近 {s.lastLesson}</div>
                      </div>
                      <div className="text-xs text-muted-foreground shrink-0">¥{s.totalSpent}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* My Venues */}
            <div className="card-elegant p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl font-semibold">我的场地</h2>
                <Dialog open={venueDialogOpen} onOpenChange={setVenueDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Plus className="w-3.5 h-3.5" />
                      添加场地
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md max-h-[70vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>选择可用场地</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 mt-2">
                      {!allVenues || allVenues.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">暂无可用场地</p>
                      ) : (
                        allVenues.map((v: any) => {
                          const alreadyAdded = myVenues.some((mv: any) => mv.venue.id === v.id);
                          return (
                            <div key={v.id} className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-card">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">{v.name}</div>
                                <div className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <MapPin className="w-3 h-3" />
                                  {v.area} · {v.address}
                                </div>
                              </div>
                              {alreadyAdded ? (
                                <Badge variant="secondary" className="ml-2 shrink-0">已添加</Badge>
                              ) : (
                                <Button
                                  size="sm"
                                  className="ml-2 shrink-0"
                                  disabled={bindVenue.isPending}
                                  onClick={() => bindVenue.mutate({ venueId: v.id })}
                                >
                                  添加
                                </Button>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {myVenues.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Building2 className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">尚未添加场地</p>
                  <p className="text-xs mt-1">添加您常用的球场，学员预约时可选择</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myVenues.map((mv: any) => (
                    <div key={mv.venue.id} className="flex items-center gap-3 p-2.5 rounded-lg border border-border/50 bg-card group">
                      <MapPin className="w-4 h-4 text-primary shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{mv.venue.name}</div>
                        <div className="text-xs text-muted-foreground">{mv.venue.area} · {mv.venue.address}</div>
                      </div>
                      <button
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        onClick={() => unbindVenue.mutate({ venueId: mv.venue.id })}
                        title="移除场地"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Reserved Slots */}
            <div className="card-elegant p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-serif text-xl font-semibold">预留场地时段</h2>
                <Dialog open={slotDialogOpen} onOpenChange={setSlotDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1">
                      <Plus className="w-3.5 h-3.5" />
                      添加时段
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>添加预留场地时段</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-1">

                      {/* Step 1: Date - Select dropdown */}
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">日期</Label>
                          <Select value={slotDate} onValueChange={setSlotDate}>
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue placeholder="选择日期" />
                            </SelectTrigger>
                            <SelectContent>
                              {slotAvailableDates.map((d) => (
                                <SelectItem key={d.value} value={d.value}>
                                  {d.isToday ? `今天 ${d.label}` : `${d.weekday} ${d.label}`}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground mb-1 block">场馆</Label>
                          {myVenues.length === 0 ? (
                            <div className="h-8 flex items-center text-xs text-muted-foreground border rounded-md px-2 border-dashed">请先添加场馆</div>
                          ) : (
                            <Select value={slotVenueId} onValueChange={setSlotVenueId}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue placeholder="选择场馆" />
                              </SelectTrigger>
                              <SelectContent>
                                {myVenues.map((mv: any) => (
                                  <SelectItem key={mv.venue.id} value={String(mv.venue.id)}>
                                    {mv.venue.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        </div>
                      </div>

                      {/* Step 2: Start Time - 6-col compact grid */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">开始时间</Label>
                        <div className="grid grid-cols-5 gap-1">
                          {SLOT_START_TIMES.map((t) => (
                            <button
                              key={t}
                              onClick={() => setSlotStartTime(t)}
                              className={`py-1 rounded text-xs font-medium transition-all border ${
                                slotStartTime === t
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-border hover:border-primary/50 hover:bg-primary/5"
                              }`}
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Step 3: Duration - single row */}
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1 block">
                          时长{slotStartTime && <span className="ml-1.5 text-primary">{slotStartTime}–{computedEndTime}</span>}
                        </Label>
                        <div className="grid grid-cols-5 gap-1">
                          {SLOT_DURATIONS.map((opt) => (
                            <button
                              key={opt.hours}
                              onClick={() => setSlotDuration(opt.hours)}
                              className={`py-1 rounded text-xs font-medium transition-all border ${
                                slotDuration === opt.hours
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "border-border hover:border-primary/50 hover:bg-primary/5"
                              }`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Court No & Note - compact */}
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">场地号（选）</Label>
                          <Input
                            className="h-8 text-xs"
                            placeholder="如：1号场"
                            value={slotCourtNo}
                            onChange={e => setSlotCourtNo(e.target.value)}
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs text-muted-foreground">备注（选）</Label>
                          <Input
                            className="h-8 text-xs"
                            placeholder="如：已在i深体预约"
                            value={slotNote}
                            onChange={e => setSlotNote(e.target.value)}
                          />
                        </div>
                      </div>

                      {/* Summary & Submit */}
                      {slotDate && slotStartTime && slotVenueId && (
                        <div className="px-3 py-2 rounded-lg bg-primary/5 border border-primary/20 text-xs text-muted-foreground">
                          <span className="text-primary font-medium">摘要：</span>
                          {slotDate} {slotStartTime}–{computedEndTime}　
                          {myVenues.find((mv: any) => String(mv.venue.id) === slotVenueId)?.venue.name}{slotCourtNo ? ` · ${slotCourtNo}` : ""}
                        </div>
                      )}

                      <Button
                        className="w-full h-10 rounded-xl font-semibold"
                        disabled={!slotDate || !slotStartTime || !slotVenueId || addReservedSlot.isPending}
                        onClick={() => {
                          addReservedSlot.mutate({
                            specificDate: slotDate,
                            startTime: slotStartTime,
                            endTime: computedEndTime,
                            venueId: Number(slotVenueId),
                            courtNo: slotCourtNo || undefined,
                            venueNote: slotNote || undefined,
                          });
                        }}
                      >
                        {addReservedSlot.isPending ? "添加中..." : "确认添加时段"}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {!reservedSlots || reservedSlots.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <Clock className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">暂无预留时段</p>
                  <p className="text-xs mt-1">添加已预约的场地时段，学员可直接选择预约</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {reservedSlots.map((slot: any) => (
                    <div key={slot.id} className="p-3 rounded-xl border border-border/60 bg-card group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm font-medium">
                            <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                            {slot.specificDate}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3 shrink-0" />
                            {slot.startTime} – {slot.endTime}
                          </div>
                          {slot.venueName && (
                            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground">
                              <MapPin className="w-3 h-3 shrink-0" />
                              {slot.venueName}{slot.courtNo ? ` · ${slot.courtNo}` : ""}
                            </div>
                          )}
                        </div>
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 mt-0.5"
                          onClick={() => removeReservedSlot.mutate({ slotId: slot.id })}
                          title="删除时段"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      {slot.venueNote && (
                        <div className="mt-1.5 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                          {slot.venueNote}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Teaching Locations */}
            <div className="card-elegant p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-serif text-xl font-semibold">常用教学地点</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">添加您常用的教学地点，学员可搜索附近教练</p>
                </div>
                <Dialog open={locationDialogOpen} onOpenChange={setLocationDialogOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" variant="outline" className="gap-1" disabled={(myLocations?.length ?? 0) >= 5}>
                      <Plus className="w-3.5 h-3.5" />
                      添加地点
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>添加常用教学地点</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-3 mt-2">
                      <div>
                        <Label className="text-xs mb-1 block">地点名称 *</Label>
                        <Input placeholder="如：北大互联网中心网球场" value={locName} onChange={e => setLocName(e.target.value)} className="h-9" />
                      </div>
                      <div>
                        <Label className="text-xs mb-1 block">详细地址 *</Label>
                        <Input placeholder="如：深圳市南山区科技园路1号" value={locAddress} onChange={e => setLocAddress(e.target.value)} className="h-9" />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <Label className="text-xs mb-1 block">纬度（可选）</Label>
                          <Input placeholder="22.5431" value={locLat} onChange={e => setLocLat(e.target.value)} className="h-9" />
                        </div>
                        <div>
                          <Label className="text-xs mb-1 block">经度（可选）</Label>
                          <Input placeholder="114.0579" value={locLng} onChange={e => setLocLng(e.target.value)} className="h-9" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">填写经纬度可开启“附近教练”搜索功能，可通过地图搜索地址获取</p>
                      <Button
                        className="w-full h-9"
                        disabled={!locName || !locAddress || addLocationMutation.isPending}
                        onClick={() => addLocationMutation.mutate({ name: locName, address: locAddress, latitude: locLat || undefined, longitude: locLng || undefined })}
                      >
                        确认添加
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              {!myLocations || myLocations.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground">
                  <MapPin className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">尚未添加教学地点</p>
                  <p className="text-xs mt-1">添加后学员可搜索附近教练</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {myLocations.map((loc: any) => (
                    <div key={loc.id} className="flex items-start gap-3 p-2.5 rounded-lg border border-border/50 bg-card group">
                      <MapPin className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">{loc.name}</span>
                          {loc.isPrimary && <span className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">主要</span>}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5">{loc.address}</div>
                        {loc.latitude && loc.longitude && (
                          <div className="text-xs text-green-600 mt-0.5">已配置坐标 · 支持附近搜索</div>
                        )}
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        {!loc.isPrimary && (
                          <button
                            className="text-xs text-primary hover:underline"
                            onClick={() => setPrimaryLocationMutation.mutate({ locationId: loc.id })}
                            title="设为主要地点"
                          >
                            设为主要
                          </button>
                        )}
                        <button
                          className="text-muted-foreground hover:text-destructive"
                          onClick={() => removeLocationMutation.mutate({ locationId: loc.id })}
                          title="删除"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground text-center">{myLocations.length}/5 个地点</p>
                </div>
              )}
            </div>

            {/* Weekly Availability */}
            <div className="card-elegant p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-serif text-xl font-semibold">空闲时间设置</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">设置每周固定空闲时段，学员可按时间筛选教练</p>
                </div>
              </div>

              {/* Existing weekly slots grouped by day */}
              {(() => {
                const weeklySlots = (profileData?.availability ?? []).filter((s: any) => s.dayOfWeek !== null && s.dayOfWeek !== undefined);
                const DAY_NAMES = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
                const grouped: Record<number, any[]> = {};
                weeklySlots.forEach((s: any) => {
                  if (!grouped[s.dayOfWeek]) grouped[s.dayOfWeek] = [];
                  grouped[s.dayOfWeek].push(s);
                });
                const sortedDays = Object.keys(grouped).map(Number).sort((a, b) => a - b);
                return sortedDays.length === 0 ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <Clock className="w-7 h-7 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">尚未设置空闲时段</p>
                    <p className="text-xs mt-1">添加后学员可按时间筛选到您</p>
                  </div>
                ) : (
                  <div className="space-y-2 mb-4">
                    {sortedDays.map(day => (
                      <div key={day}>
                        <div className="text-xs font-medium text-muted-foreground mb-1">{DAY_NAMES[day]}</div>
                        <div className="space-y-1">
                          {grouped[day].map((s: any) => (
                            <div key={s.id} className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-primary/5 border border-primary/20 group">
                              <span className="text-sm font-medium text-primary">{s.startTime} – {s.endTime}</span>
                              <button
                                className="opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                onClick={() => removeWeeklySlot.mutate({ slotId: s.id })}
                                title="删除"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* Add new slot form */}
              <div className="border border-border/60 rounded-xl p-3 bg-muted/30 space-y-2">
                <p className="text-xs font-medium text-muted-foreground">添加空闲时段</p>

                {/* Optional specific date selector */}
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">具体日期（选填，选后自动关联星期）</Label>
                  <Select
                    value={availSpecificDate}
                    onValueChange={(val) => {
                      setAvailSpecificDate(val);
                      if (val) {
                        const found = availAvailableDates.find(d => d.value === val);
                        if (found) setAvailDayOfWeek(String(found.dayOfWeek));
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="不限（每周重复）" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">不限（每周重复）</SelectItem>
                      {availAvailableDates.map((d) => (
                        <SelectItem key={d.value} value={d.value}>
                          {d.isToday ? `今天 ${d.label}` : `${d.weekday} ${d.label}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">星期</Label>
                    <Select
                      value={availDayOfWeek}
                      onValueChange={(val) => {
                        setAvailDayOfWeek(val);
                        // Clear specific date if manually changed weekday
                        if (availSpecificDate && availSpecificDate !== "__none__") {
                          const found = availAvailableDates.find(d => d.value === availSpecificDate);
                          if (found && String(found.dayOfWeek) !== val) setAvailSpecificDate("");
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="星期" />
                      </SelectTrigger>
                      <SelectContent>
                        {["周一","周二","周三","周四","周五","周六","周日"].map((d, i) => (
                          <SelectItem key={i} value={String((i + 1) % 7)}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">开始</Label>
                    <Select value={availStartTime} onValueChange={setAvailStartTime}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="开始" />
                      </SelectTrigger>
                      <SelectContent>
                        {["07:00","08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00"].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">结束</Label>
                    <Select value={availEndTime} onValueChange={setAvailEndTime}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="结束" />
                      </SelectTrigger>
                      <SelectContent>
                        {["08:00","09:00","10:00","11:00","12:00","13:00","14:00","15:00","16:00","17:00","18:00","19:00","20:00","21:00"].map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Hint: show associated weekday when date is selected */}
                {availSpecificDate && availSpecificDate !== "__none__" && availDayOfWeek && (
                  <div className="text-xs text-primary bg-primary/5 border border-primary/20 rounded px-2 py-1">
                    已关联 {DAY_NAMES_SHORT[parseInt(availDayOfWeek)]}（{availSpecificDate}）
                  </div>
                )}

                {/* Optional location association */}
                {myLocations && myLocations.length > 0 && (
                  <div className="space-y-1">
                    <Label className="text-xs text-muted-foreground">关联教学地点（选填）</Label>
                    <Select value={availLocationId} onValueChange={setAvailLocationId}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="不限定地点" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__">不限定地点</SelectItem>
                        {myLocations.map((loc: any) => (
                          <SelectItem key={loc.id} value={String(loc.id)}>{loc.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  size="sm"
                  className="w-full h-8 text-xs"
                  disabled={!availDayOfWeek || !availStartTime || !availEndTime || addWeeklySlot.isPending}
                  onClick={() => {
                    if (!availDayOfWeek || !availStartTime || !availEndTime) return;
                    if (availStartTime >= availEndTime) {
                      toast.error("结束时间必须晚于开始时间");
                      return;
                    }
                    const specificDate = availSpecificDate && availSpecificDate !== "__none__" ? availSpecificDate : undefined;
                    addWeeklySlot.mutate({ dayOfWeek: parseInt(availDayOfWeek), startTime: availStartTime, endTime: availEndTime, specificDate });
                    setAvailSpecificDate(""); setAvailLocationId("");
                  }}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  添加时段
                </Button>
              </div>
            </div>

            {/* Price Per Hour */}
            <div className="card-elegant p-5">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h2 className="font-serif text-xl font-semibold">课时单价</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">平台最低标准 300 元/小时</p>
                </div>
                {!priceEditMode && (
                  <Button size="sm" variant="outline" onClick={() => { setPriceInput(profile?.pricePerHour ?? "600"); setPriceEditMode(true); }}>
                    修改
                  </Button>
                )}
              </div>
              {priceEditMode ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">¥</span>
                    <Input
                      type="number"
                      min="300"
                      value={priceInput}
                      onChange={e => setPriceInput(e.target.value)}
                      className="h-9 text-lg font-semibold"
                      placeholder="600"
                    />
                    <span className="text-muted-foreground text-sm whitespace-nowrap">/小时</span>
                  </div>
                  {priceInput && parseFloat(priceInput) < 300 && (
                    <p className="text-xs text-red-500">不能低于平台最低标准 300 元/小时</p>
                  )}
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      disabled={!priceInput || parseFloat(priceInput) < 300 || updatePricePerHour.isPending}
                      onClick={() => updatePricePerHour.mutate({ pricePerHour: priceInput })}
                    >
                      <Check className="w-3.5 h-3.5 mr-1" />
                      确认
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1" onClick={() => setPriceEditMode(false)}>
                      取消
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-primary">¥{profile?.pricePerHour ?? "600"}</span>
                  <span className="text-muted-foreground text-sm">/小时</span>
                </div>
              )}
            </div>

            {/* Revenue Chart */}
            {stats && (
              <div className="card-elegant p-5">
                <h2 className="font-serif text-xl font-semibold mb-4">收入概览</h2>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">本月收入</span>
                    <span className="font-semibold text-green-600">¥{stats.monthlyEarnings}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">累计收入</span>
                    <span className="font-semibold">¥{stats.total}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">待结算</span>
                    <span className="font-semibold text-yellow-600">¥{stats.pending}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">累计课时</span>
                    <span className="font-semibold">{stats.totalLessons} 节</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">本月课时</span>
                    <span className="font-semibold">{stats.monthlyLessons} 节</span>
                  </div>
                </div>
                <Link href="/coach-earnings">
                  <Button variant="outline" className="w-full mt-4" size="sm">
                    <TrendingUp className="w-4 h-4 mr-1.5" />
                    查看详细收入
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function StatCard({ icon, label, value, unit, color }: {
  icon: React.ReactNode; label: string; value: string | number; unit: string; color: string;
}) {
  return (
    <div className="card-elegant p-4">
      <div className={`${color} mb-2`}>{icon}</div>
      <div className="text-2xl font-bold text-foreground">{value}<span className="text-sm font-normal text-muted-foreground ml-1">{unit}</span></div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

function BookingRow({ booking, showActions, showCancel, onConfirm, onReject, onCancel }: {
  booking: any;
  showActions?: boolean;
  showCancel?: boolean;
  onConfirm?: () => void;
  onReject?: () => void;
  onCancel?: () => void;
}) {
  const status = STATUS_MAP[booking.status] ?? { label: booking.status, color: "bg-gray-100 text-gray-600 border-gray-200" };

  return (
    <div className="p-4 rounded-xl border border-border/60 bg-card">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-medium text-sm">{booking.student?.name ?? "学员"}</div>
          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {booking.lessonDate} {booking.startTime}-{booking.endTime}
          </div>
          {booking.venue && (
            <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3" />
              {booking.venue.name}
            </div>
          )}
        </div>
        <div className="text-right shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${status.color}`}>{status.label}</span>
          <div className="price-tag text-sm mt-1">¥{booking.finalAmount}</div>
        </div>
      </div>

      {booking.studentNote && (
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-2 mb-2">
          备注：{booking.studentNote}
        </div>
      )}

      {showActions && (
        <div className="flex gap-2 mt-2">
          <Button size="sm" className="flex-1 bg-primary text-primary-foreground h-8" onClick={onConfirm}>
            <Check className="w-3.5 h-3.5 mr-1" />
            确认
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button size="sm" variant="outline" className="flex-1 h-8 border-red-200 text-red-600 hover:bg-red-50">
                <X className="w-3.5 h-3.5 mr-1" />
                拒绝
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认拒绝此预约？</AlertDialogTitle>
                <AlertDialogDescription>学员将收到通知，费用将全额退回。</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction className="bg-red-600 text-white" onClick={onReject}>确认拒绝</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}

      {showCancel && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button size="sm" variant="outline" className="mt-2 w-full h-8 border-red-200 text-red-600 hover:bg-red-50">
              取消此课程
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>确认取消课程？</AlertDialogTitle>
              <AlertDialogDescription>学员将收到通知，费用将全额退回。</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>返回</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 text-white" onClick={onCancel}>确认取消</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}
