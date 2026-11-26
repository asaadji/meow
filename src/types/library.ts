export type UserRole = 'admin' | 'member';

export type BookCategory =
  | 'Sastra & Fiksi'
  | 'Teknologi & Sistem'
  | 'Arsitektur & Desain'
  | 'Sains & Botani'
  | 'Sejarah & Budaya'
  | 'Bisnis & Ekonomi';

export interface Book {
  id: string;
  isbn: string;
  title: string;
  author: string;
  publisher: string;
  year: number;
  category: BookCategory;
  shelfCode: string;
  totalCopies: number;
  availableCopies: number;
  pages: number;
  description: string;
  coverUrl?: string;
  coverTone: 'slate' | 'cobalt' | 'emerald' | 'indigo' | 'charcoal' | 'zinc';
  borrowCount: number;
  createdAt: string;
}

export interface Member {
  id: string;
  memberCode: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'suspended';
  maxQuota: number;
  joinedAt: string;
  bookmarks: string[];
}

export type LoanStatus = 'active' | 'overdue' | 'return_requested' | 'returned';

export interface LoanTransaction {
  id: string;
  loanCode: string;
  bookId: string;
  bookTitle: string;
  bookIsbn: string;
  memberId: string;
  memberName: string;
  memberCode: string;
  borrowedAt: string;
  dueAt: string;
  returnedAt?: string;
  extendedCount: number;
  status: LoanStatus;
  finePaid: number;
  notes?: string;
}

export interface Reservation {
  id: string;
  bookId: string;
  bookTitle: string;
  memberId: string;
  memberName: string;
  memberCode: string;
  requestedAt: string;
  status: 'waiting' | 'ready' | 'fulfilled' | 'cancelled';
}

export type ActivityActionType =
  | 'borrow'
  | 'return'
  | 'return_requested'
  | 'extend'
  | 'reserve'
  | 'fine_paid'
  | 'catalog_add'
  | 'catalog_update'
  | 'catalog_delete'
  | 'member_add'
  | 'member_update'
  | 'report_generated';

export interface ActivityLog {
  id: string;
  timestamp: string;
  actorName: string;
  actorRole: UserRole;
  actionType: ActivityActionType;
  summary: string;
  refCode: string;
}

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'all';

export interface AutoReportConfig {
  frequency: 'daily' | 'weekly' | 'monthly';
  autoIncludeOverdue: boolean;
  finePerDay: number;
  defaultLoanDays: number;
  lastGeneratedAt: string;
  recipientEmail: string;
}

export interface LibraryState {
  books: Book[];
  members: Member[];
  loans: LoanTransaction[];
  reservations: Reservation[];
  activities: ActivityLog[];
  reportConfig: AutoReportConfig;
  lastSyncedAt: string;
}
