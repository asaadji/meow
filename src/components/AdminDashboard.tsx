import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  ArrowDownToLine,
  BookPlus,
  CalendarClock,
  CheckCircle2,
  Clock,
  Download,
  Edit3,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { Book, BookCategory, ReportPeriod } from '../types/library';
import {
  calculateLoanFine,
  calculateOverdueDays,
  formatCurrencyIDR,
  formatDateShort,
  formatRelativeTime,
  formatTimeClock,
  isLoanOverdue,
} from '../utils/formatters';
import { BookCover } from './BrandMark';

export type AdminTab = 'overview' | 'catalog' | 'circulation' | 'reports' | 'members';

const CATEGORIES: ('Semua' | BookCategory)[] = [
  'Semua',
  'Sastra & Fiksi',
  'Teknologi & Sistem',
  'Arsitektur & Desain',
  'Sains & Botani',
  'Sejarah & Budaya',
  'Bisnis & Ekonomi',
];

export function AdminDashboard({
  activeTab,
  searchQuery,
  onOpenNewBook,
  onEditBook,
  onPreviewBook,
  onOpenQuickBorrow,
  onOpenNewMember,
}: {
  activeTab: AdminTab;
  searchQuery: string;
  onOpenNewBook: () => void;
  onEditBook: (book: Book) => void;
  onPreviewBook: (book: Book) => void;
  onOpenQuickBorrow: () => void;
  onOpenNewMember: () => void;
}) {
  const {
    state,
    tickNow,
    liveConnected,
    returnBook,
    extendLoan,
    deleteBook,
    toggleMemberStatus,
    generateAutoReport,
    updateReportConfig,
    exportLoansCsv,
    exportBooksCsv,
    notify,
  } = useLibrary();

  const [categoryFilter, setCategoryFilter] = useState<'Semua' | BookCategory>('Semua');
  const [loanFilter, setLoanFilter] = useState<
    'all' | 'active' | 'return_requested' | 'overdue' | 'returned' | 'reservations'
  >('all');
  const [reportPeriod, setReportPeriod] = useState<ReportPeriod>('weekly');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const [freqInput, setFreqInput] = useState(state.reportConfig.frequency);
  const [fineInput, setFineInput] = useState(String(state.reportConfig.finePerDay));
  const [loanDaysInput, setLoanDaysInput] = useState(String(state.reportConfig.defaultLoanDays));
  const [emailInput, setEmailInput] = useState(state.reportConfig.recipientEmail);

  const metrics = useMemo(() => {
    const totalTitles = state.books.length;
    const totalCopies = state.books.reduce((sum, b) => sum + b.totalCopies, 0);
    const availableCopies = state.books.reduce((sum, b) => sum + b.availableCopies, 0);
    const activeLoans = state.loans.filter((l) => l.status !== 'returned');
    const overdueLoans = activeLoans.filter((l) => isLoanOverdue(l));
    const returnRequests = activeLoans.filter((l) => l.status === 'return_requested');
    const pendingFines = overdueLoans.reduce(
      (sum, l) => sum + calculateLoanFine(l, state.reportConfig.finePerDay),
      0
    );
    const collectedFines = state.loans.reduce((sum, l) => sum + l.finePaid, 0);
    const waitingReservations = state.reservations.filter(
      (r) => r.status === 'waiting' || r.status === 'ready'
    );

    return {
      totalTitles,
      totalCopies,
      availableCopies,
      activeLoansCount: activeLoans.length,
      overdueCount: overdueLoans.length,
      returnRequestCount: returnRequests.length,
      pendingFines,
      collectedFines,
      waitingCount: waitingReservations.length,
    };
  }, [state.books, state.loans, state.reservations, state.reportConfig.finePerDay, tickNow]);

  const weeklyChartData = useMemo(() => {
    const days: { label: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 3600 * 1000);
      const dayKey = d.toISOString().slice(0, 10);
      const label = new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(d);
      const count = state.loans.filter((l) => l.borrowedAt.slice(0, 10) === dayKey).length;
      days.push({ label, count });
    }
    return days;
  }, [state.loans]);

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.books.filter((b) => {
      const matchCat = categoryFilter === 'Semua' || b.category === categoryFilter;
      const matchQuery =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.isbn.toLowerCase().includes(q) ||
        b.shelfCode.toLowerCase().includes(q);
      return matchCat && matchQuery;
    });
  }, [state.books, categoryFilter, searchQuery]);

  const filteredLoans = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.loans.filter((l) => {
      const overdue = isLoanOverdue(l);
      const matchTab =
        loanFilter === 'all' ||
        (loanFilter === 'active' && (l.status === 'active' || l.status === 'overdue') && !overdue) ||
        (loanFilter === 'return_requested' && l.status === 'return_requested') ||
        (loanFilter === 'overdue' && overdue) ||
        (loanFilter === 'returned' && l.status === 'returned');
      const matchQuery =
        !q ||
        l.bookTitle.toLowerCase().includes(q) ||
        l.memberName.toLowerCase().includes(q) ||
        l.loanCode.toLowerCase().includes(q) ||
        l.memberCode.toLowerCase().includes(q);
      return matchTab && matchQuery;
    });
  }, [state.loans, loanFilter, searchQuery, tickNow]);

  const reportLoans = useMemo(() => {
    const cutoffDays =
      reportPeriod === 'daily' ? 1 : reportPeriod === 'weekly' ? 7 : reportPeriod === 'monthly' ? 30 : 3650;
    const cutoffMs = Date.now() - cutoffDays * 24 * 3600 * 1000;
    return state.loans.filter((l) => new Date(l.borrowedAt).getTime() >= cutoffMs);
  }, [state.loans, reportPeriod]);

  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>();
    state.books.forEach((b) => {
      map.set(b.category, (map.get(b.category) ?? 0) + b.borrowCount);
    });
    const entries = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
    const maxVal = Math.max(1, ...entries.map((e) => e[1]));
    return entries.map(([name, total]) => ({ name, total, pct: Math.round((total / maxVal) * 100) }));
  }, [state.books]);

  const handleAction = (res: { ok: boolean; message: string }) => {
    if (!res.ok) notify(res.message, 'warning');
  };

  if (activeTab === 'overview') {
    const actionableLoans = state.loans
      .filter((l) => l.status !== 'returned')
      .sort((a, b) => {
        if (a.status === 'return_requested' && b.status !== 'return_requested') return -1;
        if (b.status === 'return_requested' && a.status !== 'return_requested') return 1;
        return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
      })
      .slice(0, 6);

    const maxChartVal = Math.max(2, ...weeklyChartData.map((d) => d.count));

    return (
      <div className="space-y-4">
        {/* Compact 4-column KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-lg p-3.5">
            <p className="text-xs text-slate-500">Total Koleksi</p>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-semibold font-mono tabular-nums text-slate-900">
                {metrics.totalTitles}
              </span>
              <span className="text-xs font-mono text-slate-500">
                {metrics.availableCopies}/{metrics.totalCopies} eks. tersedia
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3.5">
            <p className="text-xs text-slate-500">Sirkulasi Aktif</p>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-semibold font-mono tabular-nums text-slate-900">
                {metrics.activeLoansCount}
              </span>
              <span className="text-xs font-mono text-blue-700">
                {metrics.returnRequestCount} ajuan kembali
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3.5">
            <p className="text-xs text-slate-500">Terlambat & Denda</p>
            <div className="mt-1 flex items-baseline justify-between">
              <span
                className={`text-2xl font-semibold font-mono tabular-nums ${
                  metrics.overdueCount > 0 ? 'text-red-700' : 'text-slate-900'
                }`}
              >
                {metrics.overdueCount}
              </span>
              <span className="text-xs font-mono text-slate-600">
                {formatCurrencyIDR(metrics.pendingFines)}
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3.5">
            <p className="text-xs text-slate-500">Antrean & Anggota</p>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-semibold font-mono tabular-nums text-slate-900">
                {metrics.waitingCount}
              </span>
              <span className="text-xs font-mono text-slate-500">
                {state.members.filter((m) => m.status === 'active').length} member aktif
              </span>
            </div>
          </div>
        </div>

        {/* 2-Column Workspace Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Left: Actionable Loans + 7-day SVG Chart */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Antrean Sirkulasi Prioritas</h2>
                  <p className="text-xs text-slate-500">
                    Ajuan pengembalian member & pinjaman mendekati jatuh tempo
                  </p>
                </div>
                <button
                  onClick={onOpenQuickBorrow}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md whitespace-nowrap"
                >
                  + Pinjam Cepat
                </button>
              </div>

              {actionableLoans.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-500">
                  Belum ada transaksi aktif saat ini.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {actionableLoans.map((loan) => {
                    const overdue = isLoanOverdue(loan);
                    const fine = calculateLoanFine(loan, state.reportConfig.finePerDay);
                    return (
                      <div
                        key={loan.id}
                        className="px-4 py-2.5 flex items-center justify-between gap-3 hover:bg-slate-50/80"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-mono font-medium text-slate-900">{loan.loanCode}</span>
                            <span className="text-slate-300">·</span>
                            <span className="text-slate-700 font-medium truncate">{loan.memberName}</span>
                            <span className="text-slate-300">·</span>
                            {loan.status === 'return_requested' ? (
                              <span className="text-blue-700 font-medium">Ajuan Pengembalian</span>
                            ) : overdue ? (
                              <span className="text-red-700 font-medium">
                                Terlambat {calculateOverdueDays(loan.dueAt)}h ({formatCurrencyIDR(fine)})
                              </span>
                            ) : (
                              <span className="text-slate-500">Tempo {formatDateShort(loan.dueAt)}</span>
                            )}
                          </div>
                          <p className="text-sm text-slate-900 truncate mt-0.5">{loan.bookTitle}</p>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {!overdue && loan.extendedCount < 1 && loan.status !== 'return_requested' && (
                            <button
                              onClick={() => handleAction(extendLoan(loan.id))}
                              className="px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-200 rounded hover:bg-slate-50 whitespace-nowrap"
                            >
                              +7 Hari
                            </button>
                          )}
                          <button
                            onClick={() => handleAction(returnBook(loan.id))}
                            className="px-2.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded whitespace-nowrap"
                          >
                            Terima Kembali
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Compact 7-Day Circulation Chart */}
            <div className="bg-white border border-slate-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Aktivitas Pinjam 7 Hari Terakhir</h3>
                  <p className="text-xs text-slate-500">Distribusi transaksi harian secara langsung</p>
                </div>
                <span className="text-xs font-mono text-slate-500">
                  Total: {weeklyChartData.reduce((s, d) => s + d.count, 0)} trx
                </span>
              </div>
              <div className="grid grid-cols-7 gap-2 items-end h-24 pt-2">
                {weeklyChartData.map((day) => {
                  const heightPct = Math.max(8, Math.round((day.count / maxChartVal) * 100));
                  return (
                    <div key={day.label} className="flex flex-col items-center gap-1.5 h-full justify-end">
                      <span className="text-[11px] font-mono tabular-nums text-slate-600">{day.count}</span>
                      <div className="w-full max-w-[32px] bg-slate-100 rounded-sm h-14 flex items-end overflow-hidden">
                        <div
                          className="w-full bg-blue-700 rounded-sm transition-all"
                          style={{ height: `${heightPct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-slate-500">{day.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Real-Time Activity Stream */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {liveConnected && (
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"
                    title="Channel sinkronisasi tab real-time aktif"
                  />
                )}
                <h2 className="text-sm font-semibold text-slate-900">Aktivitas Transaksi Real-Time</h2>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                Sync {formatTimeClock(state.lastSyncedAt)}
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[420px] overflow-y-auto">
              {state.activities.slice(0, 14).map((act) => (
                <div key={act.id} className="px-4 py-2.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                      <span className="font-mono font-medium text-slate-700">{act.refCode}</span>
                      <span>·</span>
                      <span>{act.actorName}</span>
                      <span>·</span>
                      <span>{formatRelativeTime(act.timestamp)}</span>
                    </div>
                    <p className="text-xs text-slate-800 mt-0.5 leading-snug">{act.summary}</p>
                  </div>
                  <span className="font-mono text-[11px] text-slate-400 shrink-0 tabular-nums">
                    {formatTimeClock(act.timestamp)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'catalog') {
    return (
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto max-w-full">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  categoryFilter === cat
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenNewBook}
            className="px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md flex items-center gap-1.5 whitespace-nowrap"
          >
            <BookPlus className="w-3.5 h-3.5" />
            Tambah Buku
          </button>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500">
                  <th className="py-2.5 px-4">Koleksi & ISBN</th>
                  <th className="py-2.5 px-3">Kategori</th>
                  <th className="py-2.5 px-3">Rak</th>
                  <th className="py-2.5 px-3 text-right">Stok</th>
                  <th className="py-2.5 px-3 text-right">Dipinjam</th>
                  <th className="py-2.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {filteredBooks.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-xs text-slate-500">
                      Tidak ada buku yang cocok dengan pencarian Anda.
                    </td>
                  </tr>
                ) : (
                  filteredBooks.map((book) => (
                    <tr key={book.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4">
                        <div className="flex items-center gap-3">
                          <BookCover book={book} size="sm" />
                          <div className="min-w-0">
                            <button
                              onClick={() => onPreviewBook(book)}
                              className="font-medium text-slate-900 hover:text-blue-700 text-left line-clamp-1"
                            >
                              {book.title}
                            </button>
                            <p className="text-xs text-slate-500 truncate">
                              {book.author} · <span className="font-mono">{book.isbn}</span>
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-600 whitespace-nowrap">
                        {book.category}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-xs text-slate-700 whitespace-nowrap">
                        {book.shelfCode}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                        <span
                          className={
                            book.availableCopies > 0
                              ? 'text-emerald-700 font-semibold'
                              : 'text-red-700 font-semibold'
                          }
                        >
                          {book.availableCopies}
                        </span>
                        <span className="text-slate-400"> / {book.totalCopies}</span>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-xs tabular-nums text-slate-700">
                        {book.borrowCount}x
                      </td>
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => onEditBook(book)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 rounded hover:bg-slate-100"
                            title="Edit buku"
                            aria-label={`Edit ${book.title}`}
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          {confirmDeleteId === book.id ? (
                            <div className="inline-flex items-center gap-1 ml-1">
                              <button
                                onClick={() => {
                                  handleAction(deleteBook(book.id));
                                  setConfirmDeleteId(null);
                                }}
                                className="px-2 py-1 text-[11px] font-medium text-white bg-red-600 rounded"
                              >
                                Hapus
                              </button>
                              <button
                                onClick={() => setConfirmDeleteId(null)}
                                className="px-2 py-1 text-[11px] text-slate-600 hover:text-slate-900"
                              >
                                Batal
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setConfirmDeleteId(book.id)}
                              className="p-1.5 text-slate-500 hover:text-red-700 rounded hover:bg-slate-100"
                              title="Hapus buku"
                              aria-label={`Hapus ${book.title}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'circulation') {
    const activeReservations = state.reservations.filter(
      (r) => r.status === 'waiting' || r.status === 'ready'
    );

    return (
      <div className="space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg overflow-x-auto max-w-full">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'active', label: 'Dipinjam' },
              { id: 'return_requested', label: `Ajuan Kembali (${metrics.returnRequestCount})` },
              { id: 'overdue', label: `Terlambat (${metrics.overdueCount})` },
              { id: 'returned', label: 'Selesai' },
              { id: 'reservations', label: `Antrean (${activeReservations.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setLoanFilter(tab.id as typeof loanFilter)}
                className={`px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  loanFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenQuickBorrow}
            className="px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md whitespace-nowrap"
          >
            + Catat Peminjaman
          </button>
        </div>

        {loanFilter === 'reservations' ? (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500">
                  <th className="py-2.5 px-4">Anggota</th>
                  <th className="py-2.5 px-3">Buku Dipesan</th>
                  <th className="py-2.5 px-3">Waktu Antre</th>
                  <th className="py-2.5 px-4 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {activeReservations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-xs text-slate-500">
                      Tidak ada antrean reservasi buku saat ini.
                    </td>
                  </tr>
                ) : (
                  activeReservations.map((res) => (
                    <tr key={res.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-4">
                        <p className="font-medium text-slate-900">{res.memberName}</p>
                        <p className="text-xs font-mono text-slate-500">{res.memberCode}</p>
                      </td>
                      <td className="py-2.5 px-3 text-slate-800">{res.bookTitle}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-500 font-mono">
                        {formatDateShort(res.requestedAt)} · {formatTimeClock(res.requestedAt)}
                      </td>
                      <td className="py-2.5 px-4 text-right text-xs font-medium">
                        {res.status === 'ready' ? (
                          <span className="text-emerald-700">Siap Diambil</span>
                        ) : (
                          <span className="text-amber-700">Menunggu Stok</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500">
                    <th className="py-2.5 px-4">Kode & Peminjam</th>
                    <th className="py-2.5 px-3">Judul Buku</th>
                    <th className="py-2.5 px-3">Pinjam / Tempo</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-right">Denda</th>
                    <th className="py-2.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {filteredLoans.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-xs text-slate-500">
                        Belum ada data transaksi pada filter ini.
                      </td>
                    </tr>
                  ) : (
                    filteredLoans.map((loan) => {
                      const overdue = isLoanOverdue(loan);
                      const fine = calculateLoanFine(loan, state.reportConfig.finePerDay);
                      return (
                        <tr key={loan.id} className="hover:bg-slate-50/70">
                          <td className="py-2.5 px-4">
                            <p className="font-mono text-xs font-semibold text-slate-900">
                              {loan.loanCode}
                            </p>
                            <p className="text-xs text-slate-600">
                              {loan.memberName} · <span className="font-mono">{loan.memberCode}</span>
                            </p>
                          </td>
                          <td className="py-2.5 px-3">
                            <p className="text-slate-900 font-medium line-clamp-1">{loan.bookTitle}</p>
                            <p className="text-xs font-mono text-slate-500">{loan.bookIsbn}</p>
                          </td>
                          <td className="py-2.5 px-3 text-xs font-mono text-slate-600 whitespace-nowrap">
                            <div>{formatDateShort(loan.borrowedAt)}</div>
                            <div className={overdue ? 'text-red-700 font-semibold' : 'text-slate-400'}>
                              s/d {formatDateShort(loan.dueAt)}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-xs whitespace-nowrap">
                            {loan.status === 'returned' ? (
                              <span className="text-emerald-700 font-medium inline-flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> Dikembalikan
                              </span>
                            ) : loan.status === 'return_requested' ? (
                              <span className="text-blue-700 font-medium inline-flex items-center gap-1">
                                <ArrowDownToLine className="w-3.5 h-3.5" /> Ajuan Kembali
                              </span>
                            ) : overdue ? (
                              <span className="text-red-700 font-medium inline-flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> Terlambat{' '}
                                {calculateOverdueDays(loan.dueAt)}h
                              </span>
                            ) : (
                              <span className="text-slate-700 inline-flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5 text-amber-600" /> Dipinjam
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-xs tabular-nums whitespace-nowrap">
                            {fine > 0 ? (
                              <span className={loan.status === 'returned' ? 'text-slate-600' : 'text-red-700 font-semibold'}>
                                {formatCurrencyIDR(fine)}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-2.5 px-4 text-right whitespace-nowrap">
                            {loan.status !== 'returned' ? (
                              <div className="inline-flex items-center gap-1.5">
                                {!overdue && loan.extendedCount < 1 && (
                                  <button
                                    onClick={() => handleAction(extendLoan(loan.id))}
                                    className="px-2.5 py-1 text-xs text-slate-700 border border-slate-200 rounded hover:bg-slate-50"
                                  >
                                    +7 Hari
                                  </button>
                                )}
                                <button
                                  onClick={() => handleAction(returnBook(loan.id))}
                                  className="px-2.5 py-1 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded"
                                >
                                  Selesaikan
                                </button>
                              </div>
                            ) : (
                              <span className="text-xs font-mono text-slate-400">
                                {loan.returnedAt ? formatDateShort(loan.returnedAt) : '-'}
                              </span>
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
        )}
      </div>
    );
  }

  if (activeTab === 'reports') {
    const returnedInPeriod = reportLoans.filter((l) => l.status === 'returned').length;
    const overdueInPeriod = reportLoans.filter((l) => isLoanOverdue(l)).length;
    const periodFines = reportLoans.reduce(
      (sum, l) => sum + calculateLoanFine(l, state.reportConfig.finePerDay),
      0
    );
    const complianceRate =
      reportLoans.length > 0
        ? Math.round(((reportLoans.length - overdueInPeriod) / reportLoans.length) * 100)
        : 100;
    const topBooks = [...state.books].sort((a, b) => b.borrowCount - a.borrowCount).slice(0, 5);

    return (
      <div className="space-y-4 print-only-full">
        {/* Controls Bar */}
        <div className="no-print flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            {[
              { id: 'daily', label: 'Harian' },
              { id: 'weekly', label: 'Mingguan' },
              { id: 'monthly', label: 'Bulanan' },
              { id: 'all', label: 'Semua Periode' },
            ].map((p) => (
              <button
                key={p.id}
                onClick={() => setReportPeriod(p.id as ReportPeriod)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  reportPeriod === p.id
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => generateAutoReport(reportPeriod)}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md flex items-center gap-1.5 whitespace-nowrap"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Sinkronkan Laporan
            </button>
            <button
              onClick={() => exportLoansCsv(reportLoans)}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md flex items-center gap-1.5 whitespace-nowrap"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              CSV Transaksi
            </button>
            <button
              onClick={exportBooksCsv}
              className="px-3 py-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              CSV Koleksi
            </button>
            <button
              onClick={() => window.print()}
              className="px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md flex items-center gap-1.5 whitespace-nowrap"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak / PDF
            </button>
          </div>
        </div>

        {/* Automated Executive Report Sheet */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <p className="text-xs font-mono text-slate-500">
                MeowLibrary · Sistem Pelaporan Otomatis
              </p>
              <h2 className="text-lg font-semibold text-slate-900 mt-0.5">
                Rekapitulasi Sirkulasi & Kesehatan Koleksi
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Diperbarui otomatis pada {formatDateShort(state.reportConfig.lastGeneratedAt)} pukul{' '}
                {formatTimeClock(state.reportConfig.lastGeneratedAt)}
              </p>
            </div>
            <div className="text-right font-mono text-xs text-slate-600">
              <div>Jadwal Otomatis: {state.reportConfig.frequency.toUpperCase()}</div>
              <div>Tarif Denda: {formatCurrencyIDR(state.reportConfig.finePerDay)}/hari</div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pb-4 border-b border-slate-100">
            <div>
              <span className="text-xs text-slate-500 block">Transaksi Periode</span>
              <span className="text-xl font-semibold font-mono tabular-nums text-slate-900">
                {reportLoans.length}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Sudah Dikembalikan</span>
              <span className="text-xl font-semibold font-mono tabular-nums text-emerald-700">
                {returnedInPeriod}
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Kepatuhan Tempo</span>
              <span className="text-xl font-semibold font-mono tabular-nums text-slate-900">
                {complianceRate}%
              </span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block">Total Denda Periode</span>
              <span className="text-xl font-semibold font-mono tabular-nums text-slate-900">
                {formatCurrencyIDR(periodFines)}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Category Breakdown */}
            <div>
              <h3 className="text-xs font-semibold text-slate-900 mb-3">
                Popularitas Berdasarkan Kategori (Kumulatif)
              </h3>
              <div className="space-y-2.5">
                {categoryBreakdown.map((cat) => (
                  <div key={cat.name} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-700">{cat.name}</span>
                      <span className="font-mono text-slate-600 tabular-nums">{cat.total} pinjam</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-700 rounded-full"
                        style={{ width: `${cat.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top 5 Books */}
            <div>
              <h3 className="text-xs font-semibold text-slate-900 mb-3">
                5 Koleksi Paling Sering Dipinjam
              </h3>
              <div className="divide-y divide-slate-100 border border-slate-200 rounded-md">
                {topBooks.map((b, idx) => (
                  <div key={b.id} className="px-3 py-2 flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="font-mono text-slate-400 w-4">0{idx + 1}.</span>
                      <span className="text-slate-900 font-medium truncate">{b.title}</span>
                    </div>
                    <span className="font-mono text-slate-700 shrink-0 tabular-nums">
                      {b.borrowCount}x · {b.availableCopies}/{b.totalCopies} eks.
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Scheduler Config */}
          <div className="no-print pt-4 border-t border-slate-200">
            <h3 className="text-xs font-semibold text-slate-900 mb-2.5 flex items-center gap-1.5">
              <CalendarClock className="w-3.5 h-3.5 text-blue-700" />
              Pengaturan Otomasi & Kebijakan Sirkulasi
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Frekuensi Laporan</label>
                <select
                  value={freqInput}
                  onChange={(e) => setFreqInput(e.target.value as 'daily' | 'weekly' | 'monthly')}
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded bg-white"
                >
                  <option value="daily">Harian (18:00 WIB)</option>
                  <option value="weekly">Mingguan (Senin)</option>
                  <option value="monthly">Bulanan (Tgl 1)</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Denda / Hari (IDR)</label>
                <input
                  type="number"
                  value={fineInput}
                  onChange={(e) => setFineInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-500 mb-1">Durasi Standar (Hari)</label>
                <input
                  type="number"
                  value={loanDaysInput}
                  onChange={(e) => setLoanDaysInput(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-xs font-mono border border-slate-200 rounded"
                />
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="email"
                  value={emailInput}
                  onChange={(e) => setEmailInput(e.target.value)}
                  aria-label="Email penerima laporan otomatis"
                  className="w-full px-2.5 py-1.5 text-xs border border-slate-200 rounded"
                />
                <button
                  onClick={() =>
                    updateReportConfig({
                      frequency: freqInput,
                      finePerDay: Math.max(500, parseInt(fineInput, 10) || 2000),
                      defaultLoanDays: Math.max(1, parseInt(loanDaysInput, 10) || 7),
                      recipientEmail: emailInput.trim() || 'admin@meowlibrary.id',
                    })
                  }
                  className="px-3 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded whitespace-nowrap"
                >
                  Simpan
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Members tab
  const filteredMembers = state.members.filter((m) => {
    const q = searchQuery.trim().toLowerCase();
    return (
      !q ||
      m.name.toLowerCase().includes(q) ||
      m.memberCode.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-slate-500">
          Menampilkan {filteredMembers.length} anggota terdaftar di MeowLibrary
        </p>
        <button
          onClick={onOpenNewMember}
          className="px-3.5 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md flex items-center gap-1.5 whitespace-nowrap"
        >
          <UserPlus className="w-3.5 h-3.5" />
          Tambah Anggota
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500">
                <th className="py-2.5 px-4">ID & Nama Anggota</th>
                <th className="py-2.5 px-3">Kontak</th>
                <th className="py-2.5 px-3 text-right">Kuota Pinjam</th>
                <th className="py-2.5 px-3 text-right">Denda Berjalan</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filteredMembers.map((mem) => {
                const memLoans = state.loans.filter(
                  (l) => l.memberId === mem.id && l.status !== 'returned'
                );
                const memFine = memLoans.reduce(
                  (sum, l) => sum + calculateLoanFine(l, state.reportConfig.finePerDay),
                  0
                );
                return (
                  <tr key={mem.id} className="hover:bg-slate-50/70">
                    <td className="py-2.5 px-4">
                      <p className="font-medium text-slate-900">{mem.name}</p>
                      <p className="text-xs font-mono text-slate-500">{mem.memberCode}</p>
                    </td>
                    <td className="py-2.5 px-3 text-xs text-slate-600">
                      <div>{mem.email}</div>
                      <div className="font-mono text-slate-400">{mem.phone}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs tabular-nums">
                      {memLoans.length} / {mem.maxQuota} buku
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono text-xs tabular-nums">
                      {memFine > 0 ? (
                        <span className="text-red-700 font-semibold">{formatCurrencyIDR(memFine)}</span>
                      ) : (
                        <span className="text-slate-400">Rp 0</span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-xs">
                      {mem.status === 'active' ? (
                        <span className="text-emerald-700 font-medium">Aktif</span>
                      ) : (
                        <span className="text-red-700 font-medium">Ditangguhkan</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right">
                      <button
                        onClick={() => handleAction(toggleMemberStatus(mem.id))}
                        className="px-2.5 py-1 text-xs text-slate-700 border border-slate-200 rounded hover:bg-slate-50 whitespace-nowrap"
                      >
                        {mem.status === 'active' ? 'Tangguhkan' : 'Aktifkan'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
