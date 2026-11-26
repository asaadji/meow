import { DAILY_FINE_IDR } from '../data/seedData';
import { LoanTransaction } from '../types/library';

export function formatCurrencyIDR(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso));
}

export function formatTimeClock(iso: string): string {
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(new Date(iso));
}

export function formatRelativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const diffSec = Math.max(0, Math.floor(diffMs / 1000));
  if (diffSec < 15) return 'Baru saja';
  if (diffSec < 60) return `${diffSec} dtk lalu`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} mnt lalu`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} jam lalu`;
  const diffDays = Math.floor(diffHr / 24);
  return `${diffDays} hari lalu`;
}

export function calculateOverdueDays(dueAtIso: string, referenceIso?: string): number {
  const refTime = referenceIso ? new Date(referenceIso).getTime() : Date.now();
  const dueTime = new Date(dueAtIso).getTime();
  if (refTime <= dueTime) return 0;
  return Math.ceil((refTime - dueTime) / (24 * 3600 * 1000));
}

export function calculateLoanFine(loan: LoanTransaction, finePerDay = DAILY_FINE_IDR): number {
  if (loan.status === 'returned') {
    return loan.finePaid;
  }
  const overdueDays = calculateOverdueDays(loan.dueAt);
  return overdueDays * finePerDay;
}

export function isLoanOverdue(loan: LoanTransaction): boolean {
  if (loan.status === 'returned') return false;
  return Date.now() > new Date(loan.dueAt).getTime();
}

export function downloadCsvFile(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const csvContent = [
    headers.map(escapeCell).join(','),
    ...rows.map((r) => r.map(escapeCell).join(',')),
  ].join('\n');

  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
