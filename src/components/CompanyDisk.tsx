import { useState, useMemo, useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { ru } from "date-fns/locale";
import { Folder, FileText, FileImage, FileSpreadsheet, File, ArrowUpDown, ChevronRight, ArrowLeft, Plus, FolderPlus, Upload, FolderOpen, Download, Share2, Pencil, Move, Copy, MoreVertical, Trash2 } from "lucide-react";
import { useBitrix24Storages, useBitrix24DiskChildren, useBitrix24RecentActivity } from "@/hooks/useBitrix24Disk";
import { useBitrix24Users } from "@/hooks/useBitrix24Users";
import { sortDiskItems, formatFileSize, createFolder, createStorageFolder, uploadFileToFolder, uploadFileToStorage, renameFolder, renameFile, deleteFolder, deleteFile, getFileDownloadUrl, moveFolder, moveFile, fetchStorageChildren, fetchFolderChildren, type DiskItem, type SortField, type SortOrder } from "@/lib/bitrix24-disk";
import { useQueryClient } from "@tanstack/react-query";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";

interface FolderPath { id: string; name: string; isStorage?: boolean; }

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  if (!ext) return <File size={18} className="text-muted-foreground" />;
  if (["jpg","jpeg","png","gif","webp","svg","bmp"].includes(ext)) return <FileImage size={18} className="text-blue-400" />;
  if (["xls","xlsx","csv"].includes(ext)) return <FileSpreadsheet size={18} className="text-green-500" />;
  if (["doc","docx","pdf","txt","rtf"].includes(ext)) return <FileText size={18} className="text-orange-400" />;
  return <File size={18} className="text-muted-foreground" />;
}

interface CompanyDiskProps { initialFolderName?: string; }

const CompanyDisk = ({ initialFolderName }: CompanyDiskProps) => {
  const { data: storages, isLoading: storagesLoading } = useBitrix24Storages();
  const [selectedStorageId, setSelectedStorageId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [folderPath, setFolderPath] = useState<FolderPath[]>([]);
  const [sortField, setSortField] = useState<SortField>("NAME");
  const [sortOrder, setSortOrder] = useState<SortOrder>("asc");
  const [newFolderOpen, setNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [renameOpen, setRenameOpen] = useState(false);
  const [renameItem, setRenameItem] = useState<DiskItem | null>(null);
  const [renameName, setRenameName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [initialFolderResolved, setInitialFolderResolved] = useState(!initialFolderName);
  const [showRecent, setShowRecent] = useState(false);
  const [showAllRecent, setShowAllRecent] = useState(false);
  const [moveOpen, setMoveOpen] = useState(false);
  const [moveItem, setMoveItem] = useState<DiskItem | null>(null);
  const [isMoving, setIsMoving] = useState(false);
  const [moveFolderPath, setMoveFolderPath] = useState<FolderPath[]>([]);
  const [moveBrowseItems, setMoveBrowseItems] = useState<DiskItem[]>([]);
  const [moveBrowseLoading, setMoveBrowseLoading] = useState(false);
  const { data: users } = useBitrix24Users();
  const { data: recentItems, isLoading: recentLoading } = useBitrix24RecentActivity(selectedStorageId);
  const usersMap = useMemo(() => { if (!users) return new Map<string, string>(); return new Map(users.map((u) => [u.ID, `${u.LAST_NAME} ${u.NAME?.charAt(0) || ""}.`])); }, [users]);

  useEffect(() => { if (storages && storages.length > 0 && !selectedStorageId) { const common = storages.find((s) => s.ENTITY_TYPE === "common" || s.NAME === "Общий диск"); const target = common || storages[0]; setSelectedStorageId(target.ID); setFolderPath([{ id: target.ID, name: "Общий диск компании", isStorage: true }]); } }, [storages, selectedStorageId]);

  const { data: rootChildren } = useBitrix24DiskChildren(initialFolderName && selectedStorageId && !initialFolderResolved ? selectedStorageId : null, null);

  useEffect(() => { if (initialFolderName && rootChildren && !initialFolderResolved && selectedStorageId) { const target = rootChildren.find((item) => item.TYPE === "folder" && item.NAME === initialFolderName); if (target) { setCurrentFolderId(target.ID); setFolderPath((prev) => [...prev, { id: target.ID, name: target.NAME }]); } setInitialFolderResolved(true); } }, [initialFolderName, rootChildren, initialFolderResolved, selectedStorageId]);

  const { data: children, isLoading: childrenLoading } = useBitrix24DiskChildren(currentFolderId ? null : selectedStorageId, currentFolderId);
  const FOLDER_ORDER: Record<string, number> = { "Финансовый отдел": 1, "Отдел закупок": 2, "Отдел продаж": 3, "Отдел маркетинга": 4, "Отдел HR": 5, "Файлы из почты": 6 };
  const sortedItems = useMemo(() => { if (!children) return []; const sorted = sortDiskItems(children, sortField, sortOrder); if (sortField === "NAME" && folderPath.length <= 1) { return [...sorted].sort((a, b) => { if (a.TYPE === "folder" && b.TYPE === "folder") { const oa = FOLDER_ORDER[a.NAME] ?? 999; const ob = FOLDER_ORDER[b.NAME] ?? 999; if (oa !== 999 || ob !== 999) return oa - ob; } if (a.TYPE === "folder" && b.TYPE !== "folder") return -1; if (a.TYPE !== "folder" && b.TYPE === "folder") return 1; return 0; }); } return sorted; }, [children, sortField, sortOrder, folderPath.length]);

  const handleFolderClick = (item: DiskItem) => { setCurrentFolderId(item.ID); setFolderPath((prev) => [...prev, { id: item.ID, name: item.NAME }]); };
  const handleBreadcrumbClick = (index: number) => { const target = folderPath[index]; if (index === 0 && target.isStorage) { setCurrentFolderId(null); } else { setCurrentFolderId(target.id); } setFolderPath((prev) => prev.slice(0, index + 1)); };
  const handleBack = () => { if (folderPath.length <= 1) return; const newPath = folderPath.slice(0, -1); const parent = newPath[newPath.length - 1]; setFolderPath(newPath); if (parent.isStorage) { setCurrentFolderId(null); } else { setCurrentFolderId(parent.id); } };
  const handleSort = (field: SortField) => { if (sortField === field) { setSortOrder((o) => (o === "asc" ? "desc" : "asc")); } else { setSortField(field); setSortOrder("asc"); } };
  const handleFileClick = (item: DiskItem) => { if (item.DETAIL_URL) { window.open(`https://elllement.bitrix24.ru${item.DETAIL_URL}`, "_blank"); } };
  const invalidateChildren = () => { queryClient.invalidateQueries({ queryKey: ["bitrix24-disk-children", currentFolderId ? null : selectedStorageId, currentFolderId] }); };
  const handleCreateFolder = async () => { if (!newFolderName.trim()) return; setIsCreating(true); try { if (currentFolderId) { await createFolder(currentFolderId, newFolderName.trim()); } else if (selectedStorageId) { await createStorageFolder(selectedStorageId, newFolderName.trim()); } toast({ title: "Папка создана" }); invalidateChildren(); setNewFolderOpen(false); setNewFolderName(""); } catch (e: any) { toast({ title: "Ошибка", description: e.message, variant: "destructive" }); } finally { setIsCreating(false); } };
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => { const files = e.target.files; if (!files || files.length === 0) return; try { for (const file of Array.from(files)) { if (currentFolderId) { await uploadFileToFolder(currentFolderId, file); } else if (selectedStorageId) { await uploadFileToStorage(selectedStorageId, file); } } toast({ title: `Загружено файлов: ${files.length}` }); invalidateChildren(); } catch (e: any) { toast({ title: "Ошибка загрузки", description: e.message, variant: "destructive" }); } if (fileInputRef.current) fileInputRef.current.value = ""; };
  const handleOpen = (item: DiskItem) => { if (item.TYPE === "folder") { handleFolderClick(item); } else { handleFileClick(item); } };
  const handleDelete = async (item: DiskItem) => { try { if (item.TYPE === "folder") { await deleteFolder(item.ID); } else { await deleteFile(item.ID); } toast({ title: "Перемещено в корзину" }); invalidateChildren(); } catch (e: any) { toast({ title: "Ошибка удаления", description: e.message, variant: "destructive" }); } };
  const handleDownload = async (item: DiskItem) => { if (item.TYPE === "folder") { toast({ title: "Скачивание папок пока не поддерживается" }); return; } try { const url = await getFileDownloadUrl(item.ID); window.open(url, "_blank"); } catch (e: any) { toast({ title: "Ошибка", description: e.message, variant: "destructive" }); } };
  const handleShare = (item: DiskItem) => { if (item.DETAIL_URL) { navigator.clipboard.writeText(`https://elllement.bitrix24.ru${item.DETAIL_URL}`); toast({ title: "Ссылка скопирована" }); } };
  const handleRenameStart = (item: DiskItem) => { setRenameItem(item); setRenameName(item.NAME); setRenameOpen(true); };
  const handleRename = async () => { if (!renameItem || !renameName.trim()) return; setIsRenaming(true); try { if (renameItem.TYPE === "folder") { await renameFolder(renameItem.ID, renameName.trim()); } else { await renameFile(renameItem.ID, renameName.trim()); } toast({ title: "Переименовано" }); invalidateChildren(); setRenameOpen(false); } catch (e: any) { toast({ title: "Ошибка", description: e.message, variant: "destructive" }); } finally { setIsRenaming(false); } };

  const loadMoveBrowseItems = async (folderId: string | null, storageId: string | null) => {
    setMoveBrowseLoading(true);
    try {
      const items = folderId ? await fetchFolderChildren(folderId) : storageId ? await fetchStorageChildren(storageId) : [];
      setMoveBrowseItems(items.filter((i) => i.TYPE === "folder"));
    } catch { setMoveBrowseItems([]); }
    finally { setMoveBrowseLoading(false); }
  };

  const handleMoveStart = (item: DiskItem) => {
    setMoveItem(item); setMoveOpen(true);
    if (selectedStorageId) {
      const rootPath: FolderPath = { id: selectedStorageId, name: "Общий диск компании", isStorage: true };
      setMoveFolderPath([rootPath]); loadMoveBrowseItems(null, selectedStorageId);
    }
  };

  const handleMoveBrowse = (folder: DiskItem) => {
    setMoveFolderPath((prev) => [...prev, { id: folder.ID, name: folder.NAME }]);
    loadMoveBrowseItems(folder.ID, null);
  };

  const handleMoveBreadcrumb = (index: number) => {
    const target = moveFolderPath[index];
    setMoveFolderPath((prev) => prev.slice(0, index + 1));
    if (target.isStorage) { loadMoveBrowseItems(null, target.id); }
    else { loadMoveBrowseItems(target.id, null); }
  };

  const handleMoveConfirm = async () => {
    if (!moveItem) return;
    const dest = moveFolderPath[moveFolderPath.length - 1];
    if (!dest || dest.isStorage) { toast({ title: "Выберите папку назначения" }); return; }
    setIsMoving(true);
    try {
      if (moveItem.TYPE === "folder") { await moveFolder(moveItem.ID, dest.id); }
      else { await moveFile(moveItem.ID, dest.id); }
      toast({ title: "Перемещено" }); invalidateChildren(); setMoveOpen(false);
    } catch (e: any) { toast({ title: "Ошибка перемещения", description: e.message, variant: "destructive" }); }
    finally { setIsMoving(false); }
  };

  const isLoading = storagesLoading || childrenLoading;
  const formatDate = (dateStr: string) => { try { return new Date(dateStr).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit", year: "numeric" }); } catch { return dateStr; } };

  const SortHeader = ({ label, field, className }: { label: string; field: SortField; className?: string }) => (
    <button onClick={() => handleSort(field)} className={`flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors ${className || ""}`}>
      {label}<ArrowUpDown size={12} className={sortField === field ? "text-foreground" : "opacity-40"} />
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {folderPath.length > 1 && <button onClick={handleBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors"><ArrowLeft size={16} className="text-muted-foreground" /></button>}
          <div className="w-2 h-2 rounded-full bg-[#007AFF]" />
          <Breadcrumb><BreadcrumbList>
            {folderPath.map((item, i) => (<BreadcrumbItem key={item.id}>{i > 0 && <BreadcrumbSeparator />}{i < folderPath.length - 1 ? <BreadcrumbLink href="#" onClick={(e) => { e.preventDefault(); handleBreadcrumbClick(i); }} className="text-xs">{item.name}</BreadcrumbLink> : <BreadcrumbPage className={folderPath.length === 1 ? "text-sm font-semibold text-foreground" : "text-xs font-medium"} style={{ color: folderPath.length > 1 ? "#007AFF" : undefined }}>{item.name}</BreadcrumbPage>}</BreadcrumbItem>))}
          </BreadcrumbList></Breadcrumb>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="gap-1 text-xs h-7 px-2.5 text-muted-foreground bg-foreground/[0.03] border-transparent hover:bg-foreground/[0.06]"><Plus size={14} />Добавить</Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end"><DropdownMenuItem onClick={() => setNewFolderOpen(true)}><FolderPlus size={14} className="mr-2" />Папку</DropdownMenuItem><DropdownMenuItem onClick={() => fileInputRef.current?.click()}><Upload size={14} className="mr-2" />Файлы</DropdownMenuItem></DropdownMenuContent>
          </DropdownMenu>
        </div>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFileUpload} />
      </div>
      <div className="border border-border rounded-2xl overflow-hidden bg-card">
        <div className="grid grid-cols-[1fr_120px_120px] gap-4 px-4 py-2.5 border-b border-border bg-muted/30">
          <span className="text-xs text-muted-foreground">Название</span>
          <SortHeader label="Размер" field="SIZE" /><SortHeader label="Изменён" field="UPDATE_TIME" />
        </div>
        {isLoading ? <div className="px-4 py-8"><div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-10 bg-muted/40 rounded-lg animate-pulse" />)}</div></div> :
          sortedItems.length === 0 ? <div className="px-4 py-12 text-center"><p className="text-sm text-muted-foreground">Папка пуста</p></div> :
            <div>{sortedItems.map((item) => (
              <div key={item.ID} className="grid grid-cols-[1fr_120px_120px] gap-4 px-4 py-2.5 w-full text-left hover:bg-muted/30 transition-colors border-b border-border last:border-b-0 group">
                <div className="flex items-center gap-3 min-w-0">
                  <button onClick={() => handleOpen(item)} className="flex items-center gap-3 min-w-0 text-left">
                    {item.TYPE === "folder" ? <Folder size={18} fill="hsl(211,100%,50%)" className="text-[hsl(211,100%,50%)] shrink-0" /> : getFileIcon(item.NAME)}
                    <span className="text-sm truncate">{item.NAME}</span>
                    {item.TYPE === "folder" && <ChevronRight size={14} className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />}
                  </button>
                  <DropdownMenu><DropdownMenuTrigger asChild><button className="p-1 rounded hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 shrink-0"><MoreVertical size={14} className="text-muted-foreground" /></button></DropdownMenuTrigger>
                    <DropdownMenuContent align="start" className="w-48">
                      <DropdownMenuItem onClick={() => handleOpen(item)}><FolderOpen size={14} className="mr-2" />Открыть</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDownload(item)}><Download size={14} className="mr-2" />Скачать</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleShare(item)}><Share2 size={14} className="mr-2" />Поделиться</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleRenameStart(item)}><Pencil size={14} className="mr-2" />Переименовать</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleMoveStart(item)}><Move size={14} className="mr-2" />Переместить</DropdownMenuItem>
                      <DropdownMenuItem className="text-destructive focus:!text-destructive" onClick={() => handleDelete(item)}><Trash2 size={14} className="mr-2" />Удалить</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <span className="text-xs text-muted-foreground self-center">{item.TYPE === "folder" ? "—" : formatFileSize(item.SIZE)}</span>
                <span className="text-xs text-muted-foreground self-center">{formatDate(item.UPDATE_TIME)}</span>
              </div>
            ))}</div>}
      </div>
      <Dialog open={newFolderOpen} onOpenChange={setNewFolderOpen}><DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>Новая папка</DialogTitle></DialogHeader><Input placeholder="Название папки" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()} /><DialogFooter><Button variant="outline" size="sm" onClick={() => setNewFolderOpen(false)}>Отмена</Button><Button size="sm" onClick={handleCreateFolder} disabled={isCreating || !newFolderName.trim()}>{isCreating ? "Создание..." : "Создать"}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}><DialogContent className="sm:max-w-sm"><DialogHeader><DialogTitle>Переименовать</DialogTitle></DialogHeader><Input placeholder="Новое название" value={renameName} onChange={(e) => setRenameName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleRename()} /><DialogFooter><Button variant="outline" size="sm" onClick={() => setRenameOpen(false)}>Отмена</Button><Button size="sm" onClick={handleRename} disabled={isRenaming || !renameName.trim()}>{isRenaming ? "Сохранение..." : "Сохранить"}</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={moveOpen} onOpenChange={setMoveOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Переместить «{moveItem?.NAME}»</DialogTitle></DialogHeader>
          <div className="space-y-2">
            <div className="flex items-center gap-1 text-xs text-muted-foreground flex-wrap">
              {moveFolderPath.map((p, i) => (
                <span key={p.id} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight size={10} />}
                  <button onClick={() => handleMoveBreadcrumb(i)} className={`hover:text-foreground transition-colors ${i === moveFolderPath.length - 1 ? "text-foreground font-medium" : ""}`}>{p.name}</button>
                </span>
              ))}
            </div>
            <div className="border border-border rounded-lg max-h-60 overflow-y-auto">
              {moveBrowseLoading ? (
                <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <div key={i} className="h-8 bg-muted/40 rounded animate-pulse" />)}</div>
              ) : moveBrowseItems.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">Нет папок</div>
              ) : (
                moveBrowseItems.filter((f) => f.ID !== moveItem?.ID).map((folder) => (
                  <button key={folder.ID} onClick={() => handleMoveBrowse(folder)} className="flex items-center gap-2 w-full px-3 py-2 text-left hover:bg-muted/40 transition-colors text-sm border-b border-border last:border-b-0">
                    <Folder size={16} fill="hsl(211,100%,50%)" className="text-[hsl(211,100%,50%)] shrink-0" />
                    <span className="truncate">{folder.NAME}</span>
                    <ChevronRight size={12} className="text-muted-foreground ml-auto shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setMoveOpen(false)}>Отмена</Button>
            <Button size="sm" onClick={handleMoveConfirm} disabled={isMoving || moveFolderPath.length <= 1 || moveFolderPath[moveFolderPath.length - 1]?.isStorage}>
              {isMoving ? "Перемещение..." : "Переместить сюда"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CompanyDisk;
