import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import Navbar from "@/components/tennis/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  CheckCircle2, Clock, XCircle, ChevronRight, Plus, X,
  Award, Briefcase, DollarSign, User, FileText, Loader2,
  Upload, ImageIcon, Phone
} from "lucide-react";

const STATUS_MAP = {
  draft: { label: "草稿", color: "bg-muted text-muted-foreground", icon: FileText },
  pending: { label: "审核中", color: "bg-amber-100 text-amber-700", icon: Clock },
  approved: { label: "已通过", color: "bg-green-100 text-green-700", icon: CheckCircle2 },
  rejected: { label: "未通过", color: "bg-red-100 text-red-700", icon: XCircle },
};

async function uploadFile(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: formData });
  if (!res.ok) throw new Error("上传失败");
  const data = await res.json();
  return data.url as string;
}

export default function BecomeCoach() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  const { data: applicationCheck, isLoading: profileLoading } = trpc.coach.checkMyApplication.useQuery(undefined, {
    enabled: !!user,
    retry: false,
  });
  const existingProfile = applicationCheck?.exists ? applicationCheck : null;

  const [displayName, setDisplayName] = useState("");
  const [tagline, setTagline] = useState("");
  const [bio, setBio] = useState("");
  const [phone, setPhone] = useState("");
  const [yearsExperience, setYearsExperience] = useState("");
  const [pricePerHour, setPricePerHour] = useState("600");
  const [certInput, setCertInput] = useState("");
  const [certifications, setCertifications] = useState<string[]>([]);
  const [specialtyInput, setSpecialtyInput] = useState("");
  const [specialties, setSpecialties] = useState<string[]>([]);

  // Certificate image upload state
  const [certImages, setCertImages] = useState<string[]>([]);
  const [uploadingCert, setUploadingCert] = useState(false);
  const certFileRef = useRef<HTMLInputElement>(null);

  const createProfile = trpc.coach.createProfile.useMutation({
    onSuccess: () => {
      toast.success("申请已提交，等待审核");
    },
    onError: (e) => {
      if (e.data?.code === "CONFLICT") {
        toast.error("您已有教练档案");
      } else {
        toast.error(e.message || "提交失败");
      }
    },
  });

  const submitForReview = trpc.coach.submitForReview.useMutation({
    onSuccess: () => {
      toast.success("已提交审核，请等待管理员审批");
    },
    onError: (e) => toast.error(e.message || "提交失败"),
  });

  const handleCertImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingCert(true);
    try {
      const urls: string[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) {
          toast.error("请上传图片文件");
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          toast.error("图片大小不能超过 5MB");
          continue;
        }
        const url = await uploadFile(file);
        urls.push(url);
      }
      setCertImages(prev => [...prev, ...urls]);
      toast.success(`已上传 ${urls.length} 张证书图片`);
    } catch {
      toast.error("图片上传失败，请重试");
    } finally {
      setUploadingCert(false);
      if (certFileRef.current) certFileRef.current.value = "";
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-xl mx-auto py-20 text-center">
          <div className="text-6xl mb-6">🎾</div>
          <h1 className="font-serif text-3xl font-bold mb-4">申请成为教练</h1>
          <p className="text-muted-foreground mb-8">请先登录，再填写教练申请信息</p>
          <Button className="bg-primary text-primary-foreground px-8 h-12 rounded-xl"
            onClick={() => window.location.href = getLoginUrl()}>
            立即登录
          </Button>
        </div>
      </div>
    );
  }

  // Already a coach
  if (user.role === "coach" || user.role === "admin") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-xl mx-auto py-20 text-center">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-6" />
          <h1 className="font-serif text-3xl font-bold mb-4">您已是平台教练</h1>
          <p className="text-muted-foreground mb-8">您的教练账号已激活，可以前往教练工作台管理课程</p>
          <Button className="bg-primary text-primary-foreground px-8 h-12 rounded-xl"
            onClick={() => navigate("/coach-dashboard")}>
            前往教练工作台
          </Button>
        </div>
      </div>
    );
  }

  // Has existing application
  if (existingProfile && existingProfile.profile) {
    const profile = existingProfile.profile;
    const status = profile.verificationStatus as keyof typeof STATUS_MAP;
    const statusInfo = STATUS_MAP[status] ?? STATUS_MAP.draft;
    const StatusIcon = statusInfo.icon;

    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container max-w-2xl mx-auto py-12 px-4">
          <div className="card-elegant p-8 text-center space-y-6">
            <StatusIcon className={`w-16 h-16 mx-auto ${status === "approved" ? "text-green-500" : status === "rejected" ? "text-red-500" : status === "pending" ? "text-amber-500" : "text-muted-foreground"}`} />
            <div>
              <h1 className="font-serif text-2xl font-bold mb-2">教练入驻申请</h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${statusInfo.color}`}>
                <StatusIcon className="w-3.5 h-3.5" />
                {statusInfo.label}
              </span>
            </div>

            {status === "draft" && (
              <div className="space-y-4">
                <p className="text-muted-foreground">您的申请已保存为草稿，请确认信息无误后提交审核</p>
                <div className="text-left bg-muted/50 rounded-xl p-4 space-y-2 text-sm">
                  <div><span className="text-muted-foreground">姓名：</span>{profile.displayName}</div>
                  {profile.tagline && <div><span className="text-muted-foreground">简介：</span>{profile.tagline}</div>}
                  <div><span className="text-muted-foreground">课时费：</span>¥{profile.pricePerHour}/小时</div>
                </div>
                <Button
                  className="w-full bg-primary text-primary-foreground h-12 rounded-xl font-semibold"
                  onClick={() => submitForReview.mutate()}
                  disabled={submitForReview.isPending}
                >
                  {submitForReview.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  提交审核
                </Button>
              </div>
            )}

            {status === "pending" && (
              <div className="space-y-3">
                <p className="text-muted-foreground">您的申请正在审核中，通常需要 1-3 个工作日</p>
                <p className="text-sm text-muted-foreground">审核结果将通过站内通知告知您</p>
              </div>
            )}

            {status === "approved" && (
              <div className="space-y-4">
                <p className="text-muted-foreground">您的教练入驻申请已通过！</p>
                <Button className="bg-primary text-primary-foreground px-8 h-12 rounded-xl"
                  onClick={() => navigate("/coach-dashboard")}>
                  前往教练工作台
                  <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            )}

            {status === "rejected" && (
              <div className="space-y-4">
                <p className="text-muted-foreground">很遗憾，您的申请未通过审核</p>
                {profile.reviewNote && (
                  <div className="text-left p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-800">
                    <span className="font-medium">审核意见：</span>{profile.reviewNote}
                  </div>
                )}
                <p className="text-sm text-muted-foreground">请完善资料后重新提交</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Application form
  const handleAddCert = () => {
    if (certInput.trim() && !certifications.includes(certInput.trim())) {
      setCertifications([...certifications, certInput.trim()]);
      setCertInput("");
    }
  };
  const handleAddSpecialty = () => {
    if (specialtyInput.trim() && !specialties.includes(specialtyInput.trim())) {
      setSpecialties([...specialties, specialtyInput.trim()]);
      setSpecialtyInput("");
    }
  };

  const handleSubmit = () => {
    if (!displayName.trim()) { toast.error("请填写姓名"); return; }
    const price = parseFloat(pricePerHour);
    if (isNaN(price) || price < 300) { toast.error("课时费不能低于 ¥300/小时"); return; }

    createProfile.mutate({
      displayName: displayName.trim(),
      tagline: tagline.trim() || undefined,
      bio: bio.trim() || undefined,
      phone: phone.trim() || undefined,
      yearsExperience: yearsExperience ? parseInt(yearsExperience) : undefined,
      pricePerHour: price.toFixed(2),
      certifications,
      certificationImages: certImages,
      specialties,
    });
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container max-w-2xl mx-auto py-12 px-4 space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="text-5xl">🎾</div>
          <h1 className="font-serif text-3xl font-bold">申请成为教练</h1>
          <p className="text-muted-foreground">填写您的教练资料，提交后由平台审核，通过后即可接受学员预约</p>
        </div>

        {/* Steps */}
        <div className="grid grid-cols-3 gap-3 text-center text-sm">
          {[
            { icon: FileText, label: "填写资料" },
            { icon: Clock, label: "等待审核" },
            { icon: CheckCircle2, label: "开始接课" },
          ].map((step, i) => (
            <div key={i} className={`p-3 rounded-xl border ${i === 0 ? "border-primary bg-primary/5" : "border-border"}`}>
              <step.icon className={`w-5 h-5 mx-auto mb-1 ${i === 0 ? "text-primary" : "text-muted-foreground"}`} />
              <div className={i === 0 ? "text-primary font-medium" : "text-muted-foreground"}>{step.label}</div>
            </div>
          ))}
        </div>

        {/* Form */}
        <div className="card-elegant p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <h2 className="font-semibold flex items-center gap-2">
              <User className="w-4 h-4 text-primary" />基本信息
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium mb-1.5 block">
                  姓名 <span className="text-destructive">*</span>
                </Label>
                <Input placeholder="您的真实姓名" value={displayName} onChange={e => setDisplayName(e.target.value)} />
              </div>
              <div>
                <Label className="text-sm font-medium mb-1.5 block">执教年限</Label>
                <Input type="number" placeholder="如：5" min="0" value={yearsExperience} onChange={e => setYearsExperience(e.target.value)} />
              </div>
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">一句话简介</Label>
              <Input placeholder="如：ITF 认证教练，专注青少年培训" value={tagline} onChange={e => setTagline(e.target.value)} />
            </div>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">详细介绍</Label>
              <Textarea
                placeholder="介绍您的教学理念、擅长方向、过往经历等..."
                value={bio}
                onChange={e => setBio(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          {/* Contact Phone */}
          <div className="space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Phone className="w-4 h-4 text-primary" />联系方式
            </h2>
            <div>
              <Label className="text-sm font-medium mb-1.5 block">联系手机号</Label>
              <Input
                type="tel"
                placeholder="用于预约确认后与学员互通联系方式"
                value={phone}
                onChange={e => setPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1">预约成功后，平台会将您的手机号发送给学员，方便双方沟通</p>
            </div>
          </div>

          {/* Price */}
          <div className="space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-primary" />课时费设置
            </h2>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <Label className="text-sm font-medium mb-1.5 block">
                  课时费（元/小时）<span className="text-destructive">*</span>
                </Label>
                <Input
                  type="number"
                  placeholder="600"
                  min="300"
                  value={pricePerHour}
                  onChange={e => setPricePerHour(e.target.value)}
                />
              </div>
              <div className="text-sm text-muted-foreground mt-6">
                平台最低 ¥300/小时
              </div>
            </div>
          </div>

          {/* Certifications */}
          <div className="space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Award className="w-4 h-4 text-primary" />资质证书
            </h2>
            {/* Text certifications */}
            <div className="flex gap-2">
              <Input
                placeholder="如：ITF Level 2 教练证"
                value={certInput}
                onChange={e => setCertInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddCert()}
              />
              <Button variant="outline" size="sm" onClick={handleAddCert} className="shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {certifications.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {certifications.map(c => (
                  <Badge key={c} variant="secondary" className="gap-1 pr-1">
                    {c}
                    <button onClick={() => setCertifications(certifications.filter(x => x !== c))}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            {/* Certificate image upload */}
            <div className="space-y-2">
              <Label className="text-sm font-medium block">证书图片上传</Label>
              <p className="text-xs text-muted-foreground">上传证书照片有助于提高审核通过率（支持 JPG/PNG，单张最大 5MB）</p>
              <input
                ref={certFileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleCertImageUpload}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => certFileRef.current?.click()}
                disabled={uploadingCert}
                className="gap-2"
              >
                {uploadingCert ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploadingCert ? "上传中..." : "选择图片"}
              </Button>

              {certImages.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {certImages.map((url, i) => (
                    <div key={i} className="relative group rounded-lg overflow-hidden border border-border aspect-[4/3] bg-muted">
                      <img src={url} alt={`证书 ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setCertImages(certImages.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => certFileRef.current?.click()}
                    disabled={uploadingCert}
                    className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border aspect-[4/3] text-muted-foreground hover:border-primary hover:text-primary transition-colors"
                  >
                    <ImageIcon className="w-5 h-5 mb-1" />
                    <span className="text-xs">添加</span>
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Specialties */}
          <div className="space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-primary" />擅长方向
            </h2>
            <div className="flex gap-2">
              <Input
                placeholder="如：青少年培训、底线技术"
                value={specialtyInput}
                onChange={e => setSpecialtyInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleAddSpecialty()}
              />
              <Button variant="outline" size="sm" onClick={handleAddSpecialty} className="shrink-0">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {specialties.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {specialties.map(s => (
                  <Badge key={s} variant="secondary" className="gap-1 pr-1">
                    {s}
                    <button onClick={() => setSpecialties(specialties.filter(x => x !== s))}>
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <Button
            className="w-full bg-primary text-primary-foreground h-12 rounded-xl font-semibold"
            onClick={handleSubmit}
            disabled={createProfile.isPending || uploadingCert}
          >
            {createProfile.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            提交申请
            <ChevronRight className="ml-2 w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
