import React, { useState } from 'react';
import {
  ArrowLeftRight,
  BookOpen,
  CreditCard,
  FileBarChart2,
  Home,
  LayoutDashboard,
  Library,
  Menu,
  Plus,
  RotateCcw,
  Search,
  Users,
  X,
} from 'lucide-react';
import { AdminDashboard, AdminTab } from './components/AdminDashboard';
import { BrandMark } from './components/BrandMark';
import { MemberDashboard, MemberTab } from './components/MemberDashboard';
import {
  BookDetailModal,
  BookFormModal,
  MemberFormModal,
  QuickBorrowModal,
} from './components/Modals';
import { LibraryProvider, useLibrary } from './context/LibraryContext';
import { Book } from './types/library';

const ADMIN_NAV: { id: AdminTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Ringkasan & Live', icon: LayoutDashboard },
  { id: 'catalog', label: 'Koleksi Buku', icon: Library },
  { id: 'circulation', label: 'Sirkulasi & Pinjam', icon: ArrowLeftRight },
  { id: 'reports', label: 'Laporan Otomatis', icon: FileBarChart2 },
  { id: 'members', label: 'Data Anggota', icon: Users },
];

const MEMBER_NAV: { id: MemberTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'home', label: 'Beranda Saya', icon: Home },
  { id: 'explore', label: 'Jelajah Katalog', icon: BookOpen },
  { id: 'loans', label: 'Pinjaman & Riwayat', icon: ArrowLeftRight },
  { id: 'card', label: 'Kartu & Disimpan', icon: CreditCard },
];

function LibraryWorkspace() {
  const {
    state,
    activeRole,
    setActiveRole,
    activeMemberId,
    setActiveMemberId,
    activeMember,
    toasts,
    dismissToast,
    resetDemoData,
  } = useLibrary();

  const [adminTab, setAdminTab] = useState<AdminTab>('overview');
  const [memberTab, setMemberTab] = useState<MemberTab>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState<Book | null>(null);
  const [previewBook, setPreviewBook] = useState<Book | null>(null);
  const [quickBorrowOpen, setQuickBorrowOpen] = useState(false);
  const [memberModalOpen, setMemberModalOpen] = useState(false);

  const activeNavLabel =
    activeRole === 'admin'
      ? ADMIN_NAV.find((n) => n.id === adminTab)?.label ?? 'Ringkasan'
      : MEMBER_NAV.find((n) => n.id === memberTab)?.label ?? 'Beranda';

  const handleRoleSwitch = (role: 'admin' | 'member') => {
    setActiveRole(role);
    setSearchQuery('');
    setMobileMenuOpen(false);
  };

  const sidebarContent = (
    <div className="flex flex-col h-full bg-white border-r border-slate-200 w-60">
      {/* Brand Lockup */}
      <div className="h-14 px-4 border-b border-slate-200 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2.5">
          <BrandMark className="w-6 h-6 shrink-0" />
          <span className="font-display font-bold text-base tracking-tight text-slate-900 whitespace-nowrap">
            MeowLibrary
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1 text-slate-400 hover:text-slate-700"
          aria-label="Tutup menu"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Role Workspace Switcher */}
      <div className="p-3 border-b border-slate-100 space-y-2.5">
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 rounded-md">
          <button
            onClick={() => handleRoleSwitch('admin')}
            className={`py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeRole === 'admin'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Admin
          </button>
          <button
            onClick={() => handleRoleSwitch('member')}
            className={`py-1.5 text-xs font-medium rounded transition-colors whitespace-nowrap ${
              activeRole === 'member'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Member
          </button>
        </div>

        {activeRole === 'member' ? (
          <div>
            <label htmlFor="active-member-select" className="block text-[11px] text-slate-500 mb-1">
              Akun Member Aktif
            </label>
            <select
              id="active-member-select"
              value={activeMemberId}
              onChange={(e) => setActiveMemberId(e.target.value)}
              className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white text-slate-800 focus:outline-none focus:border-blue-600"
            >
              {state.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.memberCode})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="px-1">
            <p className="text-xs font-medium text-slate-800">Nadia Kusuma</p>
            <p className="text-[11px] text-slate-500">Kepala Perpustakaan</p>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto" aria-label="Navigasi utama">
        {activeRole === 'admin'
          ? ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = adminTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setAdminTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })
          : MEMBER_NAV.map((item) => {
              const Icon = item.icon;
              const isActive = memberTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setMemberTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
      </nav>

      {/* Sidebar Footer */}
      <div className="p-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
        <span>{activeRole === 'member' ? activeMember.memberCode : 'MeowLibrary'}</span>
        <button
          onClick={resetDemoData}
          className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-900"
          title="Kembalikan data awal"
        >
          <RotateCcw className="w-3 h-3" />
          Reset Data
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block shrink-0 no-print">{sidebarContent}</aside>

      {/* Mobile Sidebar Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 h-full">{sidebarContent}</div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on Left, Search + 1 Primary Action on Right */}
        <header className="no-print h-14 bg-white border-b border-slate-200 px-4 lg:px-6 flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 text-slate-600 hover:text-slate-900 border border-slate-200 rounded-md"
              aria-label="Buka navigasi"
            >
              <Menu className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
              <span className="font-medium text-slate-800">
                {activeRole === 'admin' ? 'Dashboard Admin' : 'Portal Member'}
              </span>
              <span>/</span>
              <span className="text-slate-900 font-semibold truncate">{activeNavLabel}</span>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="relative hidden sm:block w-56 md:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari judul, penulis, kode..."
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-md bg-slate-50 focus:bg-white focus:outline-none focus:border-blue-600"
              />
            </div>

            {activeRole === 'admin' ? (
              <button
                onClick={() => {
                  setEditingBook(null);
                  setBookModalOpen(true);
                }}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Tambah Buku
              </button>
            ) : (
              <button
                onClick={() => setQuickBorrowOpen(true)}
                className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                Pinjam Buku
              </button>
            )}
          </div>
        </header>

        {/* Mobile Search Strip */}
        <div className="no-print sm:hidden px-4 pt-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari judul, penulis, ISBN, kode..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-600"
            />
          </div>
        </div>

        {/* Viewport Workspace */}
        <main className="flex-1 p-4 lg:p-6 max-w-[1360px] w-full mx-auto">
          {activeRole === 'admin' ? (
            <AdminDashboard
              activeTab={adminTab}
              searchQuery={searchQuery}
              onOpenNewBook={() => {
                setEditingBook(null);
                setBookModalOpen(true);
              }}
              onEditBook={(book) => {
                setEditingBook(book);
                setBookModalOpen(true);
              }}
              onPreviewBook={(book) => setPreviewBook(book)}
              onOpenQuickBorrow={() => setQuickBorrowOpen(true)}
              onOpenNewMember={() => setMemberModalOpen(true)}
            />
          ) : (
            <MemberDashboard
              activeTab={memberTab}
              searchQuery={searchQuery}
              onPreviewBook={(book) => setPreviewBook(book)}
              onNavigateTab={(tab) => setMemberTab(tab)}
            />
          )}
        </main>
      </div>

      {/* Modals */}
      <BookFormModal
        open={bookModalOpen}
        editingBook={editingBook}
        onClose={() => {
          setBookModalOpen(false);
          setEditingBook(null);
        }}
      />

      <BookDetailModal book={previewBook} onClose={() => setPreviewBook(null)} />

      <QuickBorrowModal open={quickBorrowOpen} onClose={() => setQuickBorrowOpen(false)} />

      <MemberFormModal open={memberModalOpen} onClose={() => setMemberModalOpen(false)} />

      {/* Toast Notifications */}
      {toasts.length > 0 && (
        <div className="no-print fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`px-3.5 py-2.5 rounded-md border text-xs font-medium flex items-center justify-between gap-3 bg-white shadow-sm ${
                t.tone === 'warning'
                  ? 'border-amber-300 text-amber-900'
                  : t.tone === 'info'
                  ? 'border-blue-300 text-blue-900'
                  : 'border-emerald-300 text-emerald-900'
              }`}
            >
              <span>{t.text}</span>
              <button
                onClick={() => dismissToast(t.id)}
                className="text-slate-400 hover:text-slate-700"
                aria-label="Tutup notifikasi"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <LibraryProvider>
      <LibraryWorkspace />
    </LibraryProvider>
  );
}
