import React, { useState, useMemo, useEffect } from 'react';
import { Bakery, DailyBakeryTask, TaskPriority, TaskStatus, AppUser } from '../types';
import { filterAndSortDailyTasks } from '../utils/auditHelper';
import {
  X,
  Plus,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Calendar,
  Edit2,
  Trash2,
  Search,
  Store,
  Save,
  ListTodo,
  Flag,
  Check
} from 'lucide-react';

interface DailyTasksModalProps {
  isOpen: boolean;
  onClose: () => void;
  tasks: DailyBakeryTask[];
  bakeries: Bakery[];
  currentUser: AppUser | null;
  onSaveTasks: (updatedTasks: DailyBakeryTask[], toastMsg?: string) => void;
}

export const DailyTasksModal: React.FC<DailyTasksModalProps> = ({
  isOpen,
  onClose,
  tasks,
  bakeries,
  currentUser,
  onSaveTasks,
}) => {
  const isReadOnly = currentUser?.role === 'viewer';

  // New task form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [selectedBakeryId, setSelectedBakeryId] = useState<string>('ALL');
  const [priority, setPriority] = useState<TaskPriority>('high');
  const [dueDate, setDueDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    return d.toISOString().split('T')[0];
  });
  const [assignedTo, setAssignedTo] = useState<string>(currentUser?.fullName || 'مفتش الرقابة التموينية');
  const [formError, setFormError] = useState<string>('');

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState<'ALL' | TaskPriority>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | TaskStatus>('ALL');

  // Inline editing state
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editBakeryId, setEditBakeryId] = useState('ALL');
  const [editPriority, setEditPriority] = useState<TaskPriority>('medium');
  const [editDueDate, setEditDueDate] = useState('');
  const [editStatus, setEditStatus] = useState<TaskStatus>('pending');
  const [editAssignedTo, setEditAssignedTo] = useState('');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const filteredTasks = useMemo(() => {
    return filterAndSortDailyTasks(tasks, {
      priorityFilter,
      statusFilter,
      searchQuery,
    });
  }, [tasks, priorityFilter, statusFilter, searchQuery]);

  const stats = useMemo(() => {
    const total = tasks.length;
    const high = tasks.filter((t) => t.priority === 'high' && t.status !== 'completed').length;
    const completed = tasks.filter((t) => t.status === 'completed').length;
    const pending = tasks.filter((t) => t.status !== 'completed').length;
    return { total, high, completed, pending };
  }, [tasks]);

  if (!isOpen) return null;

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const cleanTitle = title.trim();
    if (!cleanTitle) {
      setFormError('يرجى إدخال عنوان المهمة الإدارية الفرعية');
      return;
    }
    if (!dueDate) {
      setFormError('يرجى تحديد تاريخ استحقاق المهمة');
      return;
    }

    const matchedBakery = bakeries.find((b) => b.id === selectedBakeryId);

    const newTask: DailyBakeryTask = {
      id: `task-${Date.now()}`,
      title: cleanTitle,
      description: description.trim(),
      bakeryId: matchedBakery ? matchedBakery.id : undefined,
      bakeryName: matchedBakery ? matchedBakery.bakeryOwnerName : 'عام لجميع المخابز',
      village: matchedBakery ? matchedBakery.village : 'جميع القرى',
      priority,
      dueDate,
      status: 'pending',
      assignedTo: assignedTo.trim() || currentUser?.fullName || 'مفتش التموين',
      createdAt: new Date().toISOString().split('T')[0],
    };

    onSaveTasks([newTask, ...tasks], `تمت إضافة المهمة اليومية (${cleanTitle}) بنجاح`);
    setTitle('');
    setDescription('');
    setFormError('');
  };

  const handleToggleStatus = (task: DailyBakeryTask) => {
    if (isReadOnly) return;
    const nextStatus: TaskStatus =
      task.status === 'completed' ? 'pending' : task.status === 'pending' ? 'in_progress' : 'completed';
    const updated = tasks.map((t) => (t.id === task.id ? { ...t, status: nextStatus } : t));
    const statusLabel =
      nextStatus === 'completed' ? 'مكتملة ✅' : nextStatus === 'in_progress' ? 'جاري التنفيذ ⏳' : 'قيد الانتظار';
    onSaveTasks(updated, `تم تحديث حالة المهمة (${task.title}) إلى: ${statusLabel}`);
  };

  const handleStartEdit = (task: DailyBakeryTask) => {
    setEditingTaskId(task.id);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditBakeryId(task.bakeryId || 'ALL');
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate);
    setEditStatus(task.status);
    setEditAssignedTo(task.assignedTo || '');
  };

  const handleSaveEdit = (taskId: string) => {
    if (isReadOnly) return;
    const cleanTitle = editTitle.trim();
    if (!cleanTitle) return;
    const matchedBakery = bakeries.find((b) => b.id === editBakeryId);
    const updated = tasks.map((t) =>
      t.id === taskId
        ? {
            ...t,
            title: cleanTitle,
            description: editDescription.trim(),
            bakeryId: matchedBakery ? matchedBakery.id : undefined,
            bakeryName: matchedBakery ? matchedBakery.bakeryOwnerName : 'عام لجميع المخابز',
            village: matchedBakery ? matchedBakery.village : 'جميع القرى',
            priority: editPriority,
            dueDate: editDueDate,
            status: editStatus,
            assignedTo: editAssignedTo.trim(),
          }
        : t
    );
    onSaveTasks(updated, `تم حفظ تعديلات المهمة (${cleanTitle}) بنجاح`);
    setEditingTaskId(null);
  };

  const handleDeleteTask = (task: DailyBakeryTask) => {
    if (isReadOnly) return;
    const updated = tasks.filter((t) => t.id !== task.id);
    onSaveTasks(updated, `تم حذف المهمة (${task.title}) من سجل المهام اليومية`);
  };

  const getPriorityBadge = (p: TaskPriority) => {
    if (p === 'high') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-red-100 text-red-900 border border-red-300">
          <span>🔴</span>
          <span>أولوية عالية</span>
        </span>
      );
    }
    if (p === 'medium') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-100 text-amber-900 border border-amber-300">
          <span>🟡</span>
          <span>أولوية متوسطة</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
        <span>🟢</span>
        <span>أولوية منخفضة</span>
      </span>
    );
  };

  const getStatusBadge = (s: TaskStatus) => {
    if (s === 'completed') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-emerald-600 text-white">
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>مكتملة</span>
        </span>
      );
    }
    if (s === 'in_progress') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-blue-600 text-white">
          <Clock className="w-3.5 h-3.5" />
          <span>جاري التنفيذ</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-slate-200 text-slate-800 border border-slate-300">
        <Clock className="w-3.5 h-3.5 text-slate-600" />
        <span>قيد الانتظار</span>
      </span>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/75 overflow-y-auto cursor-pointer"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl border-2 border-amber-500/50 w-full max-w-5xl my-4 overflow-hidden flex flex-col max-h-[92vh] cursor-default">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-950 p-4 text-white flex items-center justify-between border-b border-amber-500/40 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500/20 border border-amber-400/50 rounded-xl text-amber-300">
              <ListTodo className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-white flex items-center gap-2">
                <span>إدارة المهام اليومية والمتابعة الإدارية للمخابز</span>
                <span className="text-[11px] bg-amber-400 text-slate-950 px-2.5 py-0.5 rounded-full font-black">
                  {stats.pending} مهام نشطة
                </span>
              </h3>
              <p className="text-xs text-slate-300 font-bold mt-0.5">
                إضافة وتتبع المهام الإدارية الفرعية المتعلقة بالمخابز مع تحديد الأولويات (عالية، متوسطة، منخفضة) وتاريخ الاستحقاق
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="إغلاق نافذة إدارة المهام اليومية"
            className="p-1.5 rounded-xl bg-red-900/60 hover:bg-red-600 text-white border border-red-500/50 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 bg-slate-50">
          {/* Summary KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block">إجمالي المهام المسجلة</span>
                <span className="text-xl font-black text-slate-900 font-mono">{stats.total}</span>
              </div>
              <ListTodo className="w-7 h-7 text-indigo-600" />
            </div>

            <div className="bg-red-50 p-3 rounded-xl border border-red-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-red-800 block">مهام عاجلة (أولوية عالية)</span>
                <span className="text-xl font-black text-red-700 font-mono">{stats.high}</span>
              </div>
              <AlertTriangle className="w-7 h-7 text-red-600" />
            </div>

            <div className="bg-amber-50 p-3 rounded-xl border border-amber-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-amber-800 block">مهام قيد التنفيذ والمتابعة</span>
                <span className="text-xl font-black text-amber-800 font-mono">{stats.pending}</span>
              </div>
              <Clock className="w-7 h-7 text-amber-600" />
            </div>

            <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-200 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-emerald-800 block">مهام منجزة ومكتملة</span>
                <span className="text-xl font-black text-emerald-700 font-mono">{stats.completed}</span>
              </div>
              <CheckCircle2 className="w-7 h-7 text-emerald-600" />
            </div>
          </div>

          {/* Add New Task Form */}
          {!isReadOnly && (
            <form
              onSubmit={handleAddTask}
              className="bg-white border-2 border-indigo-200 rounded-2xl p-4 shadow-sm space-y-3"
            >
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <h4 className="text-xs font-black text-indigo-950 flex items-center gap-1.5">
                  <Plus className="w-4 h-4 text-indigo-600 stroke-[3]" />
                  <span>إضافة مهمة إدارية فرعية جديدة للمخابز</span>
                </h4>
                <span className="text-[11px] text-slate-500 font-bold">
                  يتم الحفظ الفوري في قاعدة البيانات
                </span>
              </div>

              {formError && (
                <div className="p-2.5 bg-red-50 border border-red-300 rounded-xl text-xs font-black text-red-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    عنوان المهمة الإدارية الفرعية *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (formError) setFormError('');
                    }}
                    placeholder="مثال: مراجعة رخصة المخبز، تحصيل قسط المديونية، فحص وزن الرغيف..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    أولوية المهمة (عالية / متوسطة / منخفضة) *
                  </label>
                  <select
                    aria-label="أولوية المهمة"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                    className="w-full px-3 py-2 bg-amber-50 border border-amber-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="high">🔴 أولوية عالية (عاجل)</option>
                    <option value="medium">🟡 أولوية متوسطة</option>
                    <option value="low">🟢 أولوية منخفضة</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    تاريخ الاستحقاق *
                  </label>
                  <input
                    type="date"
                    aria-label="تاريخ الاستحقاق"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 num-enlarged"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    المخبز التمويني المرتبط بالمهمة
                  </label>
                  <select
                    aria-label="المخبز التمويني المرتبط بالمهمة"
                    value={selectedBakeryId}
                    onChange={(e) => setSelectedBakeryId(e.target.value)}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="ALL">-- مهمة إدارية عامة لجميع المخابز --</option>
                    {bakeries.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.bakeryOwnerName} - قرية {b.village} (ماكينة: {b.machineNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    المسؤول عن المتابعة والتنفيذ
                  </label>
                  <input
                    type="text"
                    value={assignedTo}
                    onChange={(e) => setAssignedTo(e.target.value)}
                    placeholder="اسم المفتش أو المراجع"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-700 mb-1">
                    تفاصيل أو ملاحظات إضافية
                  </label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="إجراءات المتابعة المطلوبة..."
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-1">
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 px-5 py-2 bg-gradient-to-r from-indigo-600 to-purple-700 hover:from-indigo-500 hover:to-purple-600 text-white rounded-xl text-xs font-black shadow-md cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>إضافة المهمة وحفظها في الجدول</span>
                </button>
              </div>
            </form>
          )}

          {/* Filter & Search Bar */}
          <div className="bg-slate-900 text-white p-3.5 rounded-2xl flex flex-wrap items-center justify-between gap-3">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="w-4 h-4 text-amber-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث في المهام اليومية أو اسم المخبز أو القرية..."
                className="w-full pr-9 pl-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-bold text-white placeholder-slate-400 focus:border-amber-400"
              />
            </div>

            <div className="flex items-center flex-wrap gap-2">
              <div className="flex items-center gap-1.5">
                <Flag className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-xs font-black text-slate-300">الأولوية:</span>
                <select
                  aria-label="تصفية حسب الأولوية"
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value as 'ALL' | TaskPriority)}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-black text-amber-300 cursor-pointer"
                >
                  <option value="ALL">الكل ({tasks.length})</option>
                  <option value="high">عالية 🔴</option>
                  <option value="medium">متوسطة 🟡</option>
                  <option value="low">منخفضة 🟢</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <span className="text-xs font-black text-slate-300">الحالة:</span>
                <select
                  aria-label="تصفية حسب الحالة"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as 'ALL' | TaskStatus)}
                  className="px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs font-black text-emerald-300 cursor-pointer"
                >
                  <option value="ALL">جميع الحالات</option>
                  <option value="pending">قيد الانتظار</option>
                  <option value="in_progress">جاري التنفيذ</option>
                  <option value="completed">مكتملة</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tasks List Table */}
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-900 text-amber-300 font-black border-b border-slate-800">
                    <th className="py-3 px-3 w-12 text-center">م</th>
                    <th className="py-3 px-3">المهمة الإدارية الفرعية</th>
                    <th className="py-3 px-3">المخبز التمويني / القرية</th>
                    <th className="py-3 px-3 text-center">الأولوية</th>
                    <th className="py-3 px-3 text-center">تاريخ الاستحقاق</th>
                    <th className="py-3 px-3 text-center">الحالة</th>
                    <th className="py-3 px-3 text-center">المسؤول</th>
                    <th className="py-3 px-3 text-center">التعديل والحذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 font-bold">
                  {filteredTasks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500 font-black">
                        لا توجد مهام مطابقة للبحث الحالي. يمكنك إضافة مهمة جديدة من النموذج أعلاه.
                      </td>
                    </tr>
                  ) : (
                    filteredTasks.map((task, idx) => {
                      const isEditing = editingTaskId === task.id;
                      return (
                        <tr
                          key={task.id}
                          className={`hover:bg-slate-50 transition ${
                            task.status === 'completed' ? 'bg-emerald-50/40 opacity-85' : ''
                          }`}
                        >
                          <td className="py-3 px-3 text-center font-mono text-slate-500">{idx + 1}</td>

                          {/* Task Title & Description */}
                          <td className="py-3 px-3">
                            {isEditing ? (
                              <div className="space-y-1.5">
                                <input
                                  type="text"
                                  value={editTitle}
                                  onChange={(e) => setEditTitle(e.target.value)}
                                  className="w-full px-2.5 py-1 bg-white border border-indigo-400 rounded-lg text-xs font-black text-slate-900"
                                />
                                <input
                                  type="text"
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                  placeholder="التفاصيل..."
                                  className="w-full px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700"
                                />
                              </div>
                            ) : (
                              <div>
                                <p
                                  className={`font-black text-slate-900 ${
                                    task.status === 'completed' ? 'line-through text-slate-500' : ''
                                  }`}
                                >
                                  {task.title}
                                </p>
                                {task.description && (
                                  <p className="text-[11px] text-slate-500 mt-0.5">{task.description}</p>
                                )}
                              </div>
                            )}
                          </td>

                          {/* Linked Bakery */}
                          <td className="py-3 px-3">
                            {isEditing ? (
                              <select
                                value={editBakeryId}
                                onChange={(e) => setEditBakeryId(e.target.value)}
                                className="w-full px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900"
                              >
                                <option value="ALL">عام لجميع المخابز</option>
                                {bakeries.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {b.bakeryOwnerName} ({b.village})
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div className="flex items-center gap-1.5 text-slate-800">
                                <Store className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <div>
                                  <span className="font-black block">{task.bakeryName || 'عام لجميع المخابز'}</span>
                                  {task.village && (
                                    <span className="text-[10px] text-slate-500">{task.village}</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </td>

                          {/* Priority */}
                          <td className="py-3 px-3 text-center">
                            {isEditing ? (
                              <select
                                value={editPriority}
                                onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900"
                              >
                                <option value="high">عالية 🔴</option>
                                <option value="medium">متوسطة 🟡</option>
                                <option value="low">منخفضة 🟢</option>
                              </select>
                            ) : (
                              getPriorityBadge(task.priority)
                            )}
                          </td>

                          {/* Due Date */}
                          <td className="py-3 px-3 text-center font-mono">
                            {isEditing ? (
                              <input
                                type="date"
                                value={editDueDate}
                                onChange={(e) => setEditDueDate(e.target.value)}
                                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900"
                              />
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-800 font-black">
                                <Calendar className="w-3 h-3 text-indigo-600" />
                                <span>{task.dueDate}</span>
                              </span>
                            )}
                          </td>

                          {/* Status */}
                          <td className="py-3 px-3 text-center">
                            {isEditing ? (
                              <select
                                value={editStatus}
                                onChange={(e) => setEditStatus(e.target.value as TaskStatus)}
                                className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-black text-slate-900"
                              >
                                <option value="pending">قيد الانتظار</option>
                                <option value="in_progress">جاري التنفيذ</option>
                                <option value="completed">مكتملة</option>
                              </select>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(task)}
                                className="cursor-pointer"
                                title="اضغط لتغيير حالة المهمة"
                              >
                                {getStatusBadge(task.status)}
                              </button>
                            )}
                          </td>

                          {/* Assigned To */}
                          <td className="py-3 px-3 text-center">
                            {isEditing ? (
                              <input
                                type="text"
                                value={editAssignedTo}
                                onChange={(e) => setEditAssignedTo(e.target.value)}
                                className="w-28 px-2 py-1 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-900"
                              />
                            ) : (
                              <span className="text-[11px] text-slate-700 font-black">
                                {task.assignedTo || '-'}
                              </span>
                            )}
                          </td>

                          {/* Actions at the END of the table */}
                          <td className="py-3 px-3 text-center">
                            {isReadOnly ? (
                              <span className="text-[10px] text-slate-400">عرض فقط</span>
                            ) : isEditing ? (
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleSaveEdit(task.id)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-black flex items-center gap-1 cursor-pointer"
                                >
                                  <Save className="w-3 h-3" />
                                  <span>حفظ</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingTaskId(null)}
                                  className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-lg text-[11px] font-black cursor-pointer"
                                >
                                  إلغاء
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleToggleStatus(task)}
                                  aria-label={`تغيير حالة المهمة ${task.title}`}
                                  className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg cursor-pointer"
                                  title="تبديل حالة الإنجاز"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleStartEdit(task)}
                                  aria-label={`تعديل المهمة ${task.title}`}
                                  className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg cursor-pointer"
                                  title="تعديل المهمة"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTask(task)}
                                  aria-label={`حذف المهمة ${task.title}`}
                                  className="p-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg cursor-pointer"
                                  title="حذف المهمة"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-slate-100 border-t border-slate-200 flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-slate-600">
            يتم ترتيب المهام تلقائياً حسب الأولوية (عالية ← متوسطة ← منخفضة) وتاريخ الاستحقاق
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black cursor-pointer"
          >
            إغلاق النافذة (ESC)
          </button>
        </div>
      </div>
    </div>
  );
};
