import React, { useEffect, useState } from 'react';
import { Bookmark, Check, Clock, X } from 'lucide-react';
import { useLibrary } from '../context/LibraryContext';
import { Book, BookCategory } from '../types/library';
import { BookCover } from './BrandMark';

const CATEGORIES: BookCategory[] = [
  'Sastra & Fiksi',
  'Teknologi & Sistem',
  'Arsitektur & Desain',
  'Sains & Botani',
  'Sejarah & Budaya',
  'Bisnis & Ekonomi',
];

const COVER_TONES: { value: Book['coverTone']; label: string }[] = [
  { value: 'cobalt', label: 'Biru Kobalt' },
  { value: 'indigo', label: 'Indigo Gelap' },
  { value: 'emerald', label: 'Hijau Botani' },
  { value: 'slate', label: 'Slate Arsitektural' },
  { value: 'charcoal', label: 'Hitam Karbon' },
  { value: 'zinc', label: 'Abu Netral' },
];

export function BookFormModal({
  open,
  editingBook,
  onClose,
}: {
  open: boolean;
  editingBook: Book | null;
  onClose: () => void;
}) {
  const { addBook, updateBook } = useLibrary();

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [isbn, setIsbn] = useState('');
  const [publisher, setPublisher] = useState('');
  const [year, setYear] = useState('2025');
  const [category, setCategory] = useState<BookCategory>('Teknologi & Sistem');
  const [shelfCode, setShelfCode] = useState('A-05');
  const [totalCopies, setTotalCopies] = useState('3');
  const [pages, setPages] = useState('240');
  const [coverTone, setCoverTone] = useState<Book['coverTone']>('cobalt');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (editingBook) {
      setTitle(editingBook.title);
      setAuthor(editingBook.author);
      setIsbn(editingBook.isbn);
      setPublisher(editingBook.publisher);
      setYear(String(editingBook.year));
      setCategory(editingBook.category);
      setShelfCode(editingBook.shelfCode);
      setTotalCopies(String(editingBook.totalCopies));
      setPages(String(editingBook.pages));
      setCoverTone(editingBook.coverTone);
      setDescription(editingBook.description);
    } else {
      setTitle('');
      setAuthor('');
      setIsbn(`978-623-${Math.floor(100 + Math.random() * 899)}-${Math.floor(100 + Math.random() * 899)}-1`);
      setPublisher('');
      setYear('2025');
      setCategory('Teknologi & Sistem');
      setShelfCode('A-05');
      setTotalCopies('3');
      setPages('240');
      setCoverTone('cobalt');
      setDescription('');
    }
    setError('');
  }, [editingBook, open]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = Math.max(1, parseInt(totalCopies, 10) || 1);
    const yr = parseInt(year, 10) || 2025;
    const pg = Math.max(10, parseInt(pages, 10) || 200);

    if (!title.trim() || !author.trim() || !isbn.trim()) {
      setError('Judul, penulis, dan ISBN wajib diisi.');
      return;
    }

    if (editingBook) {
      const borrowedCount = editingBook.totalCopies - editingBook.availableCopies;
      const nextAvailable = Math.max(0, total - borrowedCount);
      updateBook(editingBook.id, {
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim(),
        publisher: publisher.trim() || 'Pustaka Mandiri',
        year: yr,
        category,
        shelfCode: shelfCode.trim().toUpperCase() || 'A-01',
        totalCopies: Math.max(total, borrowedCount),
        availableCopies: nextAvailable,
        pages: pg,
        coverTone,
        description: description.trim() || 'Koleksi resmi MeowLibrary.',
      });
    } else {
      addBook({
        title: title.trim(),
        author: author.trim(),
        isbn: isbn.trim(),
        publisher: publisher.trim() || 'Pustaka Mandiri',
        year: yr,
        category,
        shelfCode: shelfCode.trim().toUpperCase() || 'A-01',
        totalCopies: total,
        availableCopies: total,
        pages: pg,
        coverTone,
        description: description.trim() || 'Koleksi resmi MeowLibrary.',
      });
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-lg bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">
            {editingBook ? 'Edit Koleksi Buku' : 'Tambah Koleksi Baru'}
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded focus-visible:outline-2 focus-visible:outline-blue-600"
            aria-label="Tutup modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 max-h-[82vh] overflow-y-auto">
          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
              {error}
            </p>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Judul Buku</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Contoh: Desain Sistem Informasi Modern"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
              required
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Penulis</label>
              <input
                type="text"
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                placeholder="Nama penulis"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">ISBN</label>
              <input
                type="text"
                value={isbn}
                onChange={(e) => setIsbn(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kategori</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as BookCategory)}
                className="w-full px-2.5 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-600"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kode Rak</label>
              <input
                type="text"
                value={shelfCode}
                onChange={(e) => setShelfCode(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono uppercase border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Eksemplar</label>
              <input
                type="number"
                min={1}
                max={99}
                value={totalCopies}
                onChange={(e) => setTotalCopies(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-700 mb-1">Penerbit</label>
              <input
                type="text"
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                placeholder="Pustaka Mandiri"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tahun</label>
              <input
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Halaman</label>
              <input
                type="number"
                value={pages}
                onChange={(e) => setPages(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>

          {!editingBook?.coverUrl && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Tema Sampul Tipografi</label>
              <select
                value={coverTone}
                onChange={(e) => setCoverTone(e.target.value as Book['coverTone'])}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-600"
              >
                {COVER_TONES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Sinopsis Ringkas</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Deskripsi singkat isi buku..."
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-md whitespace-nowrap"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md whitespace-nowrap"
            >
              {editingBook ? 'Simpan Perubahan' : 'Tambahkan Buku'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function BookDetailModal({
  book,
  onClose,
}: {
  book: Book | null;
  onClose: () => void;
}) {
  const { state, activeRole, activeMember, borrowBook, reserveBook, toggleBookmark, notify } = useLibrary();
  const [durationDays, setDurationDays] = useState(state.reportConfig.defaultLoanDays);

  if (!book) return null;

  const isBookmarked = activeMember.bookmarks.includes(book.id);
  const queueCount = state.reservations.filter(
    (r) => r.bookId === book.id && r.status === 'waiting'
  ).length;
  const memberHasLoan = state.loans.some(
    (l) => l.bookId === book.id && l.memberId === activeMember.id && l.status !== 'returned'
  );
  const memberHasReservation = state.reservations.some(
    (r) => r.bookId === book.id && r.memberId === activeMember.id && (r.status === 'waiting' || r.status === 'ready')
  );

  const handleBorrow = () => {
    const res = borrowBook(book.id, activeMember.id, durationDays);
    if (!res.ok) notify(res.message, 'warning');
    else onClose();
  };

  const handleReserve = () => {
    const res = reserveBook(book.id, activeMember.id);
    if (!res.ok) notify(res.message, 'warning');
    else onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-xl bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <span className="text-xs font-mono text-slate-500">
            {book.isbn} · Rak {book.shelfCode}
          </span>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-700 rounded"
            aria-label="Tutup detail buku"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 flex flex-col sm:flex-row gap-5">
          <BookCover book={book} size="lg" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500">
              {book.category} · {book.year} · {book.pages} hlm
            </p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900 leading-snug">{book.title}</h3>
            <p className="text-sm text-slate-600 mt-0.5">
              {book.author} · {book.publisher}
            </p>

            <p className="mt-3 text-sm text-slate-700 leading-relaxed">{book.description}</p>

            <div className="mt-4 pt-3 border-t border-slate-100 grid grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block">Stok Tersedia</span>
                <span
                  className={`font-mono font-semibold ${
                    book.availableCopies > 0 ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {book.availableCopies} / {book.totalCopies} eks.
                </span>
              </div>
              <div>
                <span className="text-slate-500 block">Total Dipinjam</span>
                <span className="font-mono font-semibold text-slate-900">{book.borrowCount}x</span>
              </div>
              <div>
                <span className="text-slate-500 block">Antrean</span>
                <span className="font-mono font-semibold text-slate-900">{queueCount} orang</span>
              </div>
            </div>

            {activeRole === 'member' && (
              <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => toggleBookmark(book.id, activeMember.id)}
                    className={`px-3 py-2 text-xs font-medium border rounded-md flex items-center gap-1.5 whitespace-nowrap ${
                      isBookmarked
                        ? 'border-blue-600 text-blue-700 bg-blue-50'
                        : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    {isBookmarked ? 'Disimpan' : 'Simpan'}
                  </button>

                  {book.availableCopies > 0 && !memberHasLoan && (
                    <select
                      value={durationDays}
                      onChange={(e) => setDurationDays(Number(e.target.value))}
                      className="px-2.5 py-2 text-xs border border-slate-200 rounded-md bg-white"
                      aria-label="Durasi peminjaman"
                    >
                      <option value={3}>3 hari</option>
                      <option value={7}>7 hari</option>
                      <option value={14}>14 hari</option>
                    </select>
                  )}
                </div>

                {memberHasLoan ? (
                  <span className="text-xs font-medium text-emerald-700 flex items-center gap-1">
                    <Check className="w-3.5 h-3.5" /> Sedang Anda pinjam
                  </span>
                ) : book.availableCopies > 0 ? (
                  <button
                    type="button"
                    onClick={handleBorrow}
                    className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md whitespace-nowrap"
                  >
                    Pinjam Sekarang
                  </button>
                ) : memberHasReservation ? (
                  <span className="text-xs font-medium text-amber-700 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" /> Anda dalam antrean
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={handleReserve}
                    className="px-4 py-2 text-xs font-medium text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-md whitespace-nowrap"
                  >
                    Masuk Antrean
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function QuickBorrowModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { state, activeRole, activeMember, borrowBook, notify } = useLibrary();
  const availableBooks = state.books.filter((b) => b.availableCopies > 0);
  const activeMembers = state.members.filter((m) => m.status === 'active');

  const [selectedBookId, setSelectedBookId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [durationDays, setDurationDays] = useState(state.reportConfig.defaultLoanDays);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setSelectedBookId(availableBooks[0]?.id ?? '');
      setSelectedMemberId(activeRole === 'member' ? activeMember.id : activeMembers[0]?.id ?? '');
      setDurationDays(state.reportConfig.defaultLoanDays);
      setError('');
    }
  }, [open, activeRole, activeMember.id]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = borrowBook(selectedBookId, selectedMemberId, durationDays);
    if (!res.ok) {
      setError(res.message);
      notify(res.message, 'warning');
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Catat Peminjaman Buku</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          {error && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">{error}</p>
          )}

          {activeRole === 'admin' && (
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Anggota Peminjam</label>
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-600"
              >
                {activeMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.memberCode})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Pilih Koleksi Tersedia</label>
            {availableBooks.length === 0 ? (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-3 py-2">
                Semua koleksi sedang dipinjam saat ini.
              </p>
            ) : (
              <select
                value={selectedBookId}
                onChange={(e) => setSelectedBookId(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-600"
              >
                {availableBooks.map((b) => (
                  <option key={b.id} value={b.id}>
                    [{b.shelfCode}] {b.title} (Sisa {b.availableCopies})
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Durasi Pinjam</label>
            <select
              value={durationDays}
              onChange={(e) => setDurationDays(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md bg-white focus:outline-none focus:border-blue-600"
            >
              <option value={3}>3 Hari</option>
              <option value={7}>7 Hari (Standar)</option>
              <option value={14}>14 Hari (Riset)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-md"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={availableBooks.length === 0}
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 disabled:opacity-50 rounded-md whitespace-nowrap"
            >
              Konfirmasi Pinjam
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function MemberFormModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { addMember } = useLibrary();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [maxQuota, setMaxQuota] = useState('4');

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;
    addMember({
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || '-',
      status: 'active',
      maxQuota: Math.max(1, parseInt(maxQuota, 10) || 4),
    });
    setName('');
    setEmail('');
    setPhone('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200">
          <h3 className="text-sm font-semibold text-slate-900">Daftarkan Anggota Baru</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Tutup">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3.5">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Nama Lengkap</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Contoh: Arif Wijaya"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="arif@meowlibrary.id"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Telepon</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0812-xxxx-xxxx"
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Kuota Pinjam</label>
              <input
                type="number"
                min={1}
                max={10}
                value={maxQuota}
                onChange={(e) => setMaxQuota(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
              />
            </div>
          </div>
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 rounded-md"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-medium text-white bg-blue-700 hover:bg-blue-800 rounded-md"
            >
              Simpan Anggota
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
