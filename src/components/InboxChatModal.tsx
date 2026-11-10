import React, { useState, useMemo, useRef, useEffect } from 'react';
import { AppUser, Bakery, InboxChatMessage, UserRoleType } from '../types';
import {
  X,
  Inbox,
  Send,
  MessageSquare,
  AlertTriangle,
  Megaphone,
  Building2,
  Trash2,
  Search,
  User,
  Clock,
  Users,
  CheckCircle2,
} from 'lucide-react';

interface InboxChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  users: AppUser[];
  bakeries: Bakery[];
  messages: InboxChatMessage[];
  onSendMessage: (msg: Omit<InboxChatMessage, 'id' | 'timestamp' | 'readBy'>) => void;
  onDeleteMessage: (msgId: string) => void;
  onMarkAllRead: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'مدير النظام',
  supervisor: 'مشرف عام',
  auditor: 'مراجع حسابات',
  inspector: 'مفتش تموين',
  data_entry: 'مدخل بيانات',
  viewer: 'مستخدم (عرض)',
};

export const InboxChatModal: React.FC<InboxChatModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  users,
  bakeries,
  messages,
  onSendMessage,
  onDeleteMessage,
  onMarkAllRead,
}) => {
  const [content, setContent] = useState('');
  const [messageType, setMessageType] = useState<'instruction' | 'general' | 'alert'>('general');
  // Active user selected for direct written chat ('ALL' = group chat, or username of target user)
  const [activeChatUser, setActiveChatUser] = useState<string>('ALL');
  const [relatedBakeryId, setRelatedBakeryId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'instruction' | 'general' | 'alert'>('all');

  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Instant ESC key support in capture phase
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Esc') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen) {
      onMarkAllRead();
      setTimeout(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'auto' });
      }, 50);
    }
  }, [isOpen, messages.length]);

  const selectedUserObj = useMemo(() => {
    if (activeChatUser === 'ALL' || activeChatUser.startsWith('ROLE:')) return null;
    return users.find((u) => u.username === activeChatUser || u.id === activeChatUser) || null;
  }, [activeChatUser, users]);

  const filteredMessages = useMemo(() => {
    const myUsername = currentUser?.username || 'admin';
    return messages.filter((msg) => {
      if (categoryFilter !== 'all' && msg.messageType !== categoryFilter) {
        return false;
      }
      if (activeChatUser !== 'ALL') {
        if (activeChatUser.startsWith('ROLE:')) {
          if (msg.recipientTarget !== activeChatUser && msg.recipientTarget !== 'ALL') {
            return false;
          }
        } else {
          // Show messages directed to this user, sent by this user, or between current user and selected user
          const involvesSelectedUser =
            msg.recipientTarget === activeChatUser ||
            msg.senderId === activeChatUser ||
            (msg.senderId === myUsername && msg.recipientTarget === activeChatUser) ||
            msg.recipientTarget === 'ALL';
          if (!involvesSelectedUser) return false;
        }
      }
      if (searchTerm.trim() !== '') {
        const q = searchTerm.toLowerCase();
        const matchesText =
          msg.content.toLowerCase().includes(q) ||
          msg.senderName.toLowerCase().includes(q) ||
          (msg.recipientLabel && msg.recipientLabel.toLowerCase().includes(q)) ||
          (msg.relatedBakeryName && msg.relatedBakeryName.toLowerCase().includes(q));
        if (!matchesText) return false;
      }
      return true;
    });
  }, [messages, categoryFilter, activeChatUser, searchTerm, currentUser]);

  if (!isOpen) return null;

  const handleSelectChatPartner = (targetUsername: string) => {
    setActiveChatUser(targetUsername);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 30);
  };

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!content.trim()) return;

    const senderId = currentUser?.username || currentUser?.id || 'admin';
    const senderName = currentUser?.fullName || 'مستخدم المنظومة';
    const senderRole: UserRoleType = currentUser?.role || 'viewer';

    let recipientLabel = 'جميع المستخدمين والأطراف بالمنظومة';
    if (activeChatUser.startsWith('ROLE:')) {
      const r = activeChatUser.replace('ROLE:', '');
      recipientLabel = `دور: ${ROLE_LABELS[r] || r}`;
    } else if (activeChatUser !== 'ALL') {
      const targetUser = users.find((u) => u.username === activeChatUser || u.id === activeChatUser);
      recipientLabel = targetUser ? `${targetUser.fullName} (@${targetUser.username})` : activeChatUser;
    }

    const selectedBakery = bakeries.find((b) => String(b.id) === String(relatedBakeryId));

    onSendMessage({
      senderId,
      senderName,
      senderRole,
      recipientTarget: activeChatUser,
      recipientLabel,
      messageType,
      content: content.trim(),
      relatedBakeryId: selectedBakery ? String(selectedBakery.id) : undefined,
      relatedBakeryName: selectedBakery ? `${selectedBakery.bakeryOwnerName} (${selectedBakery.village})` : undefined,
    });

    setContent('');
    setRelatedBakeryId('');
  };

  return (
    <div
      className="fixed inset-0 bg-slate-950/85 z-[9999] flex items-center justify-center p-2 sm:p-4"
      dir="rtl"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[94vh] flex flex-col overflow-hidden border-2 border-indigo-400"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-l from-indigo-950 via-blue-900 to-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-400/20 border border-amber-400/50 flex items-center justify-center">
              <Inbox className="w-6 h-6 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  صندوق الوارد والشات الكتابي المباشر بين مستخدمي المنظومة
                </h2>
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-400/40 text-xs font-extrabold px-2.5 py-0.5 rounded-full">
                  متصل الآن ({messages.length} رسالة)
                </span>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5 font-bold">
                اختر أي مستخدم من القائمة بالأسفل للتحدث معه شات كتابة مباشرة أو أرسل تعليمات عامة لجميع المستخدمين
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
            <span>إغلاق (ESC)</span>
          </button>
        </div>

        {/* PROMINENT USER SELECTOR BAR FOR DIRECT WRITTEN CHAT (اختيار المستخدم المراد التحدث معه شات كتابة) */}
        <div className="bg-indigo-50/90 border-b-2 border-indigo-200 px-4 py-3 shrink-0 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs font-black text-indigo-950">
              <Users className="w-4 h-4 text-indigo-700" />
              <span>اختر المستخدم المراد التحدث معه شات كتابة (اضغط على اسم المستخدم لبدء المحادثة الكتابية):</span>
            </div>
            {selectedUserObj ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-600 text-white text-xs font-black shadow-xs">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  محادثة كتابية نشطة مع: {selectedUserObj.fullName} (@{selectedUserObj.username})
                </span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-700 text-white text-xs font-black shadow-xs">
                <span>👥 محادثة جماعية مع جميع مستخدمي المنظومة</span>
              </span>
            )}
          </div>

          {/* Interactive Clickable User Cards */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => handleSelectChatPartner('ALL')}
              className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2 shrink-0 border-2 transition cursor-pointer ${
                activeChatUser === 'ALL'
                  ? 'bg-indigo-700 text-white border-amber-400 shadow-md'
                  : 'bg-white text-slate-800 border-slate-300 hover:border-indigo-400'
              }`}
            >
              <Users className="w-4 h-4 text-amber-300" />
              <div className="text-right">
                <div>جميع المستخدمين (عام)</div>
                <div className="text-[10px] opacity-80">رسالة جماعية للكل</div>
              </div>
            </button>

            {users.map((u) => {
              const isSelected = activeChatUser === u.username;
              const isMe = currentUser?.username === u.username;
              return (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleSelectChatPartner(u.username)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-black flex items-center gap-2.5 shrink-0 border-2 transition cursor-pointer ${
                    isSelected
                      ? 'bg-gradient-to-l from-emerald-600 to-teal-700 text-white border-amber-400 shadow-md'
                      : 'bg-white text-slate-800 border-slate-300 hover:border-emerald-500 hover:bg-emerald-50/40'
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                      isSelected ? 'bg-white text-emerald-900' : 'bg-slate-900 text-amber-300'
                    }`}
                  >
                    {u.fullName.charAt(0)}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-1">
                      <span>{u.fullName}</span>
                      {isMe && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-400 text-slate-950 font-black">
                          أنت
                        </span>
                      )}
                    </div>
                    <div
                      className={`text-[10px] font-bold ${
                        isSelected ? 'text-emerald-100' : 'text-slate-500'
                      }`}
                    >
                      @{u.username} • {ROLE_LABELS[u.role] || u.role}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters & Search Bar */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 py-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setCategoryFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition cursor-pointer ${
                categoryFilter === 'all'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              كل الرسائل ({filteredMessages.length})
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('general')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition flex items-center gap-1 cursor-pointer ${
                categoryFilter === 'general'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-white text-emerald-800 border border-emerald-300 hover:bg-emerald-50'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>شات كتابة ومحادثات</span>
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('instruction')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition flex items-center gap-1 cursor-pointer ${
                categoryFilter === 'instruction'
                  ? 'bg-amber-600 text-white'
                  : 'bg-white text-amber-800 border border-amber-300 hover:bg-amber-50'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>تعليمات إدارية</span>
            </button>
            <button
              type="button"
              onClick={() => setCategoryFilter('alert')}
              className={`px-3 py-1 rounded-lg text-xs font-black transition flex items-center gap-1 cursor-pointer ${
                categoryFilter === 'alert'
                  ? 'bg-rose-600 text-white'
                  : 'bg-white text-rose-800 border border-rose-300 hover:bg-rose-50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>تنبيهات متابعة</span>
            </button>
          </div>

          <div className="relative min-w-[240px] flex-1 sm:flex-initial">
            <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="ابحث في رسائل الشات أو اسم المستخدم..."
              className="w-full pr-9 pl-3 py-1.5 text-xs bg-white border border-slate-300 rounded-xl font-bold text-slate-800"
            />
          </div>
        </div>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50">
          {filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-14 h-14 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2">
                <MessageSquare className="w-7 h-7" />
              </div>
              <p className="text-sm font-black text-slate-800">
                {selectedUserObj
                  ? `ابدأ المحادثة الكتابية الآن مع ${selectedUserObj.fullName} (@${selectedUserObj.username})`
                  : 'لا توجد رسائل مطابقة حالياً'}
              </p>
              <p className="text-xs text-slate-500 mt-1 font-bold">
                اكتب رسالتك في المربع بالأسفل واضغط إرسال أو مفتاح Enter
              </p>
            </div>
          ) : (
            filteredMessages.map((msg) => {
              const isMine =
                currentUser?.username === msg.senderId || currentUser?.id === msg.senderId;
              const isInstruction = msg.messageType === 'instruction';
              const isAlert = msg.messageType === 'alert';

              return (
                <div
                  key={msg.id}
                  className={`rounded-2xl p-3.5 border-2 shadow-2xs ${
                    isInstruction
                      ? 'bg-amber-50 border-amber-300'
                      : isAlert
                      ? 'bg-rose-50 border-rose-300'
                      : isMine
                      ? 'bg-emerald-50/90 border-emerald-300'
                      : 'bg-white border-slate-200'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5 pb-1.5 border-b border-black/5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs text-white ${
                          isInstruction
                            ? 'bg-amber-600'
                            : isAlert
                            ? 'bg-rose-600'
                            : isMine
                            ? 'bg-emerald-600'
                            : 'bg-slate-700'
                        }`}
                      >
                        <User className="w-4 h-4" />
                      </span>
                      <span className="font-black text-xs sm:text-sm text-slate-900">
                        من: {msg.senderName}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-200 text-slate-700">
                        {ROLE_LABELS[msg.senderRole] || msg.senderRole}
                      </span>
                      <span className="text-[11px] font-black px-2.5 py-0.5 rounded bg-indigo-600 text-white">
                        إلى: {msg.recipientLabel || 'جميع المستخدمين'}
                      </span>
                      <span
                        className={`text-[10px] font-black px-2 py-0.5 rounded ${
                          isInstruction
                            ? 'bg-amber-200 text-amber-900'
                            : isAlert
                            ? 'bg-rose-200 text-rose-900'
                            : 'bg-emerald-200 text-emerald-950'
                        }`}
                      >
                        {isInstruction
                          ? '📌 تعليمات إدارية'
                          : isAlert
                          ? '⚠️ تنبيه متابعة'
                          : '💬 شات كتابة'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className="text-[11px] font-bold text-slate-500 flex items-center gap-1"
                        dir="ltr"
                      >
                        <Clock className="w-3 h-3" />
                        {msg.timestamp}
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteMessage(msg.id)}
                        className="p-1 text-rose-600 hover:bg-rose-100 rounded-lg transition-colors cursor-pointer"
                        title="حذف الرسالة"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs sm:text-sm font-black text-slate-900 leading-relaxed whitespace-pre-wrap">
                    {msg.content}
                  </p>

                  {msg.relatedBakeryName && (
                    <div className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white border border-indigo-200 text-[11px] font-black text-indigo-900">
                      <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                      <span>مخبز مرتبط: {msg.relatedBakeryName}</span>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Written Chat Compose Box */}
        <form
          onSubmit={handleSend}
          className="bg-white border-t-2 border-indigo-200 p-3.5 space-y-2.5 shrink-0"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="block text-[11px] font-black text-indigo-950 mb-1">
                👤 اختيار المستخدم المراد التحدث معه شات كتابة:
              </label>
              <select
                value={activeChatUser}
                onChange={(e) => handleSelectChatPartner(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-black bg-indigo-50 border-2 border-indigo-400 rounded-xl text-slate-900 outline-none"
              >
                <option value="ALL">👥 جميع المستخدمين (رسالة جماعية للكل)</option>
                <optgroup label="👤 اختر مستخدم محدد للشات الكتابي المباشر">
                  {users.map((u) => (
                    <option key={u.id} value={u.username}>
                      👤 التحدث مع: {u.fullName} (اليوزر: {u.username}) - {ROLE_LABELS[u.role] || u.role}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="توجيه حسب الدور الوظيفي">
                  <option value="ROLE:admin">المديرون فقط</option>
                  <option value="ROLE:auditor">المراجعون فقط</option>
                  <option value="ROLE:inspector">المفتشون فقط</option>
                </optgroup>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 mb-1">
                نوع الرسالة:
              </label>
              <select
                value={messageType}
                onChange={(e) => setMessageType(e.target.value as 'instruction' | 'general' | 'alert')}
                className="w-full px-3 py-1.5 text-xs font-black bg-slate-50 border border-slate-300 rounded-xl text-slate-900 outline-none"
              >
                <option value="general">💬 شات كتابة ومحادثة مباشرة</option>
                <option value="instruction">📌 تعليمات إدارية وتوجيهات رسمية</option>
                <option value="alert">⚠️ تنبيه متابعة مخبز / مديونية / ترخيص</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-black text-slate-700 mb-1">
                إرفاق اسم مخبز بالرسالة (اختياري):
              </label>
              <select
                value={relatedBakeryId}
                onChange={(e) => setRelatedBakeryId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl text-slate-800 outline-none"
              >
                <option value="">-- بدون تحديد مخبز --</option>
                {bakeries.map((b) => (
                  <option key={b.id} value={String(b.id)}>
                    {b.bakeryOwnerName} ({b.village})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-end gap-2">
            <textarea
              ref={inputRef}
              rows={2}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                selectedUserObj
                  ? `اكتب رسالة شات كتابة مباشرة إلى ${selectedUserObj.fullName} (@${selectedUserObj.username}) ثم اضغط Enter للإرسال...`
                  : 'اكتب رسالة الشات أو التعليمات الإدارية لجميع المستخدمين ثم اضغط Enter للإرسال...'
              }
              className="flex-1 p-2.5 text-xs sm:text-sm font-black bg-slate-50 border-2 border-indigo-300 rounded-xl text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:bg-white outline-none resize-none"
            />
            <button
              type="submit"
              disabled={!content.trim()}
              className="px-5 py-3 rounded-xl bg-gradient-to-l from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-50 text-white font-black text-xs sm:text-sm shadow-md flex items-center gap-2 transition cursor-pointer shrink-0"
            >
              <Send className="w-4 h-4" />
              <span>
                {selectedUserObj ? `إرسال إلى ${selectedUserObj.fullName.split(' ')[0]}` : 'إرسال الشات'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
