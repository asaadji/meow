import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { INITIAL_LIBRARY_STATE } from '../data/seedData';
import {
  ActivityActionType,
  ActivityLog,
  AutoReportConfig,
  Book,
  LibraryState,
  LoanTransaction,
  Member,
  ReportPeriod,
  UserRole,
} from '../types/library';
import { calculateLoanFine, downloadCsvFile, formatDateShort } from '../utils/formatters';

const STORAGE_KEY = 'meowlibrary_state_v1';
const CHANNEL_NAME = 'meowlibrary_realtime_v1';

interface ActionResult {
  ok: boolean;
  message: string;
}

export interface ToastNotice {
  id: string;
  tone: 'success' | 'info' | 'warning';
  text: string;
}

interface LibraryContextValue {
  state: LibraryState;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  activeMemberId: string;
  setActiveMemberId: (id: string) => void;
  activeMember: Member;
  liveConnected: boolean;
  tickNow: number;
  toasts: ToastNotice[];
  dismissToast: (id: string) => void;
  notify: (text: string, tone?: 'success' | 'info' | 'warning') => void;
  borrowBook: (bookId: string, memberId: string, durationDays?: number) => ActionResult;
  returnBook: (loanId: string, waiveFine?: boolean) => ActionResult;
  requestReturn: (loanId: string) => ActionResult;
  extendLoan: (loanId: string) => ActionResult;
  reserveBook: (bookId: string, memberId: string) => ActionResult;
  cancelReservation: (reservationId: string) => ActionResult;
  toggleBookmark: (bookId: string, memberId: string) => void;
  addBook: (book: Omit<Book, 'id' | 'borrowCount' | 'createdAt'>) => ActionResult;
  updateBook: (bookId: string, updates: Partial<Book>) => ActionResult;
  deleteBook: (bookId: string) => ActionResult;
  addMember: (member: Omit<Member, 'id' | 'memberCode' | 'joinedAt' | 'bookmarks'>) => ActionResult;
  toggleMemberStatus: (memberId: string) => ActionResult;
  updateReportConfig: (updates: Partial<AutoReportConfig>) => void;
  generateAutoReport: (period: ReportPeriod) => void;
  exportLoansCsv: (loansToExport?: LoanTransaction[]) => void;
  exportBooksCsv: () => void;
  resetDemoData: () => void;
}

const LibraryContext = createContext<LibraryContextValue | null>(null);

function loadInitialState(): LibraryState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return INITIAL_LIBRARY_STATE;
    const parsed = JSON.parse(raw) as LibraryState;
    if (!parsed || !Array.isArray(parsed.books) || !Array.isArray(parsed.loans)) {
      return INITIAL_LIBRARY_STATE;
    }
    return parsed;
  } catch {
    return INITIAL_LIBRARY_STATE;
  }
}

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<LibraryState>(loadInitialState);
  const [activeRole, setActiveRole] = useState<UserRole>('admin');
  const [activeMemberId, setActiveMemberId] = useState<string>('mem-01');
  const [liveConnected, setLiveConnected] = useState<boolean>(true);
  const [tickNow, setTickNow] = useState<number>(Date.now());
  const [toasts, setToasts] = useState<ToastNotice[]>([]);

  const channelRef = useRef<BroadcastChannel | null>(null);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (text: string, tone: 'success' | 'info' | 'warning' = 'success') => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, tone, text }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  const commitState = useCallback((updater: (prev: LibraryState) => LibraryState) => {
    setState((prev) => {
      const next = updater(prev);
      const stamped: LibraryState = {
        ...next,
        lastSyncedAt: new Date().toISOString(),
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
      } catch {
        // Storage quota fallback
      }
      if (channelRef.current) {
        channelRef.current.postMessage({ type: 'STATE_SYNC', payload: stamped });
      }
      return stamped;
    });
  }, []);

  useEffect(() => {
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(CHANNEL_NAME);
      channelRef.current = channel;
      setLiveConnected(true);

      channel.onmessage = (event) => {
        if (event.data?.type === 'STATE_SYNC' && event.data.payload) {
          setState(event.data.payload as LibraryState);
        }
      };

      return () => {
        channel.close();
        channelRef.current = null;
      };
    }
    return undefined;
  }, []);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue) as LibraryState;
          setState(parsed);
        } catch {
          // ignore malformed sync
        }
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => setTickNow(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, []);

  const activeMember = useMemo(() => {
    return state.members.find((m) => m.id === activeMemberId) ?? state.members[0];
  }, [state.members, activeMemberId]);

  const appendActivity = (
    prevActivities: ActivityLog[],
    actorName: string,
    actorRole: UserRole,
    actionType: ActivityActionType,
    summary: string,
    refCode: string
  ): ActivityLog[] => {
    const entry: ActivityLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      actorName,
      actorRole,
      actionType,
      summary,
      refCode,
    };
    return [entry, ...prevActivities].slice(0, 80);
  };

  const borrowBook = useCallback(
    (bookId: string, memberId: string, durationDays?: number): ActionResult => {
      const book = state.books.find((b) => b.id === bookId);
      const member = state.members.find((m) => m.id === memberId);

      if (!book || !member) {
        return { ok: false, message: 'Data buku atau anggota tidak ditemukan.' };
      }
      if (member.status !== 'active') {
        return { ok: false, message: `Keanggotaan ${member.name} sedang ditangguhkan.` };
      }
      if (book.availableCopies <= 0) {
        return { ok: false, message: 'Stok buku sedang kosong. Gunakan fitur antrean reservasi.' };
      }
      const memberActiveLoans = state.loans.filter(
        (l) => l.memberId === member.id && l.status !== 'returned'
      );
      if (memberActiveLoans.length >= member.maxQuota) {
        return {
          ok: false,
          message: `Kuota pinjam ${member.name} sudah penuh (${member.maxQuota} buku).`,
        };
      }
      const alreadyBorrowingSame = memberActiveLoans.some((l) => l.bookId === book.id);
      if (alreadyBorrowingSame) {
        return { ok: false, message: `${member.name} masih meminjam buku yang sama.` };
      }

      const days = durationDays ?? state.reportConfig.defaultLoanDays;
      const loanCode = `TRX-${Math.floor(1000 + Math.random() * 9000)}`;
      const now = new Date();
      const due = new Date(now.getTime() + days * 24 * 3600 * 1000);

      const newLoan: LoanTransaction = {
        id: `ln-${Date.now()}`,
        loanCode,
        bookId: book.id,
        bookTitle: book.title,
        bookIsbn: book.isbn,
        memberId: member.id,
        memberName: member.name,
        memberCode: member.memberCode,
        borrowedAt: now.toISOString(),
        dueAt: due.toISOString(),
        extendedCount: 0,
        status: 'active',
        finePaid: 0,
      };

      commitState((prev) => ({
        ...prev,
        books: prev.books.map((b) =>
          b.id === book.id
            ? {
                ...b,
                availableCopies: Math.max(0, b.availableCopies - 1),
                borrowCount: b.borrowCount + 1,
              }
            : b
        ),
        loans: [newLoan, ...prev.loans],
        reservations: prev.reservations.map((r) =>
          r.bookId === book.id && r.memberId === member.id && (r.status === 'waiting' || r.status === 'ready')
            ? { ...r, status: 'fulfilled' }
            : r
        ),
        activities: appendActivity(
          prev.activities,
          activeRole === 'admin' ? 'Admin MeowLibrary' : member.name,
          activeRole,
          'borrow',
          `${member.name} meminjam "${book.title}" (${days} hari)`,
          loanCode
        ),
      }));

      notify(`Peminjaman ${loanCode} berhasil dicatat.`, 'success');
      return { ok: true, message: `Berhasil meminjam "${book.title}".` };
    },
    [state.books, state.members, state.loans, state.reportConfig.defaultLoanDays, activeRole, commitState, notify]
  );

  const returnBook = useCallback(
    (loanId: string, waiveFine = false): ActionResult => {
      const loan = state.loans.find((l) => l.id === loanId);
      if (!loan || loan.status === 'returned') {
        return { ok: false, message: 'Transaksi peminjaman tidak ditemukan atau sudah selesai.' };
      }

      const computedFine = waiveFine ? 0 : calculateLoanFine(loan, state.reportConfig.finePerDay);

      commitState((prev) => {
        const waitingQueue = prev.reservations
          .filter((r) => r.bookId === loan.bookId && r.status === 'waiting')
          .sort((a, b) => new Date(a.requestedAt).getTime() - new Date(b.requestedAt).getTime());
        const nextInQueue = waitingQueue[0];

        let updatedActivities = appendActivity(
          prev.activities,
          'Admin MeowLibrary',
          'admin',
          'return',
          `Pengembalian "${loan.bookTitle}" oleh ${loan.memberName}${
            computedFine > 0 ? ` (Denda Rp ${computedFine.toLocaleString('id-ID')})` : ''
          }`,
          loan.loanCode
        );

        if (nextInQueue) {
          updatedActivities = appendActivity(
            updatedActivities,
            'Sistem Antrean',
            'admin',
            'reserve',
            `Buku "${loan.bookTitle}" siap diambil oleh ${nextInQueue.memberName}`,
            nextInQueue.memberCode
          );
        }

        return {
          ...prev,
          books: prev.books.map((b) =>
            b.id === loan.bookId
              ? { ...b, availableCopies: Math.min(b.totalCopies, b.availableCopies + 1) }
              : b
          ),
          loans: prev.loans.map((l) =>
            l.id === loanId
              ? {
                  ...l,
                  status: 'returned',
                  returnedAt: new Date().toISOString(),
                  finePaid: computedFine,
                }
              : l
          ),
          reservations: nextInQueue
            ? prev.reservations.map((r) => (r.id === nextInQueue.id ? { ...r, status: 'ready' } : r))
            : prev.reservations,
          activities: updatedActivities,
        };
      });

      notify(`Pengembalian ${loan.loanCode} selesai diproses.`, 'success');
      return { ok: true, message: 'Buku berhasil dikembalikan.' };
    },
    [state.loans, state.reportConfig.finePerDay, commitState, notify]
  );

  const requestReturn = useCallback(
    (loanId: string): ActionResult => {
      const loan = state.loans.find((l) => l.id === loanId);
      if (!loan || loan.status === 'returned' || loan.status === 'return_requested') {
        return { ok: false, message: 'Pengajuan pengembalian tidak dapat diproses.' };
      }
      commitState((prev) => ({
        ...prev,
        loans: prev.loans.map((l) =>
          l.id === loanId
            ? {
                ...l,
                status: 'return_requested',
                notes: 'Diajukan oleh member secara real-time',
              }
            : l
        ),
        activities: appendActivity(
          prev.activities,
          loan.memberName,
          'member',
          'return_requested',
          `${loan.memberName} mengajukan pengembalian "${loan.bookTitle}"`,
          loan.loanCode
        ),
      }));
      notify(`Pengajuan pengembalian ${loan.loanCode} dikirim ke Admin.`, 'info');
      return { ok: true, message: 'Pengajuan pengembalian dikirim.' };
    },
    [state.loans, commitState, notify]
  );

  const extendLoan = useCallback(
    (loanId: string): ActionResult => {
      const loan = state.loans.find((l) => l.id === loanId);
      if (!loan || loan.status === 'returned') {
        return { ok: false, message: 'Transaksi tidak valid untuk perpanjangan.' };
      }
      if (loan.extendedCount >= 1) {
        return { ok: false, message: 'Batas perpanjangan maksimal (1x) telah tercapai.' };
      }
      if (Date.now() > new Date(loan.dueAt).getTime()) {
        return { ok: false, message: 'Buku yang sudah melewati jatuh tempo tidak dapat diperpanjang.' };
      }
      const hasWaitingQueue = state.reservations.some(
        (r) => r.bookId === loan.bookId && r.status === 'waiting'
      );
      if (hasWaitingQueue) {
        return {
          ok: false,
          message: 'Perpanjangan ditolak karena ada anggota lain dalam antrean reservasi.',
        };
      }

      const newDue = new Date(new Date(loan.dueAt).getTime() + 7 * 24 * 3600 * 1000).toISOString();

      commitState((prev) => ({
        ...prev,
        loans: prev.loans.map((l) =>
          l.id === loanId
            ? {
                ...l,
                dueAt: newDue,
                extendedCount: l.extendedCount + 1,
                notes: 'Diperpanjang +7 hari',
              }
            : l
        ),
        activities: appendActivity(
          prev.activities,
          activeRole === 'admin' ? 'Admin MeowLibrary' : loan.memberName,
          activeRole,
          'extend',
          `Durasi pinjam "${loan.bookTitle}" (${loan.memberName}) diperpanjang +7 hari`,
          loan.loanCode
        ),
      }));

      notify(`Masa pinjam ${loan.loanCode} diperpanjang hingga ${formatDateShort(newDue)}.`, 'success');
      return { ok: true, message: 'Durasi peminjaman diperpanjang 7 hari.' };
    },
    [state.loans, state.reservations, activeRole, commitState, notify]
  );

  const reserveBook = useCallback(
    (bookId: string, memberId: string): ActionResult => {
      const book = state.books.find((b) => b.id === bookId);
      const member = state.members.find((m) => m.id === memberId);
      if (!book || !member) return { ok: false, message: 'Data tidak ditemukan.' };

      const alreadyQueued = state.reservations.some(
        (r) => r.bookId === bookId && r.memberId === memberId && (r.status === 'waiting' || r.status === 'ready')
      );
      if (alreadyQueued) {
        return { ok: false, message: 'Anda sudah berada di antrean untuk buku ini.' };
      }

      const refCode = `RES-${Math.floor(100 + Math.random() * 900)}`;
      commitState((prev) => ({
        ...prev,
        reservations: [
          {
            id: `res-${Date.now()}`,
            bookId: book.id,
            bookTitle: book.title,
            memberId: member.id,
            memberName: member.name,
            memberCode: member.memberCode,
            requestedAt: new Date().toISOString(),
            status: 'waiting',
          },
          ...prev.reservations,
        ],
        activities: appendActivity(
          prev.activities,
          member.name,
          'member',
          'reserve',
          `${member.name} masuk antrean reservasi "${book.title}"`,
          refCode
        ),
      }));

      notify(`Reservasi "${book.title}" berhasil dibuat.`, 'info');
      return { ok: true, message: 'Berhasil masuk antrean reservasi.' };
    },
    [state.books, state.members, state.reservations, commitState, notify]
  );

  const cancelReservation = useCallback(
    (reservationId: string): ActionResult => {
      const target = state.reservations.find((r) => r.id === reservationId);
      if (!target) return { ok: false, message: 'Reservasi tidak ditemukan.' };
      commitState((prev) => ({
        ...prev,
        reservations: prev.reservations.map((r) =>
          r.id === reservationId ? { ...r, status: 'cancelled' } : r
        ),
      }));
      notify(`Antrean reservasi "${target.bookTitle}" dibatalkan.`, 'info');
      return { ok: true, message: 'Reservasi dibatalkan.' };
    },
    [state.reservations, commitState, notify]
  );

  const toggleBookmark = useCallback(
    (bookId: string, memberId: string) => {
      commitState((prev) => ({
        ...prev,
        members: prev.members.map((m) => {
          if (m.id !== memberId) return m;
          const exists = m.bookmarks.includes(bookId);
          return {
            ...m,
            bookmarks: exists ? m.bookmarks.filter((id) => id !== bookId) : [...m.bookmarks, bookId],
          };
        }),
      }));
    },
    [commitState]
  );

  const addBook = useCallback(
    (bookData: Omit<Book, 'id' | 'borrowCount' | 'createdAt'>): ActionResult => {
      const newBook: Book = {
        ...bookData,
        id: `bk-${Date.now()}`,
        borrowCount: 0,
        createdAt: new Date().toISOString(),
      };
      commitState((prev) => ({
        ...prev,
        books: [newBook, ...prev.books],
        activities: appendActivity(
          prev.activities,
          'Admin MeowLibrary',
          'admin',
          'catalog_add',
          `Menambahkan koleksi baru "${newBook.title}" (${newBook.totalCopies} eks.)`,
          newBook.shelfCode
        ),
      }));
      notify(`Buku "${newBook.title}" ditambahkan ke katalog.`, 'success');
      return { ok: true, message: 'Buku ditambahkan.' };
    },
    [commitState, notify]
  );

  const updateBook = useCallback(
    (bookId: string, updates: Partial<Book>): ActionResult => {
      const existing = state.books.find((b) => b.id === bookId);
      if (!existing) return { ok: false, message: 'Buku tidak ditemukan.' };
      commitState((prev) => ({
        ...prev,
        books: prev.books.map((b) => (b.id === bookId ? { ...b, ...updates } : b)),
        activities: appendActivity(
          prev.activities,
          'Admin MeowLibrary',
          'admin',
          'catalog_update',
          `Memperbarui data koleksi "${updates.title ?? existing.title}"`,
          updates.shelfCode ?? existing.shelfCode
        ),
      }));
      notify(`Koleksi "${updates.title ?? existing.title}" diperbarui.`, 'success');
      return { ok: true, message: 'Koleksi diperbarui.' };
    },
    [state.books, commitState, notify]
  );

  const deleteBook = useCallback(
    (bookId: string): ActionResult => {
      const hasActiveLoans = state.loans.some((l) => l.bookId === bookId && l.status !== 'returned');
      if (hasActiveLoans) {
        return {
          ok: false,
          message: 'Buku masih sedang dipinjam dan belum dapat dihapus dari katalog.',
        };
      }
      const target = state.books.find((b) => b.id === bookId);
      commitState((prev) => ({
        ...prev,
        books: prev.books.filter((b) => b.id !== bookId),
        activities: appendActivity(
          prev.activities,
          'Admin MeowLibrary',
          'admin',
          'catalog_delete',
          `Menghapus buku "${target?.title ?? bookId}" dari katalog`,
          target?.shelfCode ?? 'DEL'
        ),
      }));
      notify('Buku dihapus dari katalog.', 'warning');
      return { ok: true, message: 'Buku dihapus.' };
    },
    [state.loans, state.books, commitState, notify]
  );

  const addMember = useCallback(
    (memberData: Omit<Member, 'id' | 'memberCode' | 'joinedAt' | 'bookmarks'>): ActionResult => {
      const nextNum = String(state.members.length + 1).padStart(3, '0');
      const memberCode = `ML-2026-${nextNum}`;
      const newMember: Member = {
        ...memberData,
        id: `mem-${Date.now()}`,
        memberCode,
        joinedAt: new Date().toISOString(),
        bookmarks: [],
      };
      commitState((prev) => ({
        ...prev,
        members: [...prev.members, newMember],
        activities: appendActivity(
          prev.activities,
          'Admin MeowLibrary',
          'admin',
          'member_add',
          `Mendaftarkan anggota baru ${newMember.name} (${memberCode})`,
          memberCode
        ),
      }));
      notify(`Anggota ${newMember.name} (${memberCode}) berhasil didaftarkan.`, 'success');
      return { ok: true, message: 'Anggota berhasil ditambahkan.' };
    },
    [state.members.length, commitState, notify]
  );

  const toggleMemberStatus = useCallback(
    (memberId: string): ActionResult => {
      const target = state.members.find((m) => m.id === memberId);
      if (!target) return { ok: false, message: 'Anggota tidak ditemukan.' };
      const nextStatus = target.status === 'active' ? 'suspended' : 'active';
      commitState((prev) => ({
        ...prev,
        members: prev.members.map((m) => (m.id === memberId ? { ...m, status: nextStatus } : m)),
        activities: appendActivity(
          prev.activities,
          'Admin MeowLibrary',
          'admin',
          'member_update',
          `Status keanggotaan ${target.name} diubah menjadi ${
            nextStatus === 'active' ? 'Aktif' : 'Ditangguhkan'
          }`,
          target.memberCode
        ),
      }));
      notify(
        `Status ${target.name} diubah ke ${nextStatus === 'active' ? 'Aktif' : 'Ditangguhkan'}.`,
        'info'
      );
      return { ok: true, message: 'Status diperbarui.' };
    },
    [state.members, commitState, notify]
  );

  const updateReportConfig = useCallback(
    (updates: Partial<AutoReportConfig>) => {
      commitState((prev) => ({
        ...prev,
        reportConfig: { ...prev.reportConfig, ...updates },
      }));
      notify('Konfigurasi pelaporan otomatis disimpan.', 'success');
    },
    [commitState, notify]
  );

  const generateAutoReport = useCallback(
    (period: ReportPeriod) => {
      const periodLabel =
        period === 'daily'
          ? 'Harian'
          : period === 'weekly'
          ? 'Mingguan'
          : period === 'monthly'
          ? 'Bulanan'
          : 'Keseluruhan';
      const nowIso = new Date().toISOString();
      commitState((prev) => ({
        ...prev,
        reportConfig: { ...prev.reportConfig, lastGeneratedAt: nowIso },
        activities: appendActivity(
          prev.activities,
          'Sistem Pelaporan',
          'admin',
          'report_generated',
          `Laporan sirkulasi otomatis (${periodLabel}) berhasil disusun`,
          `RPT-${period.toUpperCase()}`
        ),
      }));
      notify(`Laporan otomatis (${periodLabel}) berhasil diperbarui.`, 'success');
    },
    [commitState, notify]
  );

  const exportLoansCsv = useCallback(
    (loansToExport?: LoanTransaction[]) => {
      const rowsSource = loansToExport ?? state.loans;
      downloadCsvFile(
        `meowlibrary-laporan-sirkulasi-${new Date().toISOString().slice(0, 10)}.csv`,
        [
          'Kode Transaksi',
          'Kode Anggota',
          'Nama Anggota',
          'Judul Buku',
          'ISBN',
          'Tanggal Pinjam',
          'Jatuh Tempo',
          'Tanggal Kembali',
          'Status',
          'Denda (IDR)',
        ],
        rowsSource.map((l) => [
          l.loanCode,
          l.memberCode,
          l.memberName,
          l.bookTitle,
          l.bookIsbn,
          formatDateShort(l.borrowedAt),
          formatDateShort(l.dueAt),
          l.returnedAt ? formatDateShort(l.returnedAt) : '-',
          l.status,
          calculateLoanFine(l, state.reportConfig.finePerDay),
        ])
      );
      notify('File CSV laporan transaksi berhasil diunduh.', 'success');
    },
    [state.loans, state.reportConfig.finePerDay, notify]
  );

  const exportBooksCsv = useCallback(() => {
    downloadCsvFile(
      `meowlibrary-inventaris-koleksi-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Rak', 'ISBN', 'Judul', 'Penulis', 'Penerbit', 'Tahun', 'Kategori', 'Stok Tersedia', 'Total Eksemplar', 'Total Dipinjam'],
      state.books.map((b) => [
        b.shelfCode,
        b.isbn,
        b.title,
        b.author,
        b.publisher,
        b.year,
        b.category,
        b.availableCopies,
        b.totalCopies,
        b.borrowCount,
      ])
    );
    notify('File CSV inventaris koleksi berhasil diunduh.', 'success');
  }, [state.books, notify]);

  const resetDemoData = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    commitState(() => INITIAL_LIBRARY_STATE);
    notify('Data simulasi MeowLibrary dikembalikan ke kondisi awal.', 'info');
  }, [commitState, notify]);

  return (
    <LibraryContext.Provider
      value={{
        state,
        activeRole,
        setActiveRole,
        activeMemberId,
        setActiveMemberId,
        activeMember,
        liveConnected,
        tickNow,
        toasts,
        dismissToast,
        notify,
        borrowBook,
        returnBook,
        requestReturn,
        extendLoan,
        reserveBook,
        cancelReservation,
        toggleBookmark,
        addBook,
        updateBook,
        deleteBook,
        addMember,
        toggleMemberStatus,
        updateReportConfig,
        generateAutoReport,
        exportLoansCsv,
        exportBooksCsv,
        resetDemoData,
      }}
    >
      {children}
    </LibraryContext.Provider>
  );
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error('useLibrary must be used within LibraryProvider');
  return ctx;
}
