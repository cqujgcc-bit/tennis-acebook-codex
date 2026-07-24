import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import {
  AlertCircle, CheckCircle2, Clock, Save, Send, Trophy, XCircle,
  Upload, X, Link2, Youtube, BookOpen, Camera, User
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Navbar from "@/components/tennis/Navbar";
import { toast } from "sonner";

const VERIFICATION_BANNER: Record<string, { icon: React.ReactNode; bg: string; title: string; desc: string }> = {
  draft: {
    icon: <AlertCircle className="w-5 h-5 text-gray-500" />,
    bg: "bg-gray-50 border-gray-200",
    title: "资料草稿",
    desc: "完善资料后，点击「提交审核」，管理员审核通过后您的档案将对外公开展示。",
  },
  pending: {
    icon: <Clock className="w-5 h-5 text-yellow-600" />,
    bg: "bg-yellow-50 border-yellow-200",
    title: "审核中",
    desc: "您的教练档案已提交，正在等待管理员审核，请耐心等待。",
  },
  approved: {
    icon: <CheckCircle2 className="w-5 h-5 text-green-600" />,
    bg: "bg-green-50 border-green-200",
    title: "审核已通过 ✅",
    desc: "您的教练档案已通过审核，现在可以在平台接受学员预约。",
  },
  rejected: {
    icon: <XCircle className="w-5 h-5 text-red-500" />,
    bg: "bg-red-50 border-red-200",
    title: "审核未通过",
    desc: "请根据反馈修改资料后重新提交审核。",
  },
};

// Upload a file to S3 via the server's upload endpoint
async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error("上传失败");
  const json = await res.json();
  return json.url as string;
}

export default function CoachProfileEdit() {
  const { isAuthenticated } = useAuth();
  const utils = trpc.useUtils();
  const { data: profileData, isLoading } = trpc.coach.myProfile.useQuery(undefined, { enabled: isAuthenticated });
  const profile = profileData?.profile;

  const [form, setForm] = useState({
    displayName: "",
    tagline: "",
    bio: "",
    pricePerHour: "",
    yearsExperience: "",
    specialties: "",
    certifications: "",
    achievements: "",
    videoUrl: "",
    socialXiaohongshu: "",
    socialWechat: "",
    socialWeibo: "",
    socialDouyin: "",
    socialOther: "",
  });

  const [certImages, setCertImages] = useState<string[]>([]);
  const [uploadingCert, setUploadingCert] = useState(false);
  const certFileRef = useRef<HTMLInputElement>(null);

  // Avatar and cover image state
  const [avatar, setAvatar] = useState<string>("");
  const [coverImage, setCoverImage] = useState<string>("");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const avatarFileRef = useRef<HTMLInputElement>(null);
  const coverFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (profile) {
      const social = (profile.socialLinks as Record<string, string> | null) ?? {};
      setForm({
        displayName: profile.displayName ?? "",
        tagline: profile.tagline ?? "",
        bio: profile.bio ?? "",
        pricePerHour: profile.pricePerHour ?? "",
        yearsExperience: String(profile.yearsExperience ?? ""),
        specialties: Array.isArray(profile.specialties) ? (profile.specialties as string[]).join(", ") : "",
        certifications: Array.isArray(profile.certifications) ? (profile.certifications as string[]).join("\n") : "",
        achievements: Array.isArray(profile.achievements) ? (profile.achievements as string[]).join("\n") : "",
        videoUrl: (profile as any).videoUrl ?? "",
        socialXiaohongshu: social.xiaohongshu ?? "",
        socialWechat: social.wechat ?? "",
        socialWeibo: social.weibo ?? "",
        socialDouyin: social.douyin ?? "",
        socialOther: social.other ?? "",
      });
      setCertImages(Array.isArray((profile as any).certificationImages) ? (profile as any).certificationImages as string[] : []);
      setAvatar((profile as any).avatar ?? "");
      setCoverImage((profile as any).coverImage ?? "");
    }
  }, [profile]);

  const updateProfile = trpc.coach.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("资料已更新");
      utils.coach.myProfile.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const submitForReview = trpc.coach.submitForReview.useMutation({
    onSuccess: () => {
      toast.success("已提交审核，请等待管理员处理");
      utils.coach.myProfile.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const handleCertImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("图片不能超过 5MB"); return; }
    setUploadingCert(true);
    try {
      const url = await uploadFile(file);
      setCertImages(prev => [...prev, url]);
      toast.success("证书图片已上传");
    } catch {
      toast.error("上传失败，请重试");
    } finally {
      setUploadingCert(false);
      if (certFileRef.current) certFileRef.current.value = "";
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("头像不能超过 5MB"); return; }
    setUploadingAvatar(true);
    try {
      const url = await uploadFile(file);
      setAvatar(url);
      // Save immediately
      updateProfile.mutate({ avatar: url });
    } catch {
      toast.error("上传失败，请重试");
    } finally {
      setUploadingAvatar(false);
      if (avatarFileRef.current) avatarFileRef.current.value = "";
    }
  };

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { toast.error("封面图片不能超过 10MB"); return; }
    setUploadingCover(true);
    try {
      const url = await uploadFile(file);
      setCoverImage(url);
      // Save immediately
      updateProfile.mutate({ coverImage: url });
    } catch {
      toast.error("上传失败，请重试");
    } finally {
      setUploadingCover(false);
      if (coverFileRef.current) coverFileRef.current.value = "";
    }
  };

  const handleSubmit = () => {
    if (form.pricePerHour && parseFloat(form.pricePerHour) < 300) {
      toast.error("课时单价不能低于平台最低标准 300 元/小时");
      return;
    }
    updateProfile.mutate({
      displayName: form.displayName,
      tagline: form.tagline,
      bio: form.bio,
      pricePerHour: form.pricePerHour,
      yearsExperience: parseInt(form.yearsExperience) || 0,
      specialties: form.specialties.split(",").map(s => s.trim()).filter(Boolean),
      certifications: form.certifications.split("\n").map(s => s.trim()).filter(Boolean),
      certificationImages: certImages,
      achievements: form.achievements.split("\n").map(s => s.trim()).filter(Boolean),
      videoUrl: form.videoUrl || undefined,
      socialLinks: {
        xiaohongshu: form.socialXiaohongshu || undefined,
        wechat: form.socialWechat || undefined,
        weibo: form.socialWeibo || undefined,
        douyin: form.socialDouyin || undefined,
        other: form.socialOther || undefined,
      },
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container py-20 text-center">
          <Trophy className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <Button onClick={() => window.location.href = '/login'} className="bg-primary text-primary-foreground">
            立即登录
          </Button>
        </div>
      </div>
    );
  }

  const verStatus = (profile?.verificationStatus ?? "draft") as string;
  const banner = VERIFICATION_BANNER[verStatus] ?? VERIFICATION_BANNER.draft;
  const canSubmit = verStatus === "draft" || verStatus === "rejected";

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container py-8 max-w-2xl">
        <h1 className="font-serif text-3xl font-bold mb-6">编辑教练资料</h1>

        {/* Verification Status Banner */}
        {!isLoading && profile && (
          <div className={`rounded-xl border p-4 mb-6 flex items-start gap-3 ${banner.bg}`}>
            <div className="shrink-0 mt-0.5">{banner.icon}</div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-sm">{banner.title}</div>
              <div className="text-sm text-muted-foreground mt-0.5">{banner.desc}</div>
              {verStatus === "rejected" && profile.reviewNote && (
                <div className="mt-2 text-sm text-red-700 bg-red-100 rounded px-3 py-2">
                  管理员反馈：{profile.reviewNote}
                </div>
              )}
            </div>
            {canSubmit && (
              <Button
                size="sm"
                className="shrink-0 bg-primary text-primary-foreground"
                disabled={submitForReview.isPending || !form.displayName}
                onClick={() => submitForReview.mutate()}
              >
                <Send className="w-3.5 h-3.5 mr-1.5" />
                {submitForReview.isPending ? "提交中..." : "提交审核"}
              </Button>
            )}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded-xl animate-pulse" />)}</div>
        ) : (
          <div className="space-y-6">
            {/* Avatar & Cover Photo */}
            <div className="card-elegant overflow-hidden">
              {/* Cover Image */}
              <div
                className="relative h-40 bg-gradient-to-br from-primary/20 to-primary/5 cursor-pointer group"
                onClick={() => coverFileRef.current?.click()}
              >
                {coverImage ? (
                  <img src={coverImage} alt="封面" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Camera className="w-8 h-8 mx-auto mb-1 opacity-50" />
                      <p className="text-xs">点击上传封面图片</p>
                    </div>
                  </div>
                )}
                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  {uploadingCover ? (
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <div className="text-white text-center">
                      <Camera className="w-6 h-6 mx-auto mb-1" />
                      <p className="text-xs">{coverImage ? "更换封面" : "上传封面"}</p>
                    </div>
                  )}
                </div>
                <input ref={coverFileRef} type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
              </div>

              {/* Avatar */}
              <div className="px-6 pb-6">
                <div className="flex items-end gap-4 -mt-10 mb-4">
                  <div
                    className="relative w-20 h-20 rounded-full border-4 border-background bg-muted cursor-pointer group shrink-0 overflow-hidden"
                    onClick={() => avatarFileRef.current?.click()}
                  >
                    {avatar ? (
                      <img src={avatar} alt="头像" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <User className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-full">
                      {uploadingAvatar ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <Camera className="w-5 h-5 text-white" />
                      )}
                    </div>
                    <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
                  </div>
                  <div className="pb-1">
                    <p className="text-sm font-medium">{form.displayName || "教练姓名"}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">点击头像或封面可更换图片</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="card-elegant p-6 space-y-5">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-primary" />基本信息
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block">显示姓名 <span className="text-red-500">*</span></Label>
                  <Input value={form.displayName} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} placeholder="张教练" />
                </div>
                <div>
                  <Label className="mb-1.5 block">课程单价（元/小时）</Label>
                  <Input
                    value={form.pricePerHour}
                    onChange={e => setForm(f => ({ ...f, pricePerHour: e.target.value }))}
                    placeholder="600"
                    type="number"
                    min="300"
                  />
                  {form.pricePerHour && parseFloat(form.pricePerHour) < 300 && (
                    <p className="text-xs text-red-500 mt-1">平台最低标准 300 元/小时</p>
                  )}
                </div>
              </div>

              <div>
                <Label className="mb-1.5 block">一句话介绍</Label>
                <Input value={form.tagline} onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))} placeholder="前ATP职业球员 · 12年执教经验" />
              </div>

              <div>
                <Label className="mb-1.5 block">详细简介</Label>
                <Textarea value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={5} placeholder="介绍您的执教理念、经历和特色..." className="resize-none" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="mb-1.5 block">执教年限</Label>
                  <Input value={form.yearsExperience} onChange={e => setForm(f => ({ ...f, yearsExperience: e.target.value }))} type="number" placeholder="8" />
                </div>
                <div>
                  <Label className="mb-1.5 block">擅长方向（逗号分隔）</Label>
                  <Input value={form.specialties} onChange={e => setForm(f => ({ ...f, specialties: e.target.value }))} placeholder="发球技术, 底线对抗, 竞技提升" />
                </div>
              </div>
            </div>

            {/* Certifications */}
            <div className="card-elegant p-6 space-y-4">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <Trophy className="w-4 h-4 text-primary" />资质证书
              </h2>
              <div>
                <Label className="mb-1.5 block">证书名称（每行一条）</Label>
                <Textarea value={form.certifications} onChange={e => setForm(f => ({ ...f, certifications: e.target.value }))} rows={3} placeholder={"ITF国际网球联合会认证教练\n中国网球协会一级教练"} className="resize-none" />
              </div>
              <div>
                <Label className="mb-1.5 block">证书图片上传</Label>
                <p className="text-xs text-muted-foreground mb-2">上传证书照片（JPG/PNG，每张不超过5MB），管理员审核时可查看</p>
                <div className="flex flex-wrap gap-3">
                  {certImages.map((url, i) => (
                    <div key={i} className="relative w-24 h-24 rounded-lg overflow-hidden border border-border group">
                      <img src={url} alt={`证书${i+1}`} className="w-full h-full object-cover" />
                      <button
                        className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        onClick={() => setCertImages(prev => prev.filter((_, idx) => idx !== i))}
                      >
                        <X className="w-5 h-5 text-white" />
                      </button>
                    </div>
                  ))}
                  <button
                    className="w-24 h-24 rounded-lg border-2 border-dashed border-border hover:border-primary flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-primary transition-colors"
                    onClick={() => certFileRef.current?.click()}
                    disabled={uploadingCert}
                  >
                    {uploadingCert ? (
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Upload className="w-5 h-5" />
                        <span className="text-xs">上传图片</span>
                      </>
                    )}
                  </button>
                  <input ref={certFileRef} type="file" accept="image/*" className="hidden" onChange={handleCertImageUpload} />
                </div>
              </div>
              <div>
                <Label className="mb-1.5 block">荣誉成就（每行一条）</Label>
                <Textarea value={form.achievements} onChange={e => setForm(f => ({ ...f, achievements: e.target.value }))} rows={3} placeholder={"2018年深圳网球公开赛冠军\n前ATP职业球员排名最高第320位"} className="resize-none" />
              </div>
            </div>

            {/* Social Media & Video */}
            <div className="card-elegant p-6 space-y-4">
              <h2 className="font-semibold text-base flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />社交媒体 &amp; 视频介绍
              </h2>
              <p className="text-sm text-muted-foreground">填写您的社交媒体主页链接，学员可在您的详情页直接访问</p>

              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3">
                  <span className="w-20 text-sm text-muted-foreground shrink-0">小红书</span>
                  <Input value={form.socialXiaohongshu} onChange={e => setForm(f => ({ ...f, socialXiaohongshu: e.target.value }))} placeholder="https://www.xiaohongshu.com/user/..." />
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-20 text-sm text-muted-foreground shrink-0">微信公众号</span>
                  <Input value={form.socialWechat} onChange={e => setForm(f => ({ ...f, socialWechat: e.target.value }))} placeholder="公众号名称或链接" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-20 text-sm text-muted-foreground shrink-0">微博</span>
                  <Input value={form.socialWeibo} onChange={e => setForm(f => ({ ...f, socialWeibo: e.target.value }))} placeholder="https://weibo.com/u/..." />
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-20 text-sm text-muted-foreground shrink-0">抖音</span>
                  <Input value={form.socialDouyin} onChange={e => setForm(f => ({ ...f, socialDouyin: e.target.value }))} placeholder="抖音主页链接或号码" />
                </div>
                <div className="flex items-center gap-3">
                  <span className="w-20 text-sm text-muted-foreground shrink-0">其他</span>
                  <Input value={form.socialOther} onChange={e => setForm(f => ({ ...f, socialOther: e.target.value }))} placeholder="其他社交平台链接" />
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <Label className="mb-1.5 flex items-center gap-2">
                  <Youtube className="w-4 h-4 text-primary" />视频介绍链接
                </Label>
                <Input
                  value={form.videoUrl}
                  onChange={e => setForm(f => ({ ...f, videoUrl: e.target.value }))}
                  placeholder="B站/YouTube/抖音视频链接，将在您的详情页展示"
                />
                <p className="text-xs text-muted-foreground mt-1">支持 Bilibili、YouTube、抖音等平台的视频链接</p>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex gap-3">
              <Button
                className="flex-1 bg-primary text-primary-foreground h-12 rounded-xl font-semibold"
                onClick={handleSubmit}
                disabled={updateProfile.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {updateProfile.isPending ? "保存中..." : "保存资料"}
              </Button>
              {canSubmit && (
                <Button
                  variant="outline"
                  className="h-12 px-6 rounded-xl font-semibold border-primary text-primary hover:bg-primary/5"
                  disabled={submitForReview.isPending || !form.displayName}
                  onClick={() => submitForReview.mutate()}
                >
                  <Send className="w-4 h-4 mr-2" />
                  {submitForReview.isPending ? "提交中..." : "提交审核"}
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
