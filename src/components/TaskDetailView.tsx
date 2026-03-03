import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Clock, User, Send, Check, CalendarIcon, X, Paperclip, ListChecks, FileText, FileImage, FileSpreadsheet, FileArchive, FileVideo, FileAudio, File, Plus, Trash2, Settings, Pencil, Copy, MoreVertical, Eye, ChevronDown, Sparkles, Pause, Play, ShieldCheck, CircleCheck, Moon, CircleDot, type LucideIcon } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useBitrix24Profile } from "@/hooks/useBitrix24Profile";
import type { Bitrix24Task, Bitrix24User } from "@/lib/bitrix24";
import { updateTask } from "@/lib/bitrix24";
import { toast } from "sonner";
import RichTextEditor from "@/components/RichTextEditor";

interface Props {
  task: Bitrix24Task;
  members: Bitrix24User[];
  projectName?: string;
  sectionName?: string;
  onBack: () => void;
}

const statusConfig: Record<string, {label: string;color: string;bg: string;icon: LucideIcon;}> = {
  "1": { label: "Новая", color: "text-teal-600", bg: "bg-teal-500/10", icon: Sparkles },
  "2": { label: "Ожидает", color: "text-yellow-600", bg: "bg-yellow-500/10", icon: Pause },
  "3": { label: "В работе", color: "text-blue-600", bg: "bg-blue-500/10", icon: Play },
  "4": { label: "На согласовании", color: "text-amber-600", bg: "bg-amber-500/10", icon: ShieldCheck },
  "5": { label: "Завершена", color: "text-green-600", bg: "bg-green-500/10", icon: CircleCheck },
  "6": { label: "Отложена", color: "text-muted-foreground", bg: "bg-muted", icon: Moon }
};

const priorityConfig: Record<string, {label: string;color: string;}> = {
  "0": { label: "Низкий", color: "text-muted-foreground" },
  "1": { label: "Средний", color: "text-blue-500" },
  "2": { label: "Высокий", color: "text-red-500" }
};

function getInitials(name?: string | null) {
  if (!name) return "?";
  return name.trim().split(/\s+/).map((p) => p.charAt(0)).join("").slice(0, 2).toUpperCase();
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "long" });
}

function formatDateTime(dateStr?: string) {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return `${d.toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" })} ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
}

function isOverdue(task: Bitrix24Task) {
  return task.status !== "5" && task.deadline && new Date(task.deadline) < new Date();
}

function toRoman(n: number): string {
  const vals = [1000, 900, 500, 400, 100, 90, 50, 40, 10, 9, 5, 4, 1];
  const syms = ["M", "CM", "D", "CD", "C", "XC", "L", "XL", "X", "IX", "V", "IV", "I"];
  let r = "";for (let i = 0; i < vals.length; i++) while (n >= vals[i]) {r += syms[i];n -= vals[i];}return r;
}

interface MockMessage {
  id: number;
  author: string;
  authorIcon?: string;
  text: string;
  date: string;
  isMine: boolean;
}

/* ─── Checklist settings menu ─── */
const ChecklistSettingsMenu = ({ onEdit, onCopy, onDelete, onNewChecklist }: {onEdit: () => void;onCopy: () => void;onDelete: () => void;onNewChecklist: () => void;}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);};
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen((v) => !v)} className="shrink-0 w-5 h-5 flex items-center justify-center rounded-md hover:bg-foreground/[0.06] transition-colors"><Settings className="w-3.5 h-3.5 text-foreground/30" /></button>
      {open &&
      <div className="absolute right-0 top-full mt-1 z-50 w-36 rounded-lg border border-border bg-card shadow-lg p-1 animate-in fade-in-0 zoom-in-95 duration-150">
          <button onClick={() => {onEdit();setOpen(false);}} className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md hover:bg-foreground/[0.04] transition-colors text-left"><Pencil className="w-3.5 h-3.5 text-foreground/40" /><span className="text-xs text-foreground/70">Редактировать</span></button>
          <button onClick={() => {onCopy();setOpen(false);}} className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md hover:bg-foreground/[0.04] transition-colors text-left"><Copy className="w-3.5 h-3.5 text-foreground/40" /><span className="text-xs text-foreground/70">Скопировать</span></button>
          <button onClick={() => {onDelete();setOpen(false);}} className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md hover:bg-destructive/10 transition-colors text-left"><Trash2 className="w-3.5 h-3.5 text-destructive/60" /><span className="text-xs text-destructive/80">Удалить</span></button>
          <div className="h-px bg-border my-1" />
          <button onClick={() => {onNewChecklist();setOpen(false);}} className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md hover:bg-foreground/[0.04] transition-colors text-left"><Plus className="w-3.5 h-3.5 text-foreground/40" /><span className="text-xs text-foreground/70">Новый чек-лист</span></button>
        </div>
      }
    </div>);

};
const roadmapSteps = [
  { key: "1", label: "Новая", color: "text-teal-600", bg: "bg-teal-500/15", icon: Sparkles },
  { key: "3", label: "В работе", color: "text-blue1", bg: "bg-blue1/15", icon: Play },
  { key: "2", label: "Нужна помощь", color: "text-red-600", bg: "bg-red-500/15", icon: Pause },
  { key: "4", label: "На согласовании", color: "text-yellow-600", bg: "bg-yellow-500/15", icon: ShieldCheck },
  { key: "5", label: "Завершена", color: "text-green-600", bg: "bg-green-500/15", icon: CircleCheck },
];
const roadmapOrder = roadmapSteps.map(s => s.key);

const StatusRoadmap = ({ status, onStatusChange }: { status: string; onStatusChange?: (key: string) => void }) => {
  const [collapsed, setCollapsed] = useState(false);
  const measureRef = useRef<HTMLDivElement>(null);
  const currentIdx = roadmapOrder.indexOf(status);
  const activeStep = roadmapSteps.find(s => s.key === status) || roadmapSteps[0];

  useEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const check = () => {
      const parent = el.parentElement;
      if (!parent) return;
      setCollapsed(el.scrollWidth > parent.clientWidth);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] px-3 py-3">
      <div className="flex items-center gap-2 px-2.5 pb-2">
        <CircleDot className="w-4 h-4 text-foreground/30 shrink-0" />
        <span className="text-xs text-foreground/30">Статус</span>
      </div>
      <div className="overflow-hidden px-2.5">
        <div ref={measureRef} className={`flex items-center gap-0 whitespace-nowrap w-[85%] ${collapsed ? 'invisible absolute' : ''}`}>
          {roadmapSteps.map((step, i, arr) => {
            const isActive = status === step.key;
            const stepIdx = roadmapOrder.indexOf(step.key);
            const isPassed = currentIdx > stepIdx && currentIdx !== -1;
            return (
              <div key={step.key} className="flex items-center flex-1 min-w-0">
                <button
                  onClick={() => onStatusChange?.(step.key)}
                  className={`flex items-center gap-0.5 px-1 py-1 rounded-lg transition-all w-full cursor-pointer hover:opacity-80 ${
                    isActive ? `${step.bg} ${step.color} ring-1 ring-inset ring-current/20` : isPassed ? 'bg-foreground/[0.04] text-foreground/30' : 'bg-transparent text-foreground/20 hover:bg-foreground/[0.03]'
                  }`}
                >
                  <step.icon className={`w-3 h-3 shrink-0 ${isActive ? '' : isPassed ? 'text-green-500' : ''}`} />
                  <span className={`text-[10px] font-medium truncate ${isActive ? 'font-semibold' : ''}`}>{step.label}</span>
                </button>
                {i < arr.length - 1 && (
                  <div className={`w-3 h-px shrink-0 ${isPassed ? 'bg-green-400' : 'bg-foreground/10'}`} />
                )}
              </div>
            );
          })}
        </div>
        {collapsed && (
          <Popover>
            <PopoverTrigger asChild>
              <button className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold ${activeStep.bg} ${activeStep.color} ring-1 ring-inset ring-current/20 w-full`}>
                <activeStep.icon className="w-3 h-3 shrink-0" />
                <span className="truncate">{activeStep.label}</span>
                <ChevronDown className="w-3 h-3 ml-auto shrink-0 opacity-50" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-48 p-1" align="start">
              {roadmapSteps.map(step => {
                const isActive = status === step.key;
                return (
                  <button
                    key={step.key}
                    onClick={() => onStatusChange?.(step.key)}
                    className={`flex items-center gap-2 w-full px-3 py-2 rounded-md text-xs transition-colors ${isActive ? `${step.bg} ${step.color} font-semibold` : 'hover:bg-foreground/5 text-foreground/60'}`}
                  >
                    <step.icon className="w-3.5 h-3.5 shrink-0" />
                    {step.label}
                  </button>
                );
              })}
            </PopoverContent>
          </Popover>
        )}
      </div>
    </div>
  );
};


const TaskDetailView = ({ task, members, projectName, sectionName, onBack }: Props) => {
  const st = statusConfig[task.status] || statusConfig["6"];
  const pr = priorityConfig[task.priority] || priorityConfig["1"];
  const overdue = isOverdue(task);
  const { data: currentUser } = useBitrix24Profile();

  // Permission: current user is creator or responsible
  const canEdit = currentUser && (
  String(currentUser.ID) === task.createdBy ||
  String(currentUser.ID) === task.creator?.id ||
  String(currentUser.ID) === task.responsible?.id);


  // Editable state
  const [editingCreator, setEditingCreator] = useState(false);
  const [editingResponsible, setEditingResponsible] = useState(false);
  const [editingDeadline, setEditingDeadline] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [localTitle, setLocalTitle] = useState(task.title);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const [localDescription, setLocalDescription] = useState(task.description || "");
  const [editingDescription, setEditingDescription] = useState<boolean>(false);

  // Local editable values
  const [localCreatorId, setLocalCreatorId] = useState(task.creator?.id);
  const [localResponsibleId, setLocalResponsibleId] = useState(task.responsible?.id);
  const [localAuditorIds, setLocalAuditorIds] = useState<string[]>(
    () => task.auditors?.map((a) => a.id) || []
  );
  const [auditorsOpen, setAuditorsOpen] = useState(false);
  const auditorsRef = useRef<HTMLDivElement>(null);

  const [localAccompliceIds, setLocalAccompliceIds] = useState<string[]>(
    () => task.accomplices?.map((a) => a.id) || []
  );
  const [accomplicesOpen, setAccomplicesOpen] = useState(false);
  const accomplicesRef = useRef<HTMLDivElement>(null);

  // Files
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [attachedFiles, setAttachedFiles] = useState<{file: globalThis.File;comment: string;}[]>([]);

  // Result files
  const resultFileInputRef = useRef<HTMLInputElement>(null);
  const [resultFiles, setResultFiles] = useState<{file: globalThis.File;comment: string;}[]>([]);

  // Checklists
  const [checklists, setChecklists] = useState<{id: string;title: string;items: {id: string;title: string;assigneeId?: string;files?: {name: string;size: number;}[];}[];}[]>([]);
  const checkItemFileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [activeChecklistId, setActiveChecklistId] = useState<string | null>(null);
  const [newCheckItem, setNewCheckItem] = useState("");

  // Build assignee candidates from task roles (creator, responsible, accomplices)
  const assigneeCandidates = (() => {
    const ids = new Set<string>();
    if (localCreatorId) ids.add(localCreatorId);
    if (localResponsibleId) ids.add(localResponsibleId);
    localAccompliceIds.forEach((id) => ids.add(id));
    return members.filter((m) => ids.has(m.ID));
  })();

  useEffect(() => {
    if (!auditorsOpen) return;
    const handler = (e: MouseEvent) => {
      if (auditorsRef.current && !auditorsRef.current.contains(e.target as Node)) setAuditorsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [auditorsOpen]);

  useEffect(() => {
    if (!accomplicesOpen) return;
    const handler = (e: MouseEvent) => {
      if (accomplicesRef.current && !accomplicesRef.current.contains(e.target as Node)) setAccomplicesOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [accomplicesOpen]);

  const handleToggleAuditor = async (userId: string) => {
    const next = localAuditorIds.includes(userId) ?
    localAuditorIds.filter((id) => id !== userId) :
    [...localAuditorIds, userId];
    setLocalAuditorIds(next);
    setAuditorsOpen(false);
    await handleUpdateField("AUDITORS", next);
  };

  const handleToggleAccomplice = async (userId: string) => {
    const next = localAccompliceIds.includes(userId) ?
    localAccompliceIds.filter((id) => id !== userId) :
    [...localAccompliceIds, userId];
    setLocalAccompliceIds(next);
    setAccomplicesOpen(false);
    await handleUpdateField("ACCOMPLICES", next);
  };
  const [localDeadline, setLocalDeadline] = useState<Date | undefined>(task.deadline ? new Date(task.deadline) : undefined);
  const [deadlineHour, setDeadlineHour] = useState(() => {
    if (!task.deadline) return "12";
    return String(new Date(task.deadline).getHours()).padStart(2, "0");
  });
  const [deadlineMinute, setDeadlineMinute] = useState(() => {
    if (!task.deadline) return "00";
    return String(new Date(task.deadline).getMinutes()).padStart(2, "0");
  });

  const handleUpdateField = async (field: string, value: unknown) => {
    setSaving(true);
    try {
      await updateTask(task.id, { [field]: value });
      toast.success("Задача обновлена");
    } catch (e: any) {
      toast.error("Нет прав или ошибка: " + (e?.message || "неизвестная ошибка"));
    } finally {
      setSaving(false);
    }
  };

  const handleSelectCreator = async (userId: string) => {
    setLocalCreatorId(userId);
    setEditingCreator(false);
    await handleUpdateField("CREATED_BY", userId);
  };

  const handleSelectResponsible = async (userId: string) => {
    setLocalResponsibleId(userId);
    setEditingResponsible(false);
    await handleUpdateField("RESPONSIBLE_ID", userId);
  };

  const handleSaveTitle = async () => {
    setEditingTitle(false);
    const trimmed = localTitle.trim();
    if (!trimmed || trimmed === task.title) {
      setLocalTitle(task.title);
      return;
    }
    await handleUpdateField("TITLE", trimmed);
  };

  const handleBecomeAuditor = async () => {
    if (!currentUser) return;
    const uid = String(currentUser.ID);
    if (localAuditorIds.includes(uid)) {
      toast.info("Вы уже наблюдатель");
      return;
    }
    const next = [...localAuditorIds, uid];
    setLocalAuditorIds(next);
    await handleUpdateField("AUDITORS", next);
  };

  const handleSaveDeadline = async () => {
    setEditingDeadline(false);
    if (!localDeadline) {
      await handleUpdateField("DEADLINE", "");
      return;
    }
    const d = new Date(localDeadline);
    d.setHours(parseInt(deadlineHour), parseInt(deadlineMinute), 0, 0);
    setLocalDeadline(d);
    const iso = d.toISOString().replace("T", " ").slice(0, 19);
    await handleUpdateField("DEADLINE", iso);
  };

  // Find member by ID
  const getMember = (id?: string) => members.find((m) => m.ID === id);

  const localCreator = getMember(localCreatorId);
  const localResponsible = getMember(localResponsibleId);

  const [messages, setMessages] = useState<MockMessage[]>([
  {
    id: 1,
    author: task.creator?.name || "Система",
    authorIcon: task.creator?.icon,
    text: `Задача "${task.title}" создана`,
    date: task.createdDate || new Date().toISOString(),
    isMine: false
  }]
  );
  const [newMessage, setNewMessage] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!newMessage.trim()) return;
    setMessages((prev) => [
    ...prev,
    { id: Date.now(), author: "Вы", text: newMessage.trim(), date: new Date().toISOString(), isMine: true }]
    );
    setNewMessage("");
  };

  const InfoRow = ({ label, children }: {label: string;children: React.ReactNode;}) =>
  <div className="flex items-center gap-3 py-2">
      <div className="flex items-center gap-1.5 w-[161px] shrink-0">
        <span className="text-xs text-foreground/50 font-medium">{label}</span>
      </div>
      <div className="flex-1 min-w-0 text-sm">{children}</div>
    </div>;


  const PersonBadge = ({ name, icon, onClick }: {name: string;icon?: string;onClick?: () => void;}) =>
  <div
    className={cn("flex items-center gap-2", onClick && "cursor-pointer hover:text-blue1 transition-colors")}
    onClick={onClick}>
    
      <Avatar className="w-6 h-6">
        <AvatarImage src={icon} />
        <AvatarFallback className="text-[8px] bg-muted">{getInitials(name)}</AvatarFallback>
      </Avatar>
      <span className="text-xs">{name}</span>
      {/* clickable */}
    </div>;


  const MemberSelector = ({ selectedId, onSelect, open, onOpenChange }: {selectedId?: string;onSelect: (id: string) => void;open: boolean;onOpenChange: (v: boolean) => void;}) =>
  <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>
        <span />
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1" align="start">
        <ScrollArea className="max-h-48">
          {members.map((m) =>
        <button
          key={m.ID}
          onClick={() => onSelect(m.ID)}
          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted transition-colors text-left">
          
              <Avatar className="w-5 h-5">
                <AvatarImage src={m.PERSONAL_PHOTO} />
                <AvatarFallback className="text-[7px] bg-muted">{getInitials(`${m.NAME} ${m.LAST_NAME}`)}</AvatarFallback>
              </Avatar>
              <span className="text-xs flex-1 truncate">{m.LAST_NAME} {m.NAME}</span>
              {m.ID === selectedId && <Check className="w-3.5 h-3.5 text-primary" />}
            </button>
        )}
        </ScrollArea>
      </PopoverContent>
    </Popover>;


  const creatorName = localCreator ? `${localCreator.LAST_NAME} ${localCreator.NAME}` : task.creator?.name;
  const creatorIcon = localCreator?.PERSONAL_PHOTO || task.creator?.icon;
  const responsibleName = localResponsible ? `${localResponsible.LAST_NAME} ${localResponsible.NAME}` : task.responsible?.name;
  const responsibleIcon = localResponsible?.PERSONAL_PHOTO || task.responsible?.icon;

  const deadlineDateStr = localDeadline ? localDeadline.toISOString() : undefined;

  return (
    <div className="flex h-full min-h-0 w-full border border-border rounded-2xl bg-card overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col border-r border-border">
        <div className="px-5 py-3 border-b border-border bg-muted/30 flex items-center gap-3">
          <button onClick={onBack} className="w-7 h-7 rounded-full bg-foreground/[0.05] hover:bg-foreground/[0.1] flex items-center justify-center transition-colors shrink-0">
            <ArrowLeft className="w-4 h-4 text-foreground/60" />
          </button>
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="flex items-center gap-1.5">
              <h2
                ref={titleRef}
                contentEditable={editingTitle}
                suppressContentEditableWarning
                onInput={(e) => setLocalTitle((e.target as HTMLElement).textContent || "")}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleSaveTitle(); } if (e.key === "Escape") { if (titleRef.current) titleRef.current.textContent = task.title; setLocalTitle(task.title); setEditingTitle(false); } }}
                className={cn(
                  "text-base font-semibold truncate text-foreground outline-none",
                  editingTitle && "border-b border-primary truncate-none"
                )}
              >
                {task.title}
              </h2>
              {editingTitle && (
                <button
                  onClick={handleSaveTitle}
                  className="w-5 h-5 rounded-full bg-blue1 flex items-center justify-center shrink-0 hover:bg-blue1/80 transition-colors"
                >
                  <Check className="w-3 h-3 text-white" />
                </button>
              )}
            </div>
            {(sectionName || projectName) && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {sectionName}{sectionName && projectName ? " / " : ""}{projectName}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-7 h-7 rounded-full hover:bg-foreground/[0.08] flex items-center justify-center transition-colors shrink-0">
                <MoreVertical className="w-4 h-4 text-foreground/50" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[180px]">
              <DropdownMenuItem onClick={() => { setEditingTitle(true); setTimeout(() => { if (titleRef.current) { titleRef.current.focus(); const range = document.createRange(); range.selectNodeContents(titleRef.current); const sel = window.getSelection(); sel?.removeAllRanges(); sel?.addRange(range); } }, 50); }}>
                <Pencil className="w-4 h-4 mr-2" />
                Изменить название
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleBecomeAuditor}>
                <Eye className="w-4 h-4 mr-2" />
                Стать наблюдателем
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-5 space-y-4">
            <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] px-3">
              {/* Постановщик */}
              <InfoRow label="Постановщик">
                <div className="relative">
                  {creatorName ?
                  <PersonBadge
                    name={creatorName}
                    icon={creatorIcon}
                    onClick={canEdit ? () => setEditingCreator(true) : undefined} /> :


                  <span className={cn("text-muted-foreground", canEdit && "cursor-pointer hover:opacity-70")} onClick={canEdit ? () => setEditingCreator(true) : undefined}>—</span>
                  }
                  {canEdit &&
                  <MemberSelector
                    selectedId={localCreatorId}
                    onSelect={handleSelectCreator}
                    open={editingCreator}
                    onOpenChange={setEditingCreator} />

                  }
                </div>
              </InfoRow>

              {/* Исполнитель */}
              <InfoRow label="Исполнитель">
                <div className="relative">
                  {responsibleName ?
                  <PersonBadge
                    name={responsibleName}
                    icon={responsibleIcon}
                    onClick={canEdit ? () => setEditingResponsible(true) : undefined} /> :


                  <span className={cn("text-muted-foreground", canEdit && "cursor-pointer hover:opacity-70")} onClick={canEdit ? () => setEditingResponsible(true) : undefined}>—</span>
                  }
                  {canEdit &&
                  <MemberSelector
                    selectedId={localResponsibleId}
                    onSelect={handleSelectResponsible}
                    open={editingResponsible}
                    onOpenChange={setEditingResponsible} />

                  }
                </div>
              </InfoRow>

              {/* Помощники */}
              <InfoRow label="Помощники">
                <div className="relative" ref={accomplicesRef}>
                  <div
                    onClick={canEdit ? () => setAccomplicesOpen((v) => !v) : undefined}
                    className={cn("flex items-center gap-2", canEdit && "cursor-pointer")}>
                    
                    {(() => {
                      const selected = members.filter((m) => localAccompliceIds.includes(m.ID));
                      return selected.length > 0 ?
                      <div className="flex items-center gap-2 flex-1 min-w-0 hover:text-blue1 transition-colors">
                          <div className="flex items-center -space-x-1.5">
                            {selected.slice(0, 3).map((u) =>
                          <Avatar key={u.ID} className="w-6 h-6 shrink-0 border border-card">
                                <AvatarImage src={u.PERSONAL_PHOTO} />
                                <AvatarFallback className="text-[8px] bg-muted">{getInitials(`${u.NAME} ${u.LAST_NAME}`)}</AvatarFallback>
                              </Avatar>
                          )}
                          </div>
                          <span className="text-sm truncate">
                            {selected.length === 1 ? `${selected[0].LAST_NAME} ${selected[0].NAME}` : `${selected.length} чел.`}
                          </span>
                          {canEdit &&
                        <button
                          onClick={(e) => {e.stopPropagation();setLocalAccompliceIds([]);handleUpdateField("ACCOMPLICES", []);}}
                          className="ml-auto shrink-0 w-4 h-4 flex items-center justify-center rounded-full hover:bg-foreground/[0.08]">
                          
                              <X className="w-3 h-3 text-foreground/30" />
                            </button>
                        }
                        </div> :

                      <div className={cn("flex items-center gap-2 group/pick", !canEdit && "pointer-events-none opacity-60")}>
                          <User className="w-4 h-4 text-foreground/30 group-hover/pick:text-ring transition-colors" />
                          <span className="text-xs text-foreground/30 group-hover/pick:text-ring transition-colors">Выбрать</span>
                        </div>;

                    })()}
                  </div>
                  {accomplicesOpen &&
                  <div className="absolute left-0 top-full mt-1 z-50 w-56 max-h-40 overflow-auto rounded-lg border border-border bg-card shadow-lg p-1 animate-in fade-in-0 zoom-in-95 duration-150">
                      {members.length === 0 ?
                    <p className="text-xs text-muted-foreground italic px-2 py-1">Нет участников</p> :

                    members.map((u) =>
                    <button
                      key={u.ID}
                      onClick={() => handleToggleAccomplice(u.ID)}
                      className={cn(
                        "flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-colors text-left",
                        localAccompliceIds.includes(u.ID) ? "bg-ring/10" : "hover:bg-foreground/[0.04]"
                      )}>
                      
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={u.PERSONAL_PHOTO} />
                              <AvatarFallback className="text-[8px] bg-muted">{getInitials(`${u.NAME} ${u.LAST_NAME}`)}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-foreground/70 truncate">{u.LAST_NAME} {u.NAME}</span>
                            {localAccompliceIds.includes(u.ID) && <span className="ml-auto text-[10px] text-ring font-medium">✓</span>}
                          </button>
                    )
                    }
                    </div>
                  }
                </div>
              </InfoRow>

              {/* Наблюдатели */}
              <InfoRow label="Наблюдатели">
                <div className="relative" ref={auditorsRef}>
                  <div
                    onClick={canEdit ? () => setAuditorsOpen((v) => !v) : undefined}
                    className={cn("flex items-center gap-2", canEdit && "cursor-pointer")}>
                    
                    {(() => {
                      const selected = members.filter((m) => localAuditorIds.includes(m.ID));
                      return selected.length > 0 ?
                      <div className="flex items-center gap-2 flex-1 min-w-0 hover:text-blue1 transition-colors">
                          <div className="flex items-center -space-x-1.5">
                            {selected.slice(0, 3).map((u) =>
                          <Avatar key={u.ID} className="w-6 h-6 shrink-0 border border-card">
                                <AvatarImage src={u.PERSONAL_PHOTO} />
                                <AvatarFallback className="text-[8px] bg-muted">{getInitials(`${u.NAME} ${u.LAST_NAME}`)}</AvatarFallback>
                              </Avatar>
                          )}
                          </div>
                          <span className="text-sm truncate">
                            {selected.length === 1 ? `${selected[0].LAST_NAME} ${selected[0].NAME}` : `${selected.length} чел.`}
                          </span>
                          {canEdit &&
                        <button
                          onClick={(e) => {e.stopPropagation();setLocalAuditorIds([]);handleUpdateField("AUDITORS", []);}}
                          className="ml-auto shrink-0 w-4 h-4 flex items-center justify-center rounded-full hover:bg-foreground/[0.08]">
                          
                              <X className="w-3 h-3 text-foreground/30" />
                            </button>
                        }
                        </div> :

                      <div className={cn("flex items-center gap-2 group/pick", !canEdit && "pointer-events-none opacity-60")}>
                          <User className="w-4 h-4 text-foreground/30 group-hover/pick:text-ring transition-colors" />
                          <span className="text-xs text-foreground/30 group-hover/pick:text-ring transition-colors">Выбрать</span>
                        </div>;

                    })()}
                  </div>
                  {auditorsOpen &&
                  <div className="absolute left-0 top-full mt-1 z-50 w-56 max-h-40 overflow-auto rounded-lg border border-border bg-card shadow-lg p-1 animate-in fade-in-0 zoom-in-95 duration-150">
                      {members.length === 0 ?
                    <p className="text-xs text-muted-foreground italic px-2 py-1">Нет участников</p> :

                    members.map((u) =>
                    <button
                      key={u.ID}
                      onClick={() => handleToggleAuditor(u.ID)}
                      className={cn(
                        "flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-colors text-left",
                        localAuditorIds.includes(u.ID) ? "bg-ring/10" : "hover:bg-foreground/[0.04]"
                      )}>
                      
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={u.PERSONAL_PHOTO} />
                              <AvatarFallback className="text-[8px] bg-muted">{getInitials(`${u.NAME} ${u.LAST_NAME}`)}</AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-foreground/70 truncate">{u.LAST_NAME} {u.NAME}</span>
                            {localAuditorIds.includes(u.ID) && <span className="ml-auto text-[10px] text-ring font-medium">✓</span>}
                          </button>
                    )
                    }
                    </div>
                  }
                </div>
              </InfoRow>


              {/* Крайний срок */}
              <Collapsible>
                <div className="flex items-center gap-3 py-2">
                  <div className="flex items-center gap-1.5 w-[161px] shrink-0">
                    <span className="text-xs text-foreground/50 font-medium">Крайний срок</span>
                  </div>
                  <div className="flex-1 min-w-0 text-sm flex items-center gap-2">
                    <div className="relative flex-1">
                      {canEdit ?
                      <Popover open={editingDeadline} onOpenChange={(v) => {if (!v) handleSaveDeadline();setEditingDeadline(v);}}>
                          <PopoverTrigger asChild>
                            <div className="flex items-center gap-2 cursor-pointer hover:text-blue1 transition-colors text-xs">
                              <CalendarIcon className="w-3.5 h-3.5 text-foreground/30 shrink-0" />
                              <span className={overdue ? "text-red-500 font-medium" : ""}>
                                {overdue && <Clock className="w-3 h-3 inline mr-1" />}
                                {localDeadline ? formatDate(localDeadline.toISOString()) : "—"}
                              </span>
{localDeadline && (() => {const h = localDeadline.getHours();const m = localDeadline.getMinutes();return h !== 0 || m !== 0 ? <span className={overdue ? "text-red-500 font-medium" : ""}>{String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}</span> : null;})()}
                            </div>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarPicker mode="single" selected={localDeadline} onSelect={setLocalDeadline} initialFocus className={cn("p-3 pointer-events-auto")} />
                            <div className="flex items-center gap-2 px-3 pb-3 border-t border-border pt-2">
                              <span className="text-xs text-muted-foreground">Время:</span>
                              <select value={deadlineHour} onChange={(e) => setDeadlineHour(e.target.value)} className="h-7 rounded-md border border-border bg-muted/50 px-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring">
                                {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => <option key={h} value={h}>{h}</option>)}
                              </select>
                              <span className="text-xs text-muted-foreground">:</span>
                              <select value={deadlineMinute} onChange={(e) => setDeadlineMinute(e.target.value)} className="h-7 rounded-md border border-border bg-muted/50 px-1.5 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring">
                                {["00", "15", "30", "45"].map((m) => <option key={m} value={m}>{m}</option>)}
                              </select>
                            </div>
                          </PopoverContent>
                        </Popover> :
                      <div className="flex items-center gap-2">
                          <CalendarIcon className="w-3.5 h-3.5 text-foreground/30 shrink-0" />
                          <span className={overdue ? "text-red-500 font-medium" : ""}>
                            {overdue && <Clock className="w-3 h-3 inline mr-1" />}
                            {formatDate(deadlineDateStr)}
                          </span>
                          {localDeadline && (() => {const h = localDeadline.getHours();const m = localDeadline.getMinutes();return h !== 0 || m !== 0 ? <span className={overdue ? "text-red-500 font-medium" : ""}>{String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}</span> : null;})()}
                        </div>
                      }
                    </div>
                    <CollapsibleTrigger asChild>
                      <button className="w-5 h-5 rounded-full hover:bg-foreground/[0.08] flex items-center justify-center transition-colors shrink-0">
                        <ChevronDown className="w-3.5 h-3.5 text-foreground/30 transition-transform duration-200 [[data-state=open]>button>&]:rotate-180" />
                      </button>
                    </CollapsibleTrigger>
                  </div>
                </div>
                <CollapsibleContent>
                  <InfoRow label="Дата создания">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-foreground/40" />
                      <span className="text-xs">
                        {task.createdDate ? (() => {
                          const d = new Date(task.createdDate);
                          return `${d.toLocaleDateString("ru-RU", { day: "numeric", month: "long" })} ${d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
                        })() : "—"}
                      </span>
                      <span className="text-[11px] text-muted-foreground/50">ID {task.id}</span>
                    </div>
                  </InfoRow>
                </CollapsibleContent>
              </Collapsible>
            </div>


            {/* Описание задачи */}
            <div>
              {editingDescription ? (
                <div>
                  <RichTextEditor
                    value={localDescription}
                    onChange={setLocalDescription}
                    placeholder="Описание"
                  />
                  <div className="flex justify-end mt-1.5">
                    <button
                      onClick={() => setEditingDescription(false)}
                      className="text-[11px] text-foreground/40 hover:text-foreground/70 transition-colors px-2 py-1 rounded-md hover:bg-foreground/[0.04]"
                    >
                      Свернуть
                    </button>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] px-3 py-2">
                  <button
                    onClick={() => setEditingDescription(true)}
                    className="group/desc flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md transition-colors"
                  >
                    <FileText className="w-4 h-4 text-foreground/30 group-hover/desc:text-foreground/50 transition-colors shrink-0" />
                    <div className="flex-1 min-w-0 text-xs text-foreground/30 group-hover/desc:text-foreground/50 truncate text-left transition-colors" dangerouslySetInnerHTML={{ __html: localDescription || 'Описание' }} />
                    <Pencil className="w-3 h-3 text-foreground/20 group-hover/desc:text-foreground/50 transition-colors shrink-0" />
                  </button>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] px-3 py-2">
              <button onClick={() => fileInputRef.current?.click()} className="group/file flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md transition-colors">
                <Paperclip className="w-4 h-4 text-foreground/30 group-hover/file:text-blue1 transition-colors" />
                <span className="text-xs text-foreground/30 group-hover/file:text-blue1 transition-colors">Добавить файлы</span>
              </button>
              <input ref={fileInputRef} type="file" multiple className="hidden" onChange={(e) => {
                const files = e.target.files ? Array.from(e.target.files) : [];
                if (files.length > 0) setAttachedFiles((prev) => [...prev, ...files.map((f) => ({ file: f, comment: "" }))]);
                e.target.value = "";
              }} />
              {attachedFiles.length > 0 &&
              <div className="mt-2 space-y-1.5">
                  {attachedFiles.map((item, i) => {
                  const ext = item.file.name.split(".").pop()?.toLowerCase() || "";
                  const IconComp = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(ext) ? FileImage : ["pdf", "doc", "docx", "txt", "rtf", "odt"].includes(ext) ? FileText : ["xls", "xlsx", "csv"].includes(ext) ? FileSpreadsheet : ["zip", "rar", "7z", "tar", "gz"].includes(ext) ? FileArchive : ["mp4", "avi", "mov", "mkv", "webm"].includes(ext) ? FileVideo : ["mp3", "wav", "ogg", "flac", "aac"].includes(ext) ? FileAudio : File;
                  const colorClass = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(ext) ? "text-green-500" : ["pdf"].includes(ext) ? "text-red-500" : ["doc", "docx", "txt", "rtf", "odt"].includes(ext) ? "text-blue-500" : ["xls", "xlsx", "csv"].includes(ext) ? "text-emerald-600" : ["zip", "rar", "7z", "tar", "gz"].includes(ext) ? "text-amber-500" : ["mp4", "avi", "mov", "mkv", "webm"].includes(ext) ? "text-purple-500" : ["mp3", "wav", "ogg", "flac", "aac"].includes(ext) ? "text-pink-500" : "text-foreground/40";
                  return (
                    <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-foreground/[0.03]">
                        <IconComp className={`w-4 h-4 shrink-0 ${colorClass}`} />
                        <span className="text-xs text-foreground/60 truncate shrink-0 max-w-[120px]">{item.file.name}</span>
                        <span className="text-foreground/10 shrink-0">·</span>
                        <input type="text" value={item.comment} onChange={(e) => setAttachedFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, comment: e.target.value } : f))} placeholder="Комментарий..." className="flex-1 min-w-0 text-[11px] text-foreground/50 placeholder:text-foreground/20 bg-transparent border-none outline-none" />
                        <span className="text-[10px] text-foreground/25 shrink-0">{(item.file.size / 1024).toFixed(0)} KB</span>
                        <button onClick={() => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))} className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full hover:bg-foreground/[0.08]"><X className="w-3 h-3 text-foreground/30" /></button>
                      </div>);

                })}
                </div>
              }
            </div>

            <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] px-3 py-2">
              <button onClick={() => {const newId = crypto.randomUUID();setChecklists((prev) => [...prev, { id: newId, title: "Чек-лист", items: [] }]);setActiveChecklistId(newId);}}
              className="group/cl flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md transition-colors">
                <ListChecks className="w-4 h-4 text-foreground/30 group-hover/cl:text-blue1 transition-colors" />
                <span className="text-xs text-foreground/30 group-hover/cl:text-blue1 transition-colors">Добавить чек-лист</span>
              </button>
            </div>

            <StatusRoadmap status={task.status} onStatusChange={(key) => handleUpdateField("STATUS", key)} />


            {checklists.map((cl, clIndex) =>
            <div key={cl.id} className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] px-3 py-2">
                <div className="flex items-center gap-1.5 mb-1">
                  <ListChecks className="w-3.5 h-3.5 text-muted-foreground" />
                  {activeChecklistId === cl.id ?
                <div className="flex items-center gap-1 flex-1 min-w-0">
                      <span className="text-xs text-foreground/50 font-medium shrink-0">{toRoman(clIndex + 1)}.</span>
                      <input type="text" value={cl.title} onChange={(e) => setChecklists((prev) => prev.map((c) => c.id === cl.id ? { ...c, title: e.target.value } : c))} placeholder="Название чек-листа..." className="text-xs text-foreground/50 font-medium flex-1 bg-transparent border-none outline-none placeholder:text-foreground/30" autoFocus />
                    </div> :
                <span className="text-xs text-foreground/50 font-medium flex-1">{toRoman(clIndex + 1)}. {cl.title}</span>}
                  {activeChecklistId === cl.id && <button onClick={() => setActiveChecklistId(null)} className="w-4 h-4 rounded-full bg-ring text-white flex items-center justify-center hover:opacity-80 transition-colors shrink-0" title="Сохранить"><Check className="w-2.5 h-2.5" /></button>}
                  <ChecklistSettingsMenu
                  onEdit={() => setActiveChecklistId(cl.id)}
                  onCopy={() => {const copy = { ...cl, id: crypto.randomUUID(), title: cl.title + " (копия)", items: cl.items.map((item) => ({ ...item, id: crypto.randomUUID() })) };setChecklists((prev) => [...prev, copy]);}}
                  onDelete={() => {setChecklists((prev) => prev.filter((c) => c.id !== cl.id));if (activeChecklistId === cl.id) setActiveChecklistId(null);}}
                  onNewChecklist={() => {const newId = crypto.randomUUID();setChecklists((prev) => [...prev, { id: newId, title: "Чек-лист", items: [] }]);setActiveChecklistId(newId);}} />
                
                </div>
                {cl.items.length > 0 &&
              <div className="space-y-1 mb-2">
                    {cl.items.map((item, itemIndex) =>
                <div key={item.id} className="rounded-md bg-foreground/[0.03] group">
                        <div className="flex items-center gap-2 px-2 py-1.5">
                          <span className="text-[10px] text-foreground/30 shrink-0 w-4 text-right tabular-nums">{itemIndex + 1}.</span>
                          <span className="text-xs text-foreground/70 truncate flex-1">{item.title}</span>
                          <button onClick={() => checkItemFileRefs.current[item.id]?.click()}
                    className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full hover:bg-foreground/[0.08] opacity-60 group-hover:opacity-100 transition-opacity" title="Прикрепить файл">
                            <Paperclip className="w-3 h-3 text-foreground/30" />
                          </button>
                          <input ref={(el) => {checkItemFileRefs.current[item.id] = el;}} type="file" multiple className="hidden" onChange={(e) => {
                      const files = e.target.files ? Array.from(e.target.files) : [];
                      if (files.length > 0) {
                        setChecklists((prev) => prev.map((c) => c.id === cl.id ? { ...c, items: c.items.map((ci) => ci.id === item.id ? { ...ci, files: [...(ci.files || []), ...files.map((f) => ({ name: f.name, size: f.size }))] } : ci) } : c));
                      }
                      e.target.value = "";
                    }} />
                          <Popover>
                            <PopoverTrigger asChild>
                              <button className="shrink-0 flex items-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity hover:bg-foreground/[0.06] rounded-md px-1 py-0.5">
                                {(() => {
                            const assignee = item.assigneeId ? members.find((m) => m.ID === item.assigneeId) : null;
                            if (assignee) {
                              const name = `${assignee.LAST_NAME || ""} ${assignee.NAME || ""}`.trim();
                              return (
                                <>
                                        <Avatar className="w-4 h-4"><AvatarImage src={assignee.PERSONAL_PHOTO} /><AvatarFallback className="text-[6px] bg-muted">{getInitials(name)}</AvatarFallback></Avatar>
                                        <span className="text-[10px] text-foreground/50 max-w-[60px] truncate">{assignee.NAME}</span>
                                      </>);

                            }
                            return <User className="w-3 h-3 text-foreground/30" />;
                          })()}
                              </button>
                            </PopoverTrigger>
                            <PopoverContent className="w-44 p-1" align="end">
                              {assigneeCandidates.length === 0 ?
                        <p className="text-xs text-muted-foreground italic px-2 py-1">Нет участников</p> :
                        assigneeCandidates.map((u) => {
                          const name = `${u.LAST_NAME || ""} ${u.NAME || ""}`.trim();
                          return (
                            <button key={u.ID} onClick={() => setChecklists((prev) => prev.map((c) => c.id === cl.id ? { ...c, items: c.items.map((ci) => ci.id === item.id ? { ...ci, assigneeId: ci.assigneeId === u.ID ? undefined : u.ID } : ci) } : c))}
                            className={`flex items-center gap-2 w-full px-2 py-1.5 rounded-md transition-colors text-left ${item.assigneeId === u.ID ? "bg-ring/10" : "hover:bg-foreground/[0.04]"}`}>
                                    <Avatar className="w-5 h-5"><AvatarImage src={u.PERSONAL_PHOTO} /><AvatarFallback className="text-[7px] bg-muted">{getInitials(name)}</AvatarFallback></Avatar>
                                    <span className="text-xs text-foreground/70 truncate">{name}</span>
                                    {item.assigneeId === u.ID && <span className="ml-auto text-[10px] text-ring font-medium">✓</span>}
                                  </button>);

                        })}
                            </PopoverContent>
                          </Popover>
                          <button onClick={() => setChecklists((prev) => prev.map((c) => c.id === cl.id ? { ...c, items: c.items.filter((ci) => ci.id !== item.id) } : c))}
                    className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full hover:bg-foreground/[0.08] opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3 text-foreground/30" /></button>
                        </div>
                        {item.files && item.files.length > 0 &&
                  <div className="px-2 pb-1.5 pl-8 flex flex-wrap gap-1">
                            {item.files.map((f, fi) => {
                      const ext = f.name.split(".").pop()?.toLowerCase() || "";
                      const IconComp = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(ext) ? FileImage : ["pdf", "doc", "docx", "txt", "rtf", "odt"].includes(ext) ? FileText : ["xls", "xlsx", "csv"].includes(ext) ? FileSpreadsheet : ["zip", "rar", "7z", "tar", "gz"].includes(ext) ? FileArchive : File;
                      return (
                        <div key={fi} className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-foreground/[0.04] max-w-[140px]">
                                  <IconComp className="w-3 h-3 text-foreground/40 shrink-0" />
                                  <span className="text-[10px] text-foreground/50 truncate">{f.name}</span>
                                  <button onClick={() => setChecklists((prev) => prev.map((c) => c.id === cl.id ? { ...c, items: c.items.map((ci) => ci.id === item.id ? { ...ci, files: (ci.files || []).filter((_, idx) => idx !== fi) } : ci) } : c))}
                          className="shrink-0 w-3 h-3 flex items-center justify-center rounded-full hover:bg-foreground/[0.08]"><X className="w-2 h-2 text-foreground/30" /></button>
                                </div>);

                    })}
                          </div>
                  }
                      </div>
                )}
                  </div>
              }
                <div className="flex items-center gap-2">
                  <input type="text" value={activeChecklistId === cl.id ? newCheckItem : ""} onFocus={() => setActiveChecklistId(cl.id)}
                onChange={(e) => {setActiveChecklistId(cl.id);setNewCheckItem(e.target.value);}}
                onKeyDown={(e) => {if (e.key === "Enter" && newCheckItem.trim()) {setChecklists((prev) => prev.map((c) => c.id === cl.id ? { ...c, items: [...c.items, { id: crypto.randomUUID(), title: newCheckItem.trim() }] } : c));setNewCheckItem("");}}}
                placeholder="Название пункта..." className="flex-1 text-xs text-foreground/70 placeholder:text-foreground/30 bg-transparent border-none outline-none px-2.5 py-1.5 min-h-[32px]" />
                  <button onClick={() => {if (newCheckItem.trim() && activeChecklistId === cl.id) {setChecklists((prev) => prev.map((c) => c.id === cl.id ? { ...c, items: [...c.items, { id: crypto.randomUUID(), title: newCheckItem.trim() }] } : c));setNewCheckItem("");}}}
                className="shrink-0 w-6 h-6 flex items-center justify-center rounded-md hover:bg-foreground/[0.04] transition-colors"><Plus className="w-3.5 h-3.5 text-foreground/30" /></button>
                </div>
              </div>
            )}

            {/* Результаты выполнения */}
            <div className="rounded-xl border border-foreground/[0.06] bg-foreground/[0.03] px-3 py-2">
              <div className="flex items-center gap-2 mb-1.5">
                <FileText className="w-3.5 h-3.5 text-foreground/40" />
                <span className="text-xs font-medium text-foreground/60">Финальный результат задачи</span>
              </div>
              <textarea
                placeholder="Вы - большой молодец! Добавьте финальное описание выполненных работ и результатов..."
                className="w-full min-h-[60px] text-xs text-foreground/70 placeholder:text-foreground/25 bg-transparent border-none outline-none resize-none px-1 py-1 leading-relaxed"
              />
              <div className="mt-1.5 border-t border-foreground/[0.06] pt-1.5">
                <button onClick={() => resultFileInputRef.current?.click()} className="group/rf flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors">
                  <Paperclip className="w-3.5 h-3.5 text-foreground/30 group-hover/rf:text-blue1 transition-colors" />
                  <span className="text-[11px] text-foreground/30 group-hover/rf:text-blue1 transition-colors">Прикрепить файлы</span>
                </button>
                <input ref={resultFileInputRef} type="file" multiple className="hidden" onChange={(e) => {
                  const files = e.target.files ? Array.from(e.target.files) : [];
                  if (files.length > 0) setResultFiles((prev) => [...prev, ...files.map((f) => ({ file: f, comment: "" }))]);
                  e.target.value = "";
                }} />
                {resultFiles.length > 0 &&
                <div className="mt-1.5 space-y-1.5">
                    {resultFiles.map((item, i) => {
                    const ext = item.file.name.split(".").pop()?.toLowerCase() || "";
                    const IconComp = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(ext) ? FileImage : ["pdf", "doc", "docx", "txt", "rtf", "odt"].includes(ext) ? FileText : ["xls", "xlsx", "csv"].includes(ext) ? FileSpreadsheet : ["zip", "rar", "7z", "tar", "gz"].includes(ext) ? FileArchive : ["mp4", "avi", "mov", "mkv", "webm"].includes(ext) ? FileVideo : ["mp3", "wav", "ogg", "flac", "aac"].includes(ext) ? FileAudio : File;
                    const colorClass = ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp", "ico"].includes(ext) ? "text-green-500" : ["pdf"].includes(ext) ? "text-red-500" : ["doc", "docx", "txt", "rtf", "odt"].includes(ext) ? "text-blue-500" : ["xls", "xlsx", "csv"].includes(ext) ? "text-emerald-600" : ["zip", "rar", "7z", "tar", "gz"].includes(ext) ? "text-amber-500" : ["mp4", "avi", "mov", "mkv", "webm"].includes(ext) ? "text-purple-500" : ["mp3", "wav", "ogg", "flac", "aac"].includes(ext) ? "text-pink-500" : "text-foreground/40";
                    return (
                      <div key={i} className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-foreground/[0.03]">
                          <IconComp className={`w-4 h-4 shrink-0 ${colorClass}`} />
                          <span className="text-xs text-foreground/60 truncate shrink-0 max-w-[120px]">{item.file.name}</span>
                          <span className="text-foreground/10 shrink-0">·</span>
                          <input type="text" value={item.comment} onChange={(e) => setResultFiles((prev) => prev.map((f, idx) => idx === i ? { ...f, comment: e.target.value } : f))} placeholder="Комментарий..." className="flex-1 min-w-0 text-[11px] text-foreground/50 placeholder:text-foreground/20 bg-transparent border-none outline-none" />
                          <span className="text-[10px] text-foreground/25 shrink-0">{(item.file.size / 1024).toFixed(0)} KB</span>
                          <button onClick={() => setResultFiles((prev) => prev.filter((_, idx) => idx !== i))} className="shrink-0 w-4 h-4 flex items-center justify-center rounded-full hover:bg-foreground/[0.08]"><X className="w-3 h-3 text-foreground/30" /></button>
                        </div>);
                  })}
                  </div>
                }
              </div>
            </div>
          </div>
        </ScrollArea>
      </div>
      {/* Chat panel */}
      <div className="w-[340px] shrink-0 flex flex-col">
        <div className="px-4 py-3 border-b border-border bg-muted/30">
          <h3 className="text-xs font-semibold text-foreground/70">Комментарии к задаче</h3>
        </div>
        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 space-y-3">
            {messages.map((msg) =>
            <div key={msg.id} className={`flex gap-2.5 ${msg.isMine ? "flex-row-reverse" : ""}`}>
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarImage src={msg.authorIcon} />
                  <AvatarFallback className="text-[8px] bg-muted">{getInitials(msg.author)}</AvatarFallback>
                </Avatar>
                <div className={`max-w-[220px] ${msg.isMine ? "items-end" : ""}`}>
                  <p className="text-[10px] text-muted-foreground mb-0.5">{msg.author}</p>
                  <div className={`rounded-xl px-3 py-2 text-xs leading-relaxed ${msg.isMine ? "bg-ring/10 text-foreground/80" : "bg-foreground/[0.04] text-foreground/70"}`}>{msg.text}</div>
                  <p className="text-[9px] text-muted-foreground/60 mt-0.5">{new Date(msg.date).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}</p>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </ScrollArea>
        <div className="p-3 border-t border-border">
          <div className="flex items-center gap-2 bg-foreground/[0.03] rounded-xl px-3 py-2">
            <input type="text" value={newMessage} onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
            placeholder="Написать комментарий..."
            className="flex-1 bg-transparent text-xs text-foreground/80 placeholder:text-muted-foreground/40 outline-none" />
            <button onClick={handleSend} disabled={!newMessage.trim()}
            className="w-7 h-7 rounded-full bg-ring flex items-center justify-center hover:bg-ring/80 transition-colors disabled:opacity-30">
              <Send className="w-3.5 h-3.5 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>);

};

export default TaskDetailView;