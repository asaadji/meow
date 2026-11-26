import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { Book } from '../types/library';

export function BrandMark({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 28 28"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M5 7.5L9.5 11H18.5L23 7.5V21.5C23 22.8807 21.8807 24 20.5 24H7.5C6.11929 24 5 22.8807 5 21.5V7.5Z"
        className="fill-slate-900"
      />
      <path d="M5 7.5L5.5 4L10 9.5L5 7.5Z" className="fill-blue-600" />
      <path d="M23 7.5L22.5 4L18 9.5L23 7.5Z" className="fill-blue-600" />
      <circle cx="10.5" cy="15.5" r="1.25" className="fill-white" />
      <circle cx="17.5" cy="15.5" r="1.25" className="fill-white" />
      <path d="M12.75 18.25L14 19.25L15.25 18.25" stroke="white" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const TONE_CLASSES: Record<Book['coverTone'], string> = {
  cobalt: 'bg-blue-950 text-blue-50 border-blue-900',
  emerald: 'bg-emerald-950 text-emerald-50 border-emerald-900',
  indigo: 'bg-indigo-950 text-indigo-50 border-indigo-900',
  slate: 'bg-slate-900 text-slate-50 border-slate-800',
  charcoal: 'bg-neutral-900 text-neutral-50 border-neutral-800',
  zinc: 'bg-zinc-800 text-zinc-50 border-zinc-700',
};

export function BookCover({
  book,
  size = 'md',
}: {
  book: Book;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [imgFailed, setImgFailed] = useState(false);

  const dims =
    size === 'sm'
      ? 'w-10 h-14 rounded-sm'
      : size === 'lg'
      ? 'w-32 h-44 rounded-md'
      : 'w-16 h-22 rounded';

  if (book.coverUrl && !imgFailed) {
    return (
      <div className={`${dims} shrink-0 overflow-hidden border border-slate-200 bg-slate-100`}>
        <img
          src={book.coverUrl}
          alt={`Sampul buku ${book.title}`}
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="h-full w-full object-cover"
        />
      </div>
    );
  }

  return (
    <div
      className={`${dims} ${TONE_CLASSES[book.coverTone]} shrink-0 border flex flex-col justify-between p-2 select-none`}
    >
      <div className="flex items-center justify-between opacity-75">
        <span className="font-mono text-[8px] tracking-tight">{book.shelfCode}</span>
        <BookOpen className="w-2.5 h-2.5" />
      </div>
      <div>
        <p
          className={`font-display font-semibold leading-tight line-clamp-3 ${
            size === 'sm' ? 'text-[7px]' : size === 'lg' ? 'text-xs' : 'text-[9px]'
          }`}
        >
          {book.title}
        </p>
        {size !== 'sm' && (
          <p className="mt-1 text-[8px] opacity-70 truncate">{book.author}</p>
        )}
      </div>
    </div>
  );
}
