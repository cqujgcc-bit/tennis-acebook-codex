import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  BarChart2, Check, DollarSign, Shield, Trophy, Users, X, Clock,
  AlertCircle, Tag, ArrowUpDown, Image as ImageIcon, Plus, Search,
  Calendar, BookOpen, ChevronRight, FileCheck, ExternalLink, Video,
  GripVertical, ChevronUp, ChevronDown, Save, Swords, UserCog,
  MapPin, Ban, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/tennis/Navbar";
import { toast } from "sonner";
import { useState, useMemo, useCallback } from "react";

const VERIFICATION_STATUS: Record<string, { label: string; color: string }> = {
  draft:    { label: "草稿",   color: "bg-gray-100 text-gray-600" },
  pending:  { label: "待审核", color: "bg-yellow-100 text-yellow-700" },
  approved: { label: "已通过", color: "bg-green-100 text-green-700" },
  rejected: { label: "已拒绝", color: "bg-red-100 text-red-600" },
};

const BOOKING_STATUS: Record<string, { label: string; color: string }> = {
  pending:              { label: "待确认",   color: "bg-yellow-100 text-yellow-700" },
  confirmed:            { label: "已确认",   color: "bg-blue-100 text-blue-700" },
  completed:            { label: "已完成",   color: "bg-green-100 text-green-700" },
  cancelled_by_student: { label: "学员取消", color: "bg-gray-100 text-gray-600" },
  cancelled_by_coach:   { label: "教练取消", color: "bg-orange-100 text-orange-700" },
  rejected:             { label: "已拒绝",   color: "bg-red-100 text-red-600" },
};

const SORT_OPTIONS = [
  { value: "sortWeight",    label: "手动排序权重" },
  { value: "totalLessons",  label: "已完成课时数" },
  { value: "avgRating",     label: "评分" },
  { value: "totalStudents", label: "学员数量" },
  { value: "createdAt",     label: "入驻时间" },
];

const STUDENT_SORT_OPTIONS = [
  { value: "createdAt",     label: "注册时间" },
  { value: "totalBookings", label: "预约次数" },
  { value: "totalSpent",    label: "消费金额" },
  { value: "lastSignedIn",  label: "最近登录" },
];

export default function AdminDashboard() {
  const { user, isAuthenticated } = useAuth();
  const utils = trpc.useUtils();

  // Reject dialog
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<{ id: number; name: string } | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  // Cert images dialog
  const [certImgDialogOpen, setCertImgDialogOpen] = useState(false);
  const [certImgUrls, setCertImgUrls] = useState<string[]>([]);
  const [certImgCoachName, setCertImgCoachName] = useState("");

  // Category/sort edit dialog
  const [metaDialogOpen, setMetaDialogOpen] = useState(false);
  const [metaTarget, setMetaTarget] = useState<{ id: number; name: string; categoryTags: string[]; sortWeight: number } | null>(null);
  const [metaCategoryInput, setMetaCategoryInput] = useState("");
  const [metaCategories, setMetaCategories] = useState<string[]>([]);
  const [metaSortWeight, setMetaSortWeight] = useState("0");

  // Student booking detail dialog
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{ id: number; name: string } | null>(null);

  // Sort/filter state for coaches tab
  const [sortBy, setSortBy] = useState<"totalLessons" | "avgRating" | "totalStudents" | "sortWeight" | "createdAt">("sortWeight");
  const [filterSpecialty, setFilterSpecialty] = useState("");
  const [filterCategory, setFilterCategory] = useState("");

  // Reorder mode state
  const [reorderMode, setReorderMode] = useState(false);
  const [reorderList, setReorderList] = useState<{ id: number; displayName: string; sortWeight: number }[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  // Sort/search state for students tab
  const [studentSearch, setStudentSearch] = useState("");
  const [studentSortBy, setStudentSortBy] = useState<"createdAt" | "totalBookings" | "totalSpent" | "lastSignedIn">("createdAt");

  // User moderation state
  const [userSearch, setUserSearch] = useState("");
  const [userActionDialog, setUserActionDialog] = useState<{
    open: boolean;
    type: "warn" | "ban" | "delete" | null;
    user: { id: number; name: string | null; status: string } | null;
  }>({ open: false, type: null, user: null });
  const [userActionReason, setUserActionReason] = useState("");

  // Match management state
  const [matchStatusFilter, setMatchStatusFilter] = useState("__all__");
  const [matchSearch, setMatchSearch] = useState("");
  const [cancelMatchDialog, setCancelMatchDialog] = useState<{ open: boolean; matchId: number | null; matchTitle: string }>({ open: false, matchId: null, matchTitle: "" });
  const [cancelReason, setCancelReason] = useState("");
  const [deleteMatchDialog, setDeleteMatchDialog] = useState<{ open: boolean; matchId: number | null; matchTitle: string }>({ open: false, matchId: null, matchTitle: "" });

  // Permission management state
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [adminSearchEnabled, setAdminSearchEnabled] = useState(false);
  const [grantAdminDialog, setGrantAdminDialog] = useState<{ open: boolean; userId: number | null; userName: string }>({ open: false, userId: null, userName: "" });
  const [revokeAdminDialog, setRevokeAdminDialog] = useState<{ open: boolean; userId: number | null; userName: string }>({ open: false, userId: null, userName: "" });

  // Credit restore state
  const { data: creditRestoreList, refetch: refetchCreditRestore } = trpc.admin.creditRestoreList.useQuery(undefined, { enabled: isAuthenticated });
  const approveCreditRestoreMutation = trpc.admin.approveCreditRestore.useMutation({
    onSuccess: () => { toast.success("信用分已恢复满分，申请已处理"); refetchCreditRestore(); },
    onError: (e) => toast.error(e.message),
  });

  // Feedback state
  const { data: feedbackList, refetch: refetchFeedback } = trpc.feedback.adminList.useQuery(undefined, { enabled: isAuthenticated });
  const [feedbackReplyDialog, setFeedbackReplyDialog] = useState<{ open: boolean; id: number | null; content: string }>({ open: false, id: null, content: "" });
  const [feedbackReplyText, setFeedbackReplyText] = useState("");
  const replyFeedbackMutation = trpc.feedback.reply.useMutation({
    onSuccess: () => {
      toast.success("回复成功，已通知用户");
      setFeedbackReplyDialog({ open: false, id: null, content: "" });
      setFeedbackReplyText("");
      refetchFeedback();
    },
    onError: (e) => toast.error(e.message),
  });
  const pendingFeedbackCount = (feedbackList || []).filter((f: any) => f.status === "pending").length;

  const { data: stats } = trpc.admin.stats.useQuery(undefined, { enabled: isAuthenticated });
  const { data: pendingCoaches } = trpc.admin.pendingCoaches.useQuery(undefined, { enabled: isAuthenticated });
  const { data: allCoaches } = trpc.admin.allCoaches.useQuery(
    { sortBy, filterSpecialty: filterSpecialty || undefined, filterCategory: filterCategory || undefined },
    { enabled: isAuthenticated }
  );
  const { data: allStudents } = trpc.admin.allStudents.useQuery(
    { search: studentSearch || undefined, sortBy: studentSortBy },
    { enabled: isAuthenticated }
  );
  const { data: pendingContentCoaches } = trpc.admin.pendingContentReview.useQuery(undefined, { enabled: isAuthenticated });
  const { data: usersData, refetch: refetchUsers } = trpc.admin.listUsers.useQuery(
    { search: userSearch || undefined, limit: 50 },
    { enabled: isAuthenticated }
  );

  // Match management queries
  const { data: matchesData, refetch: refetchMatches } = trpc.admin.allMatches.useQuery(
    { status: matchStatusFilter === "__all__" ? undefined : matchStatusFilter, search: matchSearch || undefined, limit: 100 },
    { enabled: isAuthenticated }
  );

  const cancelMatchMutation = trpc.admin.cancelMatch.useMutation({
    onSuccess: () => {
      toast.success("球局已强制取消，参与者已收到通知");
      refetchMatches();
      setCancelMatchDialog({ open: false, matchId: null, matchTitle: "" });
      setCancelReason("");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteMatchMutation = trpc.admin.deleteMatch.useMutation({
    onSuccess: () => {
      toast.success("球局已删除");
      refetchMatches();
      setDeleteMatchDialog({ open: false, matchId: null, matchTitle: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  // Permission management queries
  const { data: allAdmins, refetch: refetchAdmins } = trpc.admin.allAdmins.useQuery(undefined, { enabled: isAuthenticated });
  const { data: searchedUsers } = trpc.admin.searchUsersForAdmin.useQuery(
    { query: adminSearchQuery },
    { enabled: isAuthenticated && adminSearchEnabled && adminSearchQuery.length > 0 }
  );

  const grantAdminMutation = trpc.admin.grantAdmin.useMutation({
    onSuccess: () => {
      toast.success("管理员权限已授予");
      refetchAdmins();
      setGrantAdminDialog({ open: false, userId: null, userName: "" });
      setAdminSearchQuery("");
      setAdminSearchEnabled(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const revokeAdminMutation = trpc.admin.revokeAdmin.useMutation({
    onSuccess: () => {
      toast.success("管理员权限已撤销");
      refetchAdmins();
      setRevokeAdminDialog({ open: false, userId: null, userName: "" });
    },
    onError: (e) => toast.error(e.message),
  });

  // Content review dialog
  const [contentReviewDialogOpen, setContentReviewDialogOpen] = useState(false);
  const [contentReviewTarget, setContentReviewTarget] = useState<{ id: number; name: string } | null>(null);
  const [contentReviewNote, setContentReviewNote] = useState("");

  const warnUser = trpc.admin.warnUser.useMutation({
    onSuccess: () => {
      toast.success("警告已发送，用户将收到站内通知");
      refetchUsers();
      setUserActionDialog({ open: false, type: null, user: null });
      setUserActionReason("");
    },
    onError: (e) => toast.error(e.message),
  });

  const banUser = trpc.admin.banUser.useMutation({
    onSuccess: () => {
      toast.success("账号已封禁，用户将无法继续使用平台");
      refetchUsers();
      setUserActionDialog({ open: false, type: null, user: null });
      setUserActionReason("");
    },
    onError: (e) => toast.error(e.message),
  });

  const unbanUser = trpc.admin.unbanUser.useMutation({
    onSuccess: () => {
      toast.success("封禁已解除，用户可正常使用平台");
      refetchUsers();
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteUser = trpc.admin.deleteUser.useMutation({
    onSuccess: () => {
      toast.success("账号已删除");
      refetchUsers();
      setUserActionDialog({ open: false, type: null, user: null });
    },
    onError: (e) => toast.error(e.message),
  });

  const handleUserAction = () => {
    const { type, user } = userActionDialog;
    if (!type || !user) return;
    if (type === "warn") warnUser.mutate({ userId: user.id, reason: userActionReason });
    else if (type === "ban") banUser.mutate({ userId: user.id, reason: userActionReason });
    else if (type === "delete") deleteUser.mutate({ userId: user.id });
  };

  const reviewCoachContent = trpc.admin.reviewCoachContent.useMutation({
    onSuccess: () => {
      toast.success("内容审核完成");
      utils.admin.pendingContentReview.invalidate();
      utils.admin.allCoaches.invalidate();
      setContentReviewDialogOpen(false);
      setContentReviewNote("");
      setContentReviewTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const openContentRejectDialog = (coach: { id: number; displayName: string }) => {
    setContentReviewTarget({ id: coach.id, name: coach.displayName });
    setContentReviewNote("");
    setContentReviewDialogOpen(true);
  };

  const { data: studentBookings } = trpc.admin.studentBookings.useQuery(
    { studentId: selectedStudent?.id ?? 0 },
    { enabled: !!selectedStudent && studentDialogOpen }
  );

  const approveCoach = trpc.admin.approveCoach.useMutation({
    onSuccess: () => {
      toast.success("教练已审核通过，已通知教练");
      utils.admin.pendingCoaches.invalidate();
      utils.admin.allCoaches.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const rejectCoach = trpc.admin.rejectCoach.useMutation({
    onSuccess: () => {
      toast.success("已拒绝申请，已通知教练");
      utils.admin.pendingCoaches.invalidate();
      utils.admin.allCoaches.invalidate();
      setRejectDialogOpen(false);
      setRejectReason("");
      setRejectTarget(null);
    },
    onError: (e) => toast.error(e.message),
  });

  const reorderCoaches = trpc.admin.reorderCoaches.useMutation({
    onSuccess: () => {
      toast.success("排序已保存");
      utils.admin.allCoaches.invalidate();
      setReorderMode(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const enterReorderMode = useCallback(() => {
    if (!allCoaches) return;
    // Build a local copy sorted by current sortWeight desc
    const list = [...allCoaches]
      .sort((a: any, b: any) => (b.sortWeight ?? 0) - (a.sortWeight ?? 0))
      .map((c: any) => ({ id: c.id, displayName: c.displayName, sortWeight: c.sortWeight ?? 0 }));
    setReorderList(list);
    setReorderMode(true);
  }, [allCoaches]);

  const moveCoach = useCallback((fromIndex: number, toIndex: number) => {
    setReorderList(prev => {
      const next = [...prev];
      const [item] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }, []);

  const saveReorder = useCallback(() => {
    // Assign sortWeight: highest index = lowest weight; top item gets highest weight
    const total = reorderList.length;
    const orders = reorderList.map((item, idx) => ({
      coachId: item.id,
      sortWeight: total - idx,
    }));
    reorderCoaches.mutate({ orders });
  }, [reorderList, reorderCoaches]);

  const updateCoachMeta = trpc.admin.updateCoachMeta.useMutation({
    onSuccess: () => {
      toast.success("教练分类/排序已更新");
      utils.admin.allCoaches.invalidate();
      setMetaDialogOpen(false);
    },
    onError: (e) => toast.error(e.message),
  });

  const openRejectDialog = (coach: { id: number; displayName: string }) => {
    setRejectTarget({ id: coach.id, name: coach.displayName });
    setRejectReason("");
    setRejectDialogOpen(true);
  };

  const openCertImages = (coach: any) => {
    const imgs = Array.isArray(coach.certificationImages) ? coach.certificationImages as string[] : [];
    setCertImgUrls(imgs);
    setCertImgCoachName(coach.displayName);
    setCertImgDialogOpen(true);
  };

  const openMetaDialog = (coach: any) => {
    const tags = Array.isArray(coach.categoryTags) ? coach.categoryTags as string[] : [];
    setMetaTarget({ id: coach.id, name: coach.displayName, categoryTags: tags, sortWeight: coach.sortWeight ?? 0 });
    setMetaCategories(tags);
    setMetaSortWeight(String(coach.sortWeight ?? 0));
    setMetaCategoryInput("");
    setMetaDialogOpen(true);
  };

  const openStudentDialog = (student: { id: number; name: string | null }) => {
    setSelectedStudent({ id: student.id, name: student.name ?? "未知学员" });
    setStudentDialogOpen(true);
  };

  const handleConfirmReject = () => {
    if (!rejectTarget) return;
    rejectCoach.mutate({ coachId: rejectTarget.id, reason: rejectReason || undefined });
  };

  const handleSaveMeta = () => {
    if (!metaTarget) return;
    updateCoachMeta.mutate({
      coachId: metaTarget.id,
      categoryTags: metaCategories,
      sortWeight: parseInt(metaSortWeight) || 0,
    });
  };

  const allSpecialties = useMemo(() => {
    if (!allCoaches) return [];
    const set = new Set<string>();
    allCoaches.forEach((c: any) => (c.specialties as string[] ?? []).forEach((s: string) => set.add(s)));
    return Array.from(set).sort();
  }, [allCoaches]);

  const allCategoryTags = useMemo(() => {
    if (!allCoaches) return [];
    const set = new Set<string>();
    allCoaches.forEach((c: any) => (c.categoryTags as string[] ?? []).forEach((t: string) => set.add(t)));
    return Array.from(set).sort();
  }, [allCoaches]);

  if (!isAuthenticated || user?.role !== "admin") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <Shield className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold mb-3">权限不足</h2>
          <p className="text-muted-foreground">此页面仅管理员可访问</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8">
        <h1 className="font-serif text-3xl font-bold mb-8">管理后台</h1>

        {/* Platform Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 mb-8">
            <StatCard icon={<Users className="w-5 h-5" />} label="总教练数" value={stats.totalCoaches} color="text-primary" />
            <StatCard icon={<Users className="w-5 h-5" />} label="总学员数" value={stats.totalStudents} color="text-blue-600" />
            <StatCard icon={<BarChart2 className="w-5 h-5" />} label="总预约数" value={stats.totalBookings} color="text-purple-600" />
            <StatCard icon={<DollarSign className="w-5 h-5" />} label="总流水" value={`¥${stats.totalRevenue}`} color="text-green-600" />
            <StatCard icon={<Swords className="w-5 h-5" />} label="总约球数" value={(stats as any).totalMatches ?? 0} color="text-orange-600" />
            <StatCard icon={<Swords className="w-5 h-5" />} label="本周约球" value={(stats as any).weekMatches ?? 0} color="text-amber-600" />
            <StatCard icon={<Users className="w-5 h-5" />} label="本周参与" value={(stats as any).weekParticipants ?? 0} color="text-teal-600" />
          </div>
        )}

        <Tabs defaultValue="pending">
          <TabsList className="mb-6">
            <TabsTrigger value="pending" className="gap-1.5">
              待审核教练
              {pendingCoaches && pendingCoaches.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-yellow-500 text-white text-xs flex items-center justify-center">
                  {pendingCoaches.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="all">全部教练</TabsTrigger>
            <TabsTrigger value="content" className="gap-1.5">
              内容审核
              {pendingContentCoaches && pendingContentCoaches.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-purple-500 text-white text-xs flex items-center justify-center">
                  {pendingContentCoaches.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="students">学员管理</TabsTrigger>
            <TabsTrigger value="users" className="gap-1.5">
              用户管理
              {usersData && usersData.users.some((u: any) => u.status === "banned") && (
                <span className="w-2 h-2 rounded-full bg-red-500" />
              )}
            </TabsTrigger>
            <TabsTrigger value="matches" className="gap-1.5">
              <Swords className="w-3.5 h-3.5" />
              约球管理
            </TabsTrigger>
            <TabsTrigger value="credit" className="gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              信用分审核
              {creditRestoreList && creditRestoreList.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center">
                  {creditRestoreList.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="feedback" className="gap-1.5">
              <MessageSquare className="w-3.5 h-3.5" />
              意见反馈
              {pendingFeedbackCount > 0 && (
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white text-xs flex items-center justify-center">
                  {pendingFeedbackCount}
                </span>
              )}
            </TabsTrigger>
            {/* 权限管理仅超级管理员可见，由后端接口控制实际权限 */}
            <TabsTrigger value="permissions" className="gap-1.5">
              <UserCog className="w-3.5 h-3.5" />
              权限管理
            </TabsTrigger>
          </TabsList>

          {/* Pending Review Tab */}
          <TabsContent value="pending">
            {!pendingCoaches || pendingCoaches.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Check className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p>暂无待审核教练</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingCoaches.map((coach: any) => (
                  <div key={coach.id} className="card-elegant p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-semibold text-lg">{coach.displayName}</h3>
                          <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200">
                            <Clock className="w-3 h-3 mr-1" />
                            待审核
                          </Badge>
                          {Array.isArray(coach.certificationImages) && (coach.certificationImages as string[]).length > 0 && (
                            <button
                              className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors"
                              onClick={() => openCertImages(coach)}
                            >
                              <ImageIcon className="w-3 h-3" />
                              查看证书图片（{(coach.certificationImages as string[]).length}张）
                            </button>
                          )}
                        </div>
                        <p className="text-muted-foreground text-sm">{coach.tagline}</p>
                        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
                          <span>¥{coach.pricePerHour}/小时</span>
                          <span>·</span>
                          <span>{coach.yearsExperience} 年经验</span>
                        </div>
                        {coach.certifications && (coach.certifications as string[]).length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {(coach.certifications as string[]).map((c: string) => (
                              <span key={c} className="text-xs px-2 py-0.5 bg-primary/8 text-primary rounded-full">{c}</span>
                            ))}
                          </div>
                        )}
                        {coach.bio && (
                          <p className="text-sm mt-2 text-foreground/80 line-clamp-3 bg-muted/40 rounded-lg p-3">{coach.bio}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 shrink-0">
                        <Button
                          size="sm"
                          className="bg-primary text-primary-foreground"
                          disabled={approveCoach.isPending}
                          onClick={() => approveCoach.mutate({ coachId: coach.id })}
                        >
                          <Check className="w-3.5 h-3.5 mr-1" />
                          审核通过
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-red-200 text-red-600 hover:bg-red-50"
                          onClick={() => openRejectDialog(coach)}
                        >
                          <X className="w-3.5 h-3.5 mr-1" />
                          拒绝申请
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* All Coaches Tab */}
          <TabsContent value="all">
            {/* Reorder Mode UI */}
            {reorderMode && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm text-muted-foreground">
                    <GripVertical className="w-4 h-4 inline mr-1" />
                    拖拽或使用上移/下移按钮调整教练展示顺序，保存后即时生效
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setReorderMode(false)}>取消</Button>
                    <Button size="sm" disabled={reorderCoaches.isPending} onClick={saveReorder}>
                      <Save className="w-3.5 h-3.5 mr-1" />
                      {reorderCoaches.isPending ? "保存中..." : "保存排序"}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {reorderList.map((coach, idx) => (
                    <div
                      key={coach.id}
                      draggable
                      onDragStart={() => setDragIndex(idx)}
                      onDragOver={(e) => { e.preventDefault(); }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (dragIndex !== null && dragIndex !== idx) {
                          moveCoach(dragIndex, idx);
                          setDragIndex(null);
                        }
                      }}
                      onDragEnd={() => setDragIndex(null)}
                      className={`flex items-center gap-3 p-3 rounded-xl border bg-card cursor-grab active:cursor-grabbing transition-all ${
                        dragIndex === idx ? "opacity-50 border-primary" : "border-border hover:border-primary/50"
                      }`}
                    >
                      <GripVertical className="w-5 h-5 text-muted-foreground shrink-0" />
                      <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <span className="flex-1 font-medium">{coach.displayName}</span>
                      <div className="flex gap-1 shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          disabled={idx === 0}
                          onClick={() => moveCoach(idx, idx - 1)}
                        >
                          <ChevronUp className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0"
                          disabled={idx === reorderList.length - 1}
                          onClick={() => moveCoach(idx, idx + 1)}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Normal mode: filter/sort toolbar */}
            {!reorderMode && (
            <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-muted/30 rounded-xl">
              <Button size="sm" variant="outline" className="gap-1.5" onClick={enterReorderMode}>
                <ArrowUpDown className="w-3.5 h-3.5" />
                调整展示位置
              </Button>
              <div className="w-px h-5 bg-border" />
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">排序：</span>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="h-8 w-36 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SORT_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">擅长筛选：</span>
                <Select value={filterSpecialty || "__all__"} onValueChange={(v) => setFilterSpecialty(v === "__all__" ? "" : v)}>
                  <SelectTrigger className="h-8 w-32 text-sm">
                    <SelectValue placeholder="全部" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">全部</SelectItem>
                    {allSpecialties.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {allCategoryTags.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">分类筛选：</span>
                  <Select value={filterCategory || "__all__"} onValueChange={(v) => setFilterCategory(v === "__all__" ? "" : v)}>
                    <SelectTrigger className="h-8 w-32 text-sm">
                      <SelectValue placeholder="全部" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__all__">全部</SelectItem>
                      {allCategoryTags.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            )}

            {!reorderMode && (
              !allCoaches || allCoaches.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Trophy className="w-8 h-8 mx-auto mb-2" />
                  <p>暂无教练</p>
                </div>
              ) : (
              <div className="space-y-3">
                {allCoaches.map((coach: any) => {
                  const vs = VERIFICATION_STATUS[coach.verificationStatus ?? "draft"] ?? VERIFICATION_STATUS.draft;
                  const categoryTags = Array.isArray(coach.categoryTags) ? coach.categoryTags as string[] : [];
                  return (
                    <div key={coach.id} className="card-elegant p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <div className="font-medium">{coach.displayName}</div>
                            <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${vs.color}`}>{vs.label}</span>
                            {categoryTags.map((tag: string) => (
                              <span key={tag} className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100">{tag}</span>
                            ))}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            ¥{coach.pricePerHour}/小时 · {coach.totalLessons ?? 0} 课时 · {coach.totalStudents ?? 0} 学员 · 评分 {coach.avgRating ?? "5.00"} · 权重 {coach.sortWeight ?? 0}
                          </div>
                          {coach.specialties && (coach.specialties as string[]).length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-1.5">
                              {(coach.specialties as string[]).map((s: string) => (
                                <span key={s} className="text-xs px-1.5 py-0.5 bg-primary/8 text-primary rounded">{s}</span>
                              ))}
                            </div>
                          )}
                          {coach.reviewNote && coach.verificationStatus === "rejected" && (
                            <div className="flex items-start gap-1.5 mt-1.5 text-xs text-red-600 bg-red-50 rounded px-2 py-1">
                              <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
                              <span>拒绝原因：{coach.reviewNote}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                          {Array.isArray(coach.certificationImages) && (coach.certificationImages as string[]).length > 0 && (
                            <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openCertImages(coach)}>
                              <ImageIcon className="w-3 h-3" />
                              证书
                            </Button>
                          )}
                          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openMetaDialog(coach)}>
                            <Tag className="w-3 h-3" />
                            分类/排序
                          </Button>
                          {coach.verificationStatus === "pending" && (
                            <>
                              <Button
                                size="sm"
                                className="h-7 text-xs bg-primary text-primary-foreground"
                                disabled={approveCoach.isPending}
                                onClick={() => approveCoach.mutate({ coachId: coach.id })}
                              >
                                通过
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-red-200 text-red-600 hover:bg-red-50"
                                onClick={() => openRejectDialog(coach)}
                              >
                                拒绝
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              )
            )}
          </TabsContent>

          {/* Content Review Tab */}
          <TabsContent value="content">
            <div className="mb-4 p-4 bg-purple-50 border border-purple-100 rounded-xl text-sm text-purple-800">
              <FileCheck className="w-4 h-4 inline mr-1.5" />
              此处审核教练的自我宣传内容（社交媒体链接、视频介绍等），确保内容真实合规后方可在教练主页公开展示。
            </div>
            {!pendingContentCoaches || pendingContentCoaches.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Check className="w-8 h-8 mx-auto mb-2 text-green-500" />
                <p>暂无待审核的宣传内容</p>
              </div>
            ) : (
              <div className="space-y-4">
                {pendingContentCoaches.map((coach: any) => {
                  const socialLinks = (coach.socialLinks ?? {}) as Record<string, string>;
                  const hasSocial = Object.values(socialLinks).some(v => v);
                  const SOCIAL_LABELS: Record<string, string> = { xiaohongshu: "小红书", wechat: "微信公众号", weibo: "微博", douyin: "抖音", other: "其他" };
                  return (
                    <div key={coach.id} className="card-elegant p-5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-lg mb-1">{coach.displayName}</h3>
                          {coach.tagline && <p className="text-sm text-muted-foreground mb-3">{coach.tagline}</p>}

                          {/* Social links preview */}
                          {hasSocial && (
                            <div className="mb-3">
                              <div className="text-xs font-medium text-muted-foreground mb-1.5">社交媒体链接：</div>
                              <div className="flex flex-wrap gap-2">
                                {Object.entries(socialLinks).map(([key, val]) => {
                                  if (!val) return null;
                                  const isUrl = val.startsWith("http");
                                  return (
                                    <a key={key} href={isUrl ? val : undefined} target={isUrl ? "_blank" : undefined}
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border border-border hover:border-primary hover:text-primary transition-colors">
                                      <ExternalLink className="w-3 h-3" />
                                      {SOCIAL_LABELS[key] ?? key}：{val}
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Video preview */}
                          {coach.videoUrl && (
                            <div className="mb-3">
                              <div className="text-xs font-medium text-muted-foreground mb-1.5">视频介绍链接：</div>
                              <a href={coach.videoUrl} target="_blank" rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                                <Video className="w-4 h-4" />
                                {coach.videoUrl}
                              </a>
                            </div>
                          )}

                          {!hasSocial && !coach.videoUrl && (
                            <p className="text-sm text-muted-foreground italic">该教练暂未填写社交媒体或视频链接</p>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 shrink-0">
                          <Button
                            size="sm"
                            className="bg-primary text-primary-foreground"
                            disabled={reviewCoachContent.isPending}
                            onClick={() => reviewCoachContent.mutate({ coachId: coach.id, status: "approved" })}
                          >
                            <Check className="w-3.5 h-3.5 mr-1" />
                            审核通过
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => openContentRejectDialog(coach)}
                          >
                            <X className="w-3.5 h-3.5 mr-1" />
                            不予通过
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>

          {/* Students Tab */}
          <TabsContent value="students">
            {/* Search & Sort */}
            <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-muted/30 rounded-xl">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="搜索姓名、邮箱、手机号..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  className="pl-9 h-8 text-sm"
                />
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">排序：</span>
                <Select value={studentSortBy} onValueChange={(v) => setStudentSortBy(v as any)}>
                  <SelectTrigger className="h-8 w-32 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STUDENT_SORT_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {allStudents && (
                <span className="text-sm text-muted-foreground ml-auto">共 {allStudents.length} 位学员</span>
              )}
            </div>

            {!allStudents || allStudents.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <Users className="w-8 h-8 mx-auto mb-2" />
                <p>{studentSearch ? "未找到匹配的学员" : "暂无学员"}</p>
              </div>
            ) : (
              <div className="space-y-2">
                {allStudents.map((student: any) => (
                  <div
                    key={student.id}
                    className="card-elegant p-4 flex items-center justify-between gap-3 cursor-pointer hover:border-primary/30 transition-colors"
                    onClick={() => openStudentDialog(student)}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-sm">
                        {student.avatar
                          ? <img src={student.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                          : (student.name ?? "?").charAt(0).toUpperCase()
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">{student.name ?? "未设置姓名"}</div>
                        <div className="text-xs text-muted-foreground truncate">
                          {student.email ?? student.phone ?? "无联系方式"} · 注册于 {new Date(student.createdAt).toLocaleDateString("zh-CN")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 shrink-0 text-sm">
                      <div className="text-center hidden sm:block">
                        <div className="font-semibold text-foreground">{student.totalBookings}</div>
                        <div className="text-xs text-muted-foreground">预约次数</div>
                      </div>
                      <div className="text-center hidden sm:block">
                        <div className="font-semibold text-green-600">¥{Number(student.totalSpent).toFixed(0)}</div>
                        <div className="text-xs text-muted-foreground">消费金额</div>
                      </div>
                      <div className="text-center hidden md:block">
                        <div className="font-semibold text-foreground">{student.lastBookingDate ?? "—"}</div>
                        <div className="text-xs text-muted-foreground">最近预约</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* User Moderation Tab */}
          <TabsContent value="users">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索用户名称、邮符1..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <span className="text-sm text-muted-foreground">
                  共 {usersData?.total ?? 0} 个用户
                </span>
              </div>

              {!usersData || usersData.users.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Users className="w-8 h-8 mx-auto mb-2" />
                  <p>暂无用户数据</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {usersData.users.map((u: any) => {
                    const isBanned = u.status === "banned";
                    const isWarned = u.status === "warned";
                    return (
                      <div key={u.id} className={`card-elegant p-4 ${isBanned ? "border-red-200 bg-red-50/30" : ""}`}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-primary font-semibold text-sm">
                              {u.avatar
                                ? <img src={u.avatar} alt="" className="w-9 h-9 rounded-full object-cover" />
                                : (u.name ?? "?").charAt(0).toUpperCase()
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm truncate">{u.name ?? "未设置姓名"}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  u.role === "admin" ? "bg-purple-100 text-purple-700" :
                                  u.role === "coach" ? "bg-green-100 text-green-700" :
                                  "bg-gray-100 text-gray-600"
                                }`}>{u.role === "admin" ? "管理员" : u.role === "coach" ? "教练" : "学员"}</span>
                                {isBanned && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-red-100 text-red-700">已封禁</span>}
                                {isWarned && !isBanned && <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-orange-100 text-orange-700">已警告×{u.warningCount}</span>}
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 truncate">
                                {u.email ?? u.phone ?? "无联系方式"} &middot; 注册于 {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                              </div>
                              {isBanned && u.banReason && (
                                <div className="text-xs text-red-600 mt-0.5">封禁原因：{u.banReason}</div>
                              )}
                            </div>
                          </div>
                          {u.role !== "admin" && (
                            <div className="flex items-center gap-2 shrink-0">
                              {isBanned ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="text-green-600 border-green-200 hover:bg-green-50 text-xs"
                                  disabled={unbanUser.isPending}
                                  onClick={() => unbanUser.mutate({ userId: u.id })}
                                >
                                  解封
                                </Button>
                              ) : (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-orange-600 border-orange-200 hover:bg-orange-50 text-xs"
                                    onClick={() => {
                                      setUserActionDialog({ open: true, type: "warn", user: { id: u.id, name: u.name, status: u.status } });
                                      setUserActionReason("");
                                    }}
                                  >
                                    警告
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                                    onClick={() => {
                                      setUserActionDialog({ open: true, type: "ban", user: { id: u.id, name: u.name, status: u.status } });
                                      setUserActionReason("");
                                    }}
                                  >
                                    封号
                                  </Button>
                                </>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-gray-500 border-gray-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 text-xs"
                                onClick={() => {
                                  setUserActionDialog({ open: true, type: "delete", user: { id: u.id, name: u.name, status: u.status } });
                                }}
                              >
                                删除
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Match Management Tab */}
          <TabsContent value="matches">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索球局标题、发布者..."
                    value={matchSearch}
                    onChange={(e) => setMatchSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={matchStatusFilter} onValueChange={setMatchStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="状态筛选" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__all__">全部状态</SelectItem>
                    <SelectItem value="open">招募中</SelectItem>
                    <SelectItem value="full">已满员</SelectItem>
                    <SelectItem value="cancelled">已取消</SelectItem>
                    <SelectItem value="completed">已结束</SelectItem>
                  </SelectContent>
                </Select>
                <span className="text-sm text-muted-foreground">共 {matchesData?.total ?? 0} 条记录</span>
              </div>

              {!matchesData || matchesData.matches.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Swords className="w-8 h-8 mx-auto mb-2" />
                  <p>暂无约球数据</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {matchesData.matches.map((m: any) => {
                    const statusMap: Record<string, { label: string; color: string }> = {
                      open: { label: "招募中", color: "bg-green-100 text-green-700" },
                      full: { label: "已满员", color: "bg-yellow-100 text-yellow-700" },
                      cancelled: { label: "已取消", color: "bg-red-100 text-red-700" },
                      completed: { label: "已结束", color: "bg-gray-100 text-gray-500" },
                    };
                    const matchTypeMap: Record<string, string> = {
                      singles: "单打", doubles: "双打", mixed_doubles: "混双",
                      practice: "练球", group: "团体",
                    };
                    const st = statusMap[m.status] ?? { label: m.status, color: "bg-gray-100 text-gray-500" };
                    const isCancelled = m.status === "cancelled";
                    return (
                      <div key={m.id} className={`card-elegant p-4 ${isCancelled ? "opacity-60" : ""}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap mb-1">
                              <span className="font-semibold text-sm truncate">{m.title}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${st.color}`}>{st.label}</span>
                              {m.matchType && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{matchTypeMap[m.matchType] ?? m.matchType}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                              <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{m.matchDate} {m.startTime}</span>
                              {m.venueName && <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{m.venueName}</span>}
                              <span className="flex items-center gap-1"><Users className="w-3 h-3" />{m.currentParticipants}/{m.maxParticipants} 人</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              发布者：{m.authorName ?? "未知"} {m.authorEmail ? `(${m.authorEmail})` : ""}
                              &middot; {new Date(m.createdAt).toLocaleDateString("zh-CN")}
                            </div>
                          </div>
                          {!isCancelled && (
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-orange-600 border-orange-200 hover:bg-orange-50 text-xs"
                                onClick={() => setCancelMatchDialog({ open: true, matchId: m.id, matchTitle: m.title })}
                              >
                                <Ban className="w-3 h-3 mr-1" />强制取消
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 border-red-200 hover:bg-red-50 text-xs"
                                onClick={() => setDeleteMatchDialog({ open: true, matchId: m.id, matchTitle: m.title })}
                              >
                                <X className="w-3 h-3 mr-1" />删除
                              </Button>
                            </div>
                          )}
                          {isCancelled && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50 text-xs shrink-0"
                              onClick={() => setDeleteMatchDialog({ open: true, matchId: m.id, matchTitle: m.title })}
                            >
                              <X className="w-3 h-3 mr-1" />删除
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Credit Restore Review Tab */}
          <TabsContent value="credit">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-base">信用分恢复申请</h3>
                  <p className="text-sm text-muted-foreground mt-0.5">信用分归零的用户向管理员提交的恢复申请，审核通过后信用分将恢复至满分</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetchCreditRestore()}>刷新</Button>
              </div>

              {!creditRestoreList || creditRestoreList.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">
                  <Shield className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <p className="font-medium">暂无待审核的申请</p>
                  <p className="text-sm mt-1">所有用户信用分状态良好</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {creditRestoreList.map((u: any) => (
                    <div key={u.id} className="card-elegant p-4 border-l-4 border-orange-300">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center shrink-0 text-orange-600 font-semibold">
                            {u.avatar
                              ? <img src={u.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                              : (u.name ?? "?").charAt(0).toUpperCase()
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{u.name ?? "未设置姓名"}</span>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">信用分 {u.creditScore}</span>
                            </div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {u.phone ?? "无手机号"} &middot; 连续到场 {u.consecutiveAttendCount ?? 0}/3 次
                            </div>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white shrink-0"
                          disabled={approveCreditRestoreMutation.isPending}
                          onClick={() => approveCreditRestoreMutation.mutate({ userId: u.id })}
                        >
                          审核通过
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Permission Management Tab */}
          <TabsContent value="permissions">
            <div className="space-y-6">
              {/* Current admins list */}
              <div>
                <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-purple-600" />
                  当前管理员列表
                  <span className="text-xs text-muted-foreground font-normal">(共 {allAdmins?.length ?? 0} 人)</span>
                </h3>
                {!allAdmins || allAdmins.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    <Shield className="w-6 h-6 mx-auto mb-2" />
                    <p>暂无管理员</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {allAdmins.map((admin: any) => {
                      const isOwner = admin.openId === undefined; // frontend can't check ownerOpenId
                      return (
                        <div key={admin.id} className="card-elegant p-4">
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <div className="w-9 h-9 rounded-full bg-purple-100 flex items-center justify-center shrink-0 text-purple-600 font-semibold text-sm">
                                {(admin.name ?? "?").charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-medium text-sm">{admin.name ?? "未设置姓名"}</span>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">管理员</span>
                                </div>
                                <div className="text-xs text-muted-foreground mt-0.5">
                                  {admin.email ?? admin.phone ?? "无联系方式"}
                                  &middot; 最近登录 {new Date(admin.lastSignedIn).toLocaleDateString("zh-CN")}
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50 text-xs shrink-0"
                              onClick={() => setRevokeAdminDialog({ open: true, userId: admin.id, userName: admin.name ?? "该用户" })}
                              disabled={revokeAdminMutation.isPending}
                            >
                              撤销权限
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Grant admin - search users */}
              <div>
                <h3 className="font-semibold text-base mb-3 flex items-center gap-2">
                  <Plus className="w-4 h-4 text-green-600" />
                  授权新管理员
                </h3>
                <div className="flex gap-2">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="搜索用户（姓名/邮筱/手机号）"
                      value={adminSearchQuery}
                      onChange={(e) => {
                        setAdminSearchQuery(e.target.value);
                        setAdminSearchEnabled(e.target.value.length >= 2);
                      }}
                      className="pl-9"
                    />
                  </div>
                </div>
                {adminSearchEnabled && adminSearchQuery.length >= 2 && (
                  <div className="mt-2 space-y-2">
                    {!searchedUsers || searchedUsers.length === 0 ? (
                      <div className="text-sm text-muted-foreground py-4 text-center">未找到匹配用户</div>
                    ) : (
                      searchedUsers.map((u: any) => (
                        <div key={u.id} className="card-elegant p-3 flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                              {(u.name ?? "?").charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-medium text-sm">{u.name ?? "未设置姓名"}</span>
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  u.role === "admin" ? "bg-purple-100 text-purple-700" :
                                  u.role === "coach" ? "bg-green-100 text-green-700" :
                                  "bg-gray-100 text-gray-600"
                                }`}>{u.role === "admin" ? "管理员" : u.role === "coach" ? "教练" : "学员"}</span>
                              </div>
                              <div className="text-xs text-muted-foreground">{u.email ?? u.phone ?? "无联系方式"}</div>
                            </div>
                          </div>
                          {u.role !== "admin" ? (
                            <Button
                              size="sm"
                              className="text-xs shrink-0"
                              onClick={() => setGrantAdminDialog({ open: true, userId: u.id, userName: u.name ?? "该用户" })}
                            >
                              授权管理员
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">already admin</span>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <p className="text-xs text-muted-foreground bg-amber-50 border border-amber-200 rounded-lg p-3">
                <AlertCircle className="w-3.5 h-3.5 inline mr-1 text-amber-600" />
                权限管理功能仅超级管理员可操作。授权和撤销操作将由服务器验证身份，未经授权的请求将被拒绝。
              </p>
            </div>
          </TabsContent>

          {/* Feedback Tab */}
          <TabsContent value="feedback">
            {!feedbackList || feedbackList.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <MessageSquare className="w-8 h-8 mx-auto mb-2" />
                <p>暂无用户反馈</p>
              </div>
            ) : (
              <div className="space-y-3">
                {feedbackList.map((f: any) => (
                  <div key={f.id} className="card-elegant p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium text-sm">{f.userName ?? "用户"}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            f.category === "bug" ? "bg-red-100 text-red-700" :
                            f.category === "suggestion" ? "bg-blue-100 text-blue-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>{f.category === "bug" ? "问题反馈" : f.category === "suggestion" ? "功能建议" : "其他"}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            f.status === "pending" ? "bg-orange-100 text-orange-700" :
                            f.status === "replied" ? "bg-green-100 text-green-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>{f.status === "pending" ? "待处理" : f.status === "replied" ? "已回复" : "已关闭"}</span>
                          <span className="text-xs text-muted-foreground">{new Date(f.createdAt).toLocaleString("zh-CN")}</span>
                        </div>
                        <p className="text-sm text-foreground whitespace-pre-wrap break-words">{f.content}</p>
                        {f.contact && (
                          <p className="text-xs text-muted-foreground mt-1">联系方式：{f.contact}</p>
                        )}
                        {f.adminReply && (
                          <div className="mt-2 bg-green-50 border border-green-100 rounded-lg p-2.5">
                            <p className="text-xs text-green-700 font-medium mb-0.5">管理员回复：</p>
                            <p className="text-sm text-foreground whitespace-pre-wrap break-words">{f.adminReply}</p>
                          </div>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant={f.status === "replied" ? "outline" : "default"}
                        className="text-xs shrink-0"
                        onClick={() => { setFeedbackReplyDialog({ open: true, id: f.id, content: f.content }); setFeedbackReplyText(f.adminReply ?? ""); }}
                      >
                        {f.status === "replied" ? "修改回复" : "回复"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Feedback Reply Dialog */}
      <Dialog open={feedbackReplyDialog.open} onOpenChange={(open) => !open && setFeedbackReplyDialog({ open: false, id: null, content: "" })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>回复用户反馈</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            <div className="bg-muted rounded-lg p-3">
              <p className="text-xs text-muted-foreground mb-1">用户反馈内容：</p>
              <p className="text-sm whitespace-pre-wrap break-words">{feedbackReplyDialog.content}</p>
            </div>
            <Textarea
              placeholder="输入回复内容，提交后将通过站内通知推送给用户"
              value={feedbackReplyText}
              onChange={(e) => setFeedbackReplyText(e.target.value)}
              rows={4}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackReplyDialog({ open: false, id: null, content: "" })}>取消</Button>
            <Button
              disabled={!feedbackReplyText.trim() || replyFeedbackMutation.isPending}
              onClick={() => { if (feedbackReplyDialog.id) replyFeedbackMutation.mutate({ id: feedbackReplyDialog.id, reply: feedbackReplyText.trim() }); }}
            >
              {replyFeedbackMutation.isPending ? "提交中..." : "提交回复"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Match Dialog */}
      <Dialog open={cancelMatchDialog.open} onOpenChange={(open) => !open && setCancelMatchDialog({ open: false, matchId: null, matchTitle: "" })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>强制取消球局</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-3">
              将强制取消球局「<span className="font-medium text-foreground">{cancelMatchDialog.matchTitle}</span>」，所有已报名的参与者将收到通知。
            </p>
            <label className="text-sm font-medium mb-1.5 block">取消原因<span className="text-red-500 ml-1">*</span></label>
            <Textarea
              placeholder="例如：内容违规，已违反平台使用规则..."
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelMatchDialog({ open: false, matchId: null, matchTitle: "" })}>取消</Button>
            <Button
              variant="destructive"
              disabled={cancelMatchMutation.isPending || !cancelReason.trim()}
              onClick={() => {
                if (cancelMatchDialog.matchId) {
                  cancelMatchMutation.mutate({ matchId: cancelMatchDialog.matchId, reason: cancelReason });
                }
              }}
            >
              {cancelMatchMutation.isPending ? "处理中..." : "确认取消"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Match Dialog */}
      <Dialog open={deleteMatchDialog.open} onOpenChange={(open) => !open && setDeleteMatchDialog({ open: false, matchId: null, matchTitle: "" })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>删除球局</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              将永久删除球局「<span className="font-medium text-foreground">{deleteMatchDialog.matchTitle}</span>」及所有报名记录，此操作不可撤销。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteMatchDialog({ open: false, matchId: null, matchTitle: "" })}>取消</Button>
            <Button
              variant="destructive"
              disabled={deleteMatchMutation.isPending}
              onClick={() => {
                if (deleteMatchDialog.matchId) {
                  deleteMatchMutation.mutate({ matchId: deleteMatchDialog.matchId });
                }
              }}
            >
              {deleteMatchMutation.isPending ? "删除中..." : "确认删除"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Grant Admin Dialog */}
      <Dialog open={grantAdminDialog.open} onOpenChange={(open) => !open && setGrantAdminDialog({ open: false, userId: null, userName: "" })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>授权管理员权限</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              将授予 <span className="font-medium text-foreground">{grantAdminDialog.userName}</span> 管理员权限，该用户将可以访问管理后台。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantAdminDialog({ open: false, userId: null, userName: "" })}>取消</Button>
            <Button
              disabled={grantAdminMutation.isPending}
              onClick={() => {
                if (grantAdminDialog.userId) {
                  grantAdminMutation.mutate({ userId: grantAdminDialog.userId });
                }
              }}
            >
              {grantAdminMutation.isPending ? "处理中..." : "确认授权"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke Admin Dialog */}
      <Dialog open={revokeAdminDialog.open} onOpenChange={(open) => !open && setRevokeAdminDialog({ open: false, userId: null, userName: "" })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>撤销管理员权限</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground">
              将撤销 <span className="font-medium text-foreground">{revokeAdminDialog.userName}</span> 的管理员权限，该用户将无法访问管理后台。
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeAdminDialog({ open: false, userId: null, userName: "" })}>取消</Button>
            <Button
              variant="destructive"
              disabled={revokeAdminMutation.isPending}
              onClick={() => {
                if (revokeAdminDialog.userId) {
                  revokeAdminMutation.mutate({ userId: revokeAdminDialog.userId });
                }
              }}
            >
              {revokeAdminMutation.isPending ? "处理中..." : "确认撤销"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* User Action Dialog (warn / ban / delete) */}
      <Dialog open={userActionDialog.open} onOpenChange={(open) => !open && setUserActionDialog({ open: false, type: null, user: null })}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {userActionDialog.type === "warn" && "发送警告"}
              {userActionDialog.type === "ban" && "封禁账号"}
              {userActionDialog.type === "delete" && "删除账号"}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-3">
              {userActionDialog.type === "delete" ? (
                <>将永久删除 <span className="font-medium text-foreground">{userActionDialog.user?.name ?? "该用户"}</span> 的账号及相关数据，此操作不可撤销。</>
              ) : (
                <>将对 <span className="font-medium text-foreground">{userActionDialog.user?.name ?? "该用户"}</span>
                {userActionDialog.type === "warn" ? " 发送警告通知，用户将收到站内消息。" : " 封禁账号，封禁后用户将无法登录使用平台。"}</>
              )}
            </p>
            {userActionDialog.type !== "delete" && (
              <>
                <label className="text-sm font-medium mb-1.5 block">
                  {userActionDialog.type === "warn" ? "警告原因" : "封号原因"}
                  <span className="text-red-500 ml-1">*</span>
                </label>
                <Textarea
                  placeholder={userActionDialog.type === "warn"
                    ? "例如：发布违规内容，请立即删除并整改..."
                    : "例如：多次警告后仍继续违规，封禁处理..."
                  }
                  value={userActionReason}
                  onChange={(e) => setUserActionReason(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUserActionDialog({ open: false, type: null, user: null })}>取消</Button>
            <Button
              variant={userActionDialog.type === "delete" ? "destructive" : userActionDialog.type === "ban" ? "destructive" : "default"}
              disabled={warnUser.isPending || banUser.isPending || deleteUser.isPending || (userActionDialog.type !== "delete" && !userActionReason.trim())}
              onClick={handleUserAction}
            >
              {(warnUser.isPending || banUser.isPending || deleteUser.isPending) ? "处理中..." :
                userActionDialog.type === "warn" ? "确认发送警告" :
                userActionDialog.type === "ban" ? "确认封号" : "确认删除"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>拒绝教练申请</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-3">
              即将拒绝 <span className="font-medium text-foreground">{rejectTarget?.name}</span> 的教练申请，拒绝后系统将自动通知该教练。
            </p>
            <label className="text-sm font-medium mb-1.5 block">拒绝原因（可选，将发送给教练）</label>
            <Textarea
              placeholder="例如：资质证书不清晰，请重新上传高清照片..."
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>取消</Button>
            <Button variant="destructive" disabled={rejectCoach.isPending} onClick={handleConfirmReject}>
              {rejectCoach.isPending ? "处理中..." : "确认拒绝"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Content Review Reject Dialog */}
      <Dialog open={contentReviewDialogOpen} onOpenChange={setContentReviewDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>拒绝内容审核</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="text-sm text-muted-foreground mb-3">
              即将拒绝 <span className="font-medium text-foreground">{contentReviewTarget?.name}</span> 的宣传内容，拒绝后将通知该教练修改后重新提交。
            </p>
            <label className="text-sm font-medium mb-1.5 block">拒绝原因（可选，将发送给教练）</label>
            <Textarea
              placeholder="例如：社交媒体链接无法访问，请更新有效链接..."
              value={contentReviewNote}
              onChange={(e) => setContentReviewNote(e.target.value)}
              rows={3}
              className="resize-none"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContentReviewDialogOpen(false)}>取消</Button>
            <Button
              variant="destructive"
              disabled={reviewCoachContent.isPending}
              onClick={() => {
                if (!contentReviewTarget) return;
                reviewCoachContent.mutate({ coachId: contentReviewTarget.id, status: "rejected", note: contentReviewNote || undefined });
              }}
            >
              {reviewCoachContent.isPending ? "处理中..." : "确认拒绝"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cert Images Dialog */}
      <Dialog open={certImgDialogOpen} onOpenChange={setCertImgDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{certImgCoachName} · 资质证书图片</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2 max-h-[60vh] overflow-y-auto">
            {certImgUrls.length === 0 ? (
              <p className="text-muted-foreground text-sm col-span-2 text-center py-8">暂无证书图片</p>
            ) : certImgUrls.map((url, i) => (
              <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block rounded-xl overflow-hidden border border-border hover:border-primary transition-colors">
                <img src={url} alt={`证书${i+1}`} className="w-full object-contain max-h-64" />
              </a>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCertImgDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category/Sort Meta Dialog */}
      <Dialog open={metaDialogOpen} onOpenChange={setMetaDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{metaTarget?.name} · 分类标签 &amp; 排序</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-2 block">分类标签</label>
              <p className="text-xs text-muted-foreground mb-2">为教练添加分类标签，便于管理和筛选（如「青少年培训」「高端私教」「竞技提升」）</p>
              <div className="flex gap-2 mb-2">
                <Input
                  placeholder="输入标签名称，回车添加"
                  value={metaCategoryInput}
                  onChange={e => setMetaCategoryInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === "Enter" && metaCategoryInput.trim()) {
                      if (!metaCategories.includes(metaCategoryInput.trim())) {
                        setMetaCategories(prev => [...prev, metaCategoryInput.trim()]);
                      }
                      setMetaCategoryInput("");
                    }
                  }}
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (metaCategoryInput.trim() && !metaCategories.includes(metaCategoryInput.trim())) {
                      setMetaCategories(prev => [...prev, metaCategoryInput.trim()]);
                      setMetaCategoryInput("");
                    }
                  }}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {metaCategories.map(tag => (
                  <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-sm border border-indigo-100">
                    {tag}
                    <button onClick={() => setMetaCategories(prev => prev.filter(t => t !== tag))}>
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {metaCategories.length === 0 && <span className="text-xs text-muted-foreground">暂无标签</span>}
              </div>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">排序权重</label>
              <p className="text-xs text-muted-foreground mb-2">数值越大排名越靠前（0 = 默认，100 = 优先展示）</p>
              <Input
                type="number"
                min="0"
                max="9999"
                value={metaSortWeight}
                onChange={e => setMetaSortWeight(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMetaDialogOpen(false)}>取消</Button>
            <Button
              className="bg-primary text-primary-foreground"
              disabled={updateCoachMeta.isPending}
              onClick={handleSaveMeta}
            >
              {updateCoachMeta.isPending ? "保存中..." : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Student Booking Detail Dialog */}
      <Dialog open={studentDialogOpen} onOpenChange={setStudentDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" />
              {selectedStudent?.name} · 预约记录
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto py-2 space-y-2">
            {!studentBookings ? (
              <div className="text-center py-8 text-muted-foreground text-sm">加载中...</div>
            ) : studentBookings.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="w-8 h-8 mx-auto mb-2" />
                <p className="text-sm">该学员暂无预约记录</p>
              </div>
            ) : (
              studentBookings.map((b: any) => {
                const bs = BOOKING_STATUS[b.status] ?? { label: b.status, color: "bg-gray-100 text-gray-600" };
                return (
                  <div key={b.id} className="p-3 rounded-xl border border-border bg-muted/20">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="font-medium text-sm">{b.coachName ?? "未知教练"}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${bs.color}`}>{bs.label}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {b.lessonDate} {b.startTime}–{b.endTime}
                          {b.customVenueName && <span> · {b.customVenueName}</span>}
                        </div>
                        {b.studentNote && (
                          <div className="text-xs text-muted-foreground mt-1 italic">备注：{b.studentNote}</div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-semibold text-sm text-green-600">¥{Number(b.finalAmount).toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">{b.bookingNo}</div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setStudentDialogOpen(false)}>关闭</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string | number; color: string;
}) {
  return (
    <div className="card-elegant p-4">
      <div className={`${color} mb-2`}>{icon}</div>
      <div className="text-2xl font-bold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
