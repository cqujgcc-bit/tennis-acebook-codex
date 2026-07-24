import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Plus, Building2, Clock, Trash2, Edit2 } from "lucide-react";

export default function PartnerVenueAdmin() {
  const utils = trpc.useUtils();

  // 场馆列表
  const { data: venues = [], isLoading } = trpc.partnerVenue.list.useQuery();

  // 新增/编辑场馆
  const [venueDialog, setVenueDialog] = useState(false);
  const [editingVenue, setEditingVenue] = useState<any>(null);
  const [venueForm, setVenueForm] = useState({
    name: "", district: "", address: "", phone: "",
    courtCount: 1, priceRange: "", openTime: "08:00", closeTime: "22:00",
    bookingUrl: "", description: "", amenities: "", isActive: true, sortOrder: 0
  });

  // 空场时段管理
  const [selectedVenue, setSelectedVenue] = useState<any>(null);
  const [slotDialog, setSlotDialog] = useState(false);
  const [slotDate, setSlotDate] = useState(getTodayStr());
  const [slotForm, setSlotForm] = useState({
    courtName: "", startTime: "09:00", endTime: "10:00", price: "", note: ""
  });

  const { data: slots = [], refetch: refetchSlots } = trpc.partnerVenue.slots.useQuery(
    { venueId: selectedVenue?.id || 0, date: slotDate },
    { enabled: !!selectedVenue }
  );

  const createVenue = trpc.partnerVenue.adminCreate.useMutation({
    onSuccess: () => { utils.partnerVenue.list.invalidate(); setVenueDialog(false); toast.success("场馆已创建"); }
  });
  const updateVenue = trpc.partnerVenue.adminUpdate.useMutation({
    onSuccess: () => { utils.partnerVenue.list.invalidate(); setVenueDialog(false); toast.success("场馆已更新"); }
  });
  const addSlot = trpc.partnerVenue.addSlot.useMutation({
    onSuccess: () => { refetchSlots(); setSlotDialog(false); toast.success("时段已添加"); }
  });
  const deleteSlot = trpc.partnerVenue.deleteSlot.useMutation({
    onSuccess: () => { refetchSlots(); toast.success("时段已删除"); }
  });

  function getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }

  function openAddVenue() {
    setEditingVenue(null);
    setVenueForm({ name:"", district:"", address:"", phone:"", courtCount:1, priceRange:"", openTime:"08:00", closeTime:"22:00", bookingUrl:"", description:"", amenities:"", isActive:true, sortOrder:0 });
    setVenueDialog(true);
  }

  function openEditVenue(v: any) {
    setEditingVenue(v);
    setVenueForm({
      name: v.name, district: v.district||"", address: v.address||"", phone: v.phone||"",
      courtCount: v.courtCount||1, priceRange: v.priceRange||"", openTime: v.openTime||"08:00",
      closeTime: v.closeTime||"22:00", bookingUrl: v.bookingUrl||"", description: v.description||"",
      amenities: (v.amenities||[]).join("，"), isActive: v.isActive, sortOrder: v.sortOrder||0
    });
    setVenueDialog(true);
  }

  function submitVenue() {
    const payload = {
      ...venueForm,
      amenities: venueForm.amenities ? venueForm.amenities.split(/[，,]/).map(s=>s.trim()).filter(Boolean) : []
    };
    if (editingVenue) {
      updateVenue.mutate({ id: editingVenue.id, ...payload });
    } else {
      createVenue.mutate(payload as any);
    }
  }

  function submitSlot() {
    if (!selectedVenue) return;
    addSlot.mutate({
      venueId: selectedVenue.id,
      slotDate: slotDate,
      courtName: slotForm.courtName,
      startTime: slotForm.startTime,
      endTime: slotForm.endTime,
      price: slotForm.price ? Number(slotForm.price) : undefined,
      remark: slotForm.note || undefined,
    });
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">合作场馆管理</h1>
          <p className="text-muted-foreground text-sm mt-1">管理合作场馆信息和空场时段，供小程序首页展示</p>
        </div>
        <Button onClick={openAddVenue}><Plus className="w-4 h-4 mr-2" />添加场馆</Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">加载中...</div>
      ) : venues.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">暂无合作场馆，点击右上角添加</div>
      ) : (
        <div className="grid gap-4">
          {venues.map((v: any) => (
            <Card key={v.id} className={!v.isActive ? "opacity-60" : ""}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Building2 className="w-5 h-5 text-green-700" />
                      {v.name}
                      <Badge variant={v.isActive ? "default" : "secondary"} className="ml-2">
                        {v.isActive ? "上线" : "下线"}
                      </Badge>
                    </CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{v.district} · {v.address}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditVenue(v)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => { setSelectedVenue(v); setSlotDate(getTodayStr()); }}>
                      <Clock className="w-4 h-4 mr-1" />管理时段
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 text-sm text-muted-foreground">
                  <span>🎾 {v.courtCount} 片场地</span>
                  <span>💰 {v.priceRange}</span>
                  <span>🕐 {v.openTime}–{v.closeTime}</span>
                  {v.phone && <span>📞 {v.phone}</span>}
                </div>
                {v.amenities?.length > 0 && (
                  <div className="flex gap-2 mt-2 flex-wrap">
                    {v.amenities.map((a: string) => (
                      <Badge key={a} variant="outline" className="text-xs">{a}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 场馆时段管理面板 */}
      {selectedVenue && (
        <div className="mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>{selectedVenue.name} · 空场时段</CardTitle>
                <div className="flex items-center gap-3">
                  <Input type="date" value={slotDate} onChange={e => setSlotDate(e.target.value)} className="w-40" />
                  <Button size="sm" onClick={() => { setSlotForm({ courtName:"", startTime:"09:00", endTime:"10:00", price:"", note:"" }); setSlotDialog(true); }}>
                    <Plus className="w-4 h-4 mr-1" />添加时段
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedVenue(null)}>关闭</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {slots.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">{slotDate} 暂无空场时段</p>
              ) : (
                <div className="space-y-2">
                  {slots.map((s: any) => (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <div>
                        <span className="font-semibold">{s.startTime}–{s.endTime}</span>
                        <span className="ml-3 text-sm text-muted-foreground">{s.courtName}</span>
                        {s.price && <span className="ml-3 text-sm text-red-600">¥{s.price}/时</span>}
                        {s.note && <span className="ml-3 text-xs text-gray-500">{s.note}</span>}
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => deleteSlot.mutate({ id: s.id })}>
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* 新增/编辑场馆弹窗 */}
      <Dialog open={venueDialog} onOpenChange={setVenueDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingVenue ? "编辑场馆" : "添加合作场馆"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>场馆名称 *</Label><Input value={venueForm.name} onChange={e=>setVenueForm(f=>({...f,name:e.target.value}))} placeholder="如：深云文体公园" /></div>
              <div><Label>所在区域</Label><Input value={venueForm.district} onChange={e=>setVenueForm(f=>({...f,district:e.target.value}))} placeholder="如：南山区" /></div>
            </div>
            <div><Label>详细地址</Label><Input value={venueForm.address} onChange={e=>setVenueForm(f=>({...f,address:e.target.value}))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>联系电话</Label><Input value={venueForm.phone} onChange={e=>setVenueForm(f=>({...f,phone:e.target.value}))} /></div>
              <div><Label>场地数量</Label><Input type="number" value={venueForm.courtCount} onChange={e=>setVenueForm(f=>({...f,courtCount:Number(e.target.value)}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>收费标准</Label><Input value={venueForm.priceRange} onChange={e=>setVenueForm(f=>({...f,priceRange:e.target.value}))} placeholder="如：¥80-120/时" /></div>
              <div><Label>在线预订链接</Label><Input value={venueForm.bookingUrl} onChange={e=>setVenueForm(f=>({...f,bookingUrl:e.target.value}))} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>开放时间</Label><Input type="time" value={venueForm.openTime} onChange={e=>setVenueForm(f=>({...f,openTime:e.target.value}))} /></div>
              <div><Label>关闭时间</Label><Input type="time" value={venueForm.closeTime} onChange={e=>setVenueForm(f=>({...f,closeTime:e.target.value}))} /></div>
            </div>
            <div><Label>设施配套（逗号分隔）</Label><Input value={venueForm.amenities} onChange={e=>setVenueForm(f=>({...f,amenities:e.target.value}))} placeholder="如：停车场，更衣室，淋浴" /></div>
            <div><Label>场馆简介</Label><Textarea value={venueForm.description} onChange={e=>setVenueForm(f=>({...f,description:e.target.value}))} rows={3} /></div>
            <div className="flex items-center gap-3">
              <Switch checked={venueForm.isActive} onCheckedChange={v=>setVenueForm(f=>({...f,isActive:v}))} />
              <Label>上线展示（关闭则不在小程序显示）</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setVenueDialog(false)}>取消</Button>
            <Button onClick={submitVenue} disabled={!venueForm.name}>
              {editingVenue ? "保存修改" : "创建场馆"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 添加时段弹窗 */}
      <Dialog open={slotDialog} onOpenChange={setSlotDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>添加空场时段 · {slotDate}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div><Label>场地名称 *</Label><Input value={slotForm.courtName} onChange={e=>setSlotForm(f=>({...f,courtName:e.target.value}))} placeholder="如：1号场、A场" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>开始时间</Label><Input type="time" value={slotForm.startTime} onChange={e=>setSlotForm(f=>({...f,startTime:e.target.value}))} /></div>
              <div><Label>结束时间</Label><Input type="time" value={slotForm.endTime} onChange={e=>setSlotForm(f=>({...f,endTime:e.target.value}))} /></div>
            </div>
            <div><Label>价格（元/时，可选）</Label><Input type="number" value={slotForm.price} onChange={e=>setSlotForm(f=>({...f,price:e.target.value}))} placeholder="不填则显示场馆默认价格" /></div>
            <div><Label>备注（可选）</Label><Input value={slotForm.note} onChange={e=>setSlotForm(f=>({...f,note:e.target.value}))} placeholder="如：室内场、灯光费另计" /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={()=>setSlotDialog(false)}>取消</Button>
            <Button onClick={submitSlot} disabled={!slotForm.courtName}>添加时段</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
