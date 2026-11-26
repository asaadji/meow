import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Bookmark,
  Check,
  Clock,
  Copy,
  CreditCard,
  RotateCcw,
} from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { Book, BookCategory } from '../types/library';
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

export type MemberTab = 'home' | 'explore' | 'loans' | 'card';

const CATEGORIES: ('Semua' | BookCategory)[] = [
  'Semua',
  'Sastra & Fiksi',
  'Teknologi & Sistem',
  'Arsitektur & Desain',
  'Sains & Botani',
  'Sejarah & Budaya',
  'Bisnis & Ekonomi',
];

export function MemberDashboard({
  activeTab,
  searchQuery,
  onPreviewBook,
  onNavigateTab,
}: {
  activeTab: MemberTab;
  searchQuery: string;
  onPreviewBook: (book: Book) => void;
  onNavigateTab: (tab: MemberTab) => void;
}) {
  const {
    state,
    activeMember,
    liveConnected,
    tickNow,
    borrowBook,
    requestReturn,
    extendLoan,
    reserveBook,
    cancelReservation,
    toggleBookmark,
    notify,
  } = useLibrary();

  const [categoryFilter, setCategoryFilter] = useState<'Semua' | BookCategory>('Semua');
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available'>('all');
  const [copiedCard, setCopiedCard] = useState(false);

  const memberLoans = useMemo(
    () => state.loans.filter((l) => l.memberId === activeMember.id),
    [state.loans, activeMember.id]
  );

  const activeLoans = useMemo(
    () => memberLoans.filter((l) => l.status !== 'returned'),
    [memberLoans]
  );

  const memberReservations = useMemo(
    () =>
      state.reservations.filter(
        (r) => r.memberId === activeMember.id && (r.status === 'waiting' || r.status === 'ready')
      ),
    [state.reservations, activeMember.id]
  );

  const totalPendingFine = useMemo(
    () =>
      activeLoans.reduce(
        (sum, l) => sum + calculateLoanFine(l, state.reportConfig.finePerDay),
        0
      ),
    [activeLoans, state.reportConfig.finePerDay, tickNow]
  );

  const memberActivities = useMemo(
    () =>
      state.activities.filter(
        (a) =>
          a.actorName === activeMember.name ||
          a.summary.includes(activeMember.name) ||
          a.actionType === 'catalog_add'
      ),
    [state.activities, activeMember.name]
  );

  const filteredBooks = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return state.books.filter((b) => {
      const matchCat = categoryFilter === 'Semua' || b.category === categoryFilter;
      const matchAvail = availabilityFilter === 'all' || b.availableCopies > 0;
      const matchQuery =
        !q ||
        b.title.toLowerCase().includes(q) ||
        b.author.toLowerCase().includes(q) ||
        b.isbn.toLowerCase().includes(q);
      return matchCat && matchAvail && matchQuery;
    });
  }, [state.books, categoryFilter, availabilityFilter, searchQuery]);

  const handleAction = (res: { ok: boolean; message: string }) => {
    if (!res.ok) notify(res.message, 'warning');
  };

  if (activeTab === 'home') {
    const recommended = state.books
      .filter(
        (b) =>
          b.availableCopies > 0 &&
          !activeLoans.some((l) => l.bookId === b.id)
      )
      .slice(0, 4);

    const readyReservations = memberReservations.filter((r) => r.status === 'ready');

    return (
      <div className="space-y-4">
        {readyReservations.length > 0 && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 flex items-center justify-between gap-3">
            <div className="text-xs text-emerald-900">
              <span className="font-semibold">Buku Reservasi Siap Diambil:</span>{' '}
              {readyReservations.map((r) => `"${r.bookTitle}"`).join(', ')}. Silakan pinjam sebelum antrean dialihkan.
            </div>
            <button
              onClick={() => onNavigateTab('explore')}
              className="px-3 py-1.5 text-xs font-medium text-white bg-emerald-700 hover:bg-emerald-800 rounded whitespace-nowrap"
            >
              Pinjam Sekarang
            </button>
          </div>
        )}

        {/* Member Compact KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-lg p-3.5">
            <p className="text-xs text-slate-500">Pinjaman Aktif</p>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-semibold font-mono tabular-nums text-slate-900">
                {activeLoans.length}
              </span>
              <span className="text-xs font-mono text-slate-500">
                Kuota {activeMember.maxQuota} buku
              </span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3.5">
            <p className="text-xs text-slate-500">Kuota Tersisa</p>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-semibold font-mono tabular-nums text-blue-700">
                {Math.max(0, activeMember.maxQuota - activeLoans.length)}
              </span>
              <span className="text-xs text-slate-500">dapat dipinjam</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3.5">
            <p className="text-xs text-slate-500">Estimasi Denda</p>
            <div className="mt-1 flex items-baseline justify-between">
              <span
                className={`text-xl font-semibold font-mono tabular-nums ${
                  totalPendingFine > 0 ? 'text-red-700' : 'text-slate-900'
                }`}
              >
                {formatCurrencyIDR(totalPendingFine)}
              </span>
              <span className="text-xs text-slate-500">berjalan</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3.5">
            <p className="text-xs text-slate-500">Disimpan & Antrean</p>
            <div className="mt-1 flex items-baseline justify-between">
              <span className="text-2xl font-semibold font-mono tabular-nums text-slate-900">
                {activeMember.bookmarks.length}
              </span>
              <span className="text-xs font-mono text-slate-500">
                {memberReservations.length} antrean
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
          {/* Active Loans */}
          <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Pinjaman Saya Saat Ini</h2>
                <p className="text-xs text-slate-500">
                  Perpanjang durasi atau ajukan pengembalian secara langsung
                </p>
              </div>
              <button
                onClick={() => onNavigateTab('explore')}
                className="px-3 py-1.5 text-xs font-medium text-blue-700 hover:bg-blue-50 border border-blue-200 rounded-md whitespace-nowrap"
              >
                Cari Buku
              </button>
            </div>

            {activeLoans.length === 0 ? (
              <div className="p-6 text-center space-y-2">
                <p className="text-xs text-slate-500">Anda belum memiliki pinjaman aktif.</p>
                <button
                  onClick={() => onNavigateTab('explore')}
                  className="px-3.5 py-1.5 text-xs font-medium text-white bg-blue-700 rounded-md"
                >
                  Jelajah Katalog
                </button>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {activeLoans.map((loan) => {
                  const overdue = isLoanOverdue(loan);
                  const fine = calculateLoanFine(loan, state.reportConfig.finePerDay);
                  return (
                    <div key={loan.id} className="px-4 py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 text-xs">
                          <span className="font-mono font-medium text-slate-900">{loan.loanCode}</span>
                          <span className="text-slate-300">·</span>
                          {loan.status === 'return_requested' ? (
                            <span className="text-blue-700 font-medium">Menunggu Konfirmasi Admin</span>
                          ) : overdue ? (
                            <span className="text-red-700 font-medium">
                              Terlambat {calculateOverdueDays(loan.dueAt)}h · {formatCurrencyIDR(fine)}
                            </span>
                          ) : (
                            <span className="text-slate-500">
                              Jatuh tempo {formatDateShort(loan.dueAt)}
                            </span>
                          )}
                        </div>
                        <p className="text-sm font-medium text-slate-900 truncate mt-0.5">
                          {loan.bookTitle}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!overdue && loan.extendedCount < 1 && loan.status !== 'return_requested' && (
                          <button
                            onClick={() => handleAction(extendLoan(loan.id))}
                            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded text-slate-700 hover:bg-slate-50 whitespace-nowrap"
                          >
                            Perpanjang +7h
                          </button>
                        )}
                        {loan.status !== 'return_requested' && (
                          <button
                            onClick={() => handleAction(requestReturn(loan.id))}
                            className="px-2.5 py-1.5 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded whitespace-nowrap"
                          >
                            Ajukan Kembali
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Live Member Activity Feed */}
          <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {liveConnected && (
                  <span
                    className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"
                    title="Pembaruan aktivitas real-time aktif"
                  />
                )}
                <h2 className="text-sm font-semibold text-slate-900">Notifikasi & Log Real-Time</h2>
              </div>
              <span className="text-[11px] font-mono text-slate-500">
                {formatTimeClock(state.lastSyncedAt)}
              </span>
            </div>

            <div className="divide-y divide-slate-100 max-h-[280px] overflow-y-auto">
              {memberActivities.slice(0, 8).map((act) => (
                <div key={act.id} className="px-4 py-2.5 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs text-slate-800 leading-snug">{act.summary}</p>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5">
                      {act.refCode} · {formatRelativeTime(act.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Compact Recommended Books Row */}
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-slate-900">Rekomendasi Tersedia di Rak</h3>
            <button
              onClick={() => onNavigateTab('explore')}
              className="text-xs font-medium text-blue-700 hover:underline"
            >
              Lihat semua koleksi
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {recommended.map((book) => (
              <div
                key={book.id}
                onClick={() => onPreviewBook(book)}
                className="border border-slate-200 rounded-md p-3 flex items-start gap-3 hover:border-slate-300 cursor-pointer transition-colors"
              >
                <BookCover book={book} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-slate-900 line-clamp-2 leading-snug">
                    {book.title}
                  </p>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">{book.author}</p>
                  <p className="text-[11px] font-mono text-emerald-700 mt-1">
                    Rak {book.shelfCode} · {book.availableCopies} tersedia
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (activeTab === 'explore') {
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

          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
            <button
              onClick={() => setAvailabilityFilter('all')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                availabilityFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'
              }`}
            >
              Semua Stok
            </button>
            <button
              onClick={() => setAvailabilityFilter('available')}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md whitespace-nowrap ${
                availabilityFilter === 'available'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600'
              }`}
            >
              Tersedia Saja
            </button>
          </div>
        </div>

        {filteredBooks.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-xs text-slate-500">
            Tidak ada buku yang sesuai dengan kata kunci atau filter Anda.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {filteredBooks.map((book) => {
              const isBookmarked = activeMember.bookmarks.includes(book.id);
              const isBorrowing = activeLoans.some((l) => l.bookId === book.id);
              const isQueued = memberReservations.some((r) => r.bookId === book.id);

              return (
                <div
                  key={book.id}
                  className="bg-white border border-slate-200 rounded-lg p-3.5 flex gap-3.5 items-start"
                >
                  <button
                    onClick={() => onPreviewBook(book)}
                    className="shrink-0 text-left focus-visible:outline-2 focus-visible:outline-blue-600 rounded"
                  >
                    <BookCover book={book} size="md" />
                  </button>

                  <div className="min-w-0 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-[11px] text-slate-500 truncate">
                          {book.category} · Rak {book.shelfCode}
                        </p>
                        <button
                          onClick={() => toggleBookmark(book.id, activeMember.id)}
                          className={`p-1 rounded ${
                            isBookmarked ? 'text-blue-700' : 'text-slate-300 hover:text-slate-600'
                          }`}
                          aria-label="Simpan buku"
                        >
                          <Bookmark className="w-3.5 h-3.5" fill={isBookmarked ? 'currentColor' : 'none'} />
                        </button>
                      </div>

                      <button
                        onClick={() => onPreviewBook(book)}
                        className="text-sm font-semibold text-slate-900 hover:text-blue-700 text-left line-clamp-1 mt-0.5"
                      >
                        {book.title}
                      </button>
                      <p className="text-xs text-slate-600 truncate">{book.author}</p>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span
                        className={`text-xs font-mono ${
                          book.availableCopies > 0 ? 'text-emerald-700' : 'text-red-700'
                        }`}
                      >
                        {book.availableCopies > 0
                          ? `${book.availableCopies}/${book.totalCopies} tersedia`
                          : 'Stok habis'}
                      </span>

                      {isBorrowing ? (
                        <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" /> Dipinjam
                        </span>
                      ) : book.availableCopies > 0 ? (
                        <button
                          onClick={() => handleAction(borrowBook(book.id, activeMember.id))}
                          className="px-3 py-1.5 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded whitespace-nowrap"
                        >
                          Pinjam
                        </button>
                      ) : isQueued ? (
                        <span className="text-xs font-medium text-amber-700">Dalam Antrean</span>
                      ) : (
                        <button
                          onClick={() => handleAction(reserveBook(book.id, activeMember.id))}
                          className="px-3 py-1.5 text-xs font-medium text-slate-800 bg-slate-100 hover:bg-slate-200 rounded whitespace-nowrap"
                        >
                          Antre
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  if (activeTab === 'loans') {
    return (
      <div className="space-y-4">
        {/* Member Reservations */}
        {memberReservations.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 bg-slate-50/70">
              <h3 className="text-xs font-semibold text-slate-900">Antrean Reservasi Saya</h3>
            </div>
            <div className="divide-y divide-slate-100">
              {memberReservations.map((res) => (
                <div key={res.id} className="px-4 py-2.5 flex items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-medium text-slate-900">{res.bookTitle}</span>
                    <span className="text-slate-400 mx-2">·</span>
                    <span className={res.status === 'ready' ? 'text-emerald-700 font-medium' : 'text-amber-700'}>
                      {res.status === 'ready' ? 'Tersedia untuk diambil' : 'Menunggu giliran'}
                    </span>
                  </div>
                  <button
                    onClick={() => cancelReservation(res.id)}
                    className="text-slate-500 hover:text-red-700 whitespace-nowrap"
                  >
                    Batalkan
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Riwayat & Pinjaman Saya</h2>
            <span className="text-xs font-mono text-slate-500">{memberLoans.length} transaksi</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-medium text-slate-500">
                  <th className="py-2.5 px-4">Kode</th>
                  <th className="py-2.5 px-3">Judul Buku</th>
                  <th className="py-2.5 px-3">Tanggal Pinjam</th>
                  <th className="py-2.5 px-3">Jatuh Tempo</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Denda</th>
                  <th className="py-2.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {memberLoans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-10 text-center text-xs text-slate-500">
                      Belum ada riwayat peminjaman untuk akun ini.
                    </td>
                  </tr>
                ) : (
                  memberLoans.map((loan) => {
                    const overdue = isLoanOverdue(loan);
                    const fine = calculateLoanFine(loan, state.reportConfig.finePerDay);
                    return (
                      <tr key={loan.id} className="hover:bg-slate-50/70">
                        <td className="py-2.5 px-4 font-mono text-xs font-medium text-slate-900">
                          {loan.loanCode}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900">{loan.bookTitle}</td>
                        <td className="py-2.5 px-3 font-mono text-xs text-slate-600 whitespace-nowrap">
                          {formatDateShort(loan.borrowedAt)}
                        </td>
                        <td
                          className={`py-2.5 px-3 font-mono text-xs whitespace-nowrap ${
                            overdue ? 'text-red-700 font-semibold' : 'text-slate-600'
                          }`}
                        >
                          {formatDateShort(loan.dueAt)}
                        </td>
                        <td className="py-2.5 px-3 text-xs whitespace-nowrap">
                          {loan.status === 'returned' ? (
                            <span className="text-emerald-700 font-medium">Dikembalikan</span>
                          ) : loan.status === 'return_requested' ? (
                            <span className="text-blue-700 font-medium">Ajuan Kembali</span>
                          ) : overdue ? (
                            <span className="text-red-700 font-medium inline-flex items-center gap-1">
                              <AlertTriangle className="w-3.5 h-3.5" /> Terlambat
                            </span>
                          ) : (
                            <span className="text-slate-700 inline-flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5 text-amber-600" /> Aktif
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-xs tabular-nums">
                          {fine > 0 ? (
                            <span className="text-red-700 font-semibold">{formatCurrencyIDR(fine)}</span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                        <td className="py-2.5 px-4 text-right whitespace-nowrap">
                          {loan.status !== 'returned' && loan.status !== 'return_requested' ? (
                            <div className="inline-flex items-center gap-1.5">
                              {!overdue && loan.extendedCount < 1 && (
                                <button
                                  onClick={() => handleAction(extendLoan(loan.id))}
                                  className="px-2.5 py-1 text-xs border border-slate-200 rounded text-slate-700 hover:bg-slate-50"
                                >
                                  +7 Hari
                                </button>
                              )}
                              <button
                                onClick={() => handleAction(requestReturn(loan.id))}
                                className="px-2.5 py-1 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 rounded inline-flex items-center gap-1"
                              >
                                <RotateCcw className="w-3 h-3" /> Kembalikan
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs font-mono text-slate-400">
                              {loan.returnedAt ? formatDateShort(loan.returnedAt) : 'Menunggu'}
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
      </div>
    );
  }

  // Digital Member Card & Bookmarks
  const bookmarkedBooks = state.books.filter((b) => activeMember.bookmarks.includes(b.id));

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(activeMember.memberCode);
    setCopiedCard(true);
    setTimeout(() => setCopiedCard(false), 1800);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      {/* Digital Member Card */}
      <div className="lg:col-span-5 bg-slate-900 text-white rounded-lg p-5 border border-slate-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-blue-400" />
            <span className="font-display text-sm font-semibold tracking-tight">
              Kartu Anggota MeowLibrary
            </span>
          </div>
          <span className="text-xs font-mono text-emerald-400">
            {activeMember.status === 'active' ? 'AKTIF' : 'TANGGUH'}
          </span>
        </div>

        <div className="mt-6">
          <p className="text-xs text-slate-400">Nama Anggota</p>
          <p className="text-lg font-semibold mt-0.5">{activeMember.name}</p>
          <p className="text-xs text-slate-400 mt-0.5">{activeMember.email}</p>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] text-slate-400">Nomor Identitas</p>
            <p className="font-mono text-sm font-semibold tracking-wide mt-0.5">
              {activeMember.memberCode}
            </p>
          </div>
          <button
            onClick={handleCopyCode}
            className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 rounded flex items-center gap-1.5"
          >
            {copiedCard ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedCard ? 'Tersalin' : 'Salin ID'}
          </button>
        </div>
      </div>

      {/* Saved / Bookmarked Collection */}
      <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">Koleksi Disimpan ({bookmarkedBooks.length})</h3>
          <button
            onClick={() => onNavigateTab('explore')}
            className="text-xs font-medium text-blue-700 hover:underline"
          >
            Jelajah Katalog
          </button>
        </div>

        {bookmarkedBooks.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Belum ada buku yang disimpan. Klik ikon bookmark pada katalog untuk menyimpan bacaan.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {bookmarkedBooks.map((book) => (
              <div key={book.id} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <BookCover book={book} size="sm" />
                  <div className="min-w-0">
                    <button
                      onClick={() => onPreviewBook(book)}
                      className="text-sm font-medium text-slate-900 hover:text-blue-700 truncate block text-left"
                    >
                      {book.title}
                    </button>
                    <p className="text-xs text-slate-500">
                      {book.author} · Rak {book.shelfCode} ·{' '}
                      <span className={book.availableCopies > 0 ? 'text-emerald-700' : 'text-red-700'}>
                        {book.availableCopies > 0 ? `${book.availableCopies} tersedia` : 'Stok habis'}
                      </span>
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => toggleBookmark(book.id, activeMember.id)}
                  className="text-xs text-slate-500 hover:text-red-700 whitespace-nowrap"
                >
                  Hapus
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
