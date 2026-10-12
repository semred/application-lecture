/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Book } from './types/book';
import { SAMPLE_BOOK } from './data/sampleBook';
import { LibraryView } from './components/LibraryView';
import { ReaderView } from './components/ReaderView';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { BookOpen, Library, Laptop } from 'lucide-react';

export default function App() {
  const [currentBook, setCurrentBook] = useState<Book>(SAMPLE_BOOK);
  const [activeView, setActiveView] = useState<'library' | 'reader'>('library');

  const handleSelectBook = (book: Book) => {
    setCurrentBook(book);
    setActiveView('reader');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans" dir="rtl">
      {/* Top Application Header - Clean and Learner Focused */}
      <header className="sticky top-0 z-40 bg-emerald-900 text-white shadow-md border-b border-emerald-800">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-2 sm:gap-3">
          {/* Logo & App Title */}
          <div 
            onClick={() => setActiveView('library')}
            className="flex items-center gap-2.5 cursor-pointer select-none"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-200 flex items-center justify-center text-emerald-950 font-black text-xl shadow-md">
              📖
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight leading-none">
                مَكْتَبَتِي التَّفَاعُلِيَّةُ
              </h1>
              <p className="text-[11px] text-emerald-200 font-medium">
                تعلّم القراءة بسهولة ومتعة
              </p>
            </div>
          </div>

          {/* Navigation for Learner & Direct Studio PC Link & PWA Install Button */}
          <div className="flex items-center gap-2 sm:gap-3">
            <nav className="flex items-center bg-emerald-950/60 p-1 rounded-2xl border border-emerald-700/50">
              <button
                onClick={() => setActiveView('library')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                  activeView === 'library'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                }`}
              >
                <Library className="w-4 h-4" />
                <span>المكتبة</span>
              </button>

              <button
                onClick={() => setActiveView('reader')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                  activeView === 'reader'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-emerald-200 hover:text-white hover:bg-emerald-800/50'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>القارئ</span>
              </button>
            </nav>

            {/* In-app PWA install trigger (Chromium & iOS guidance) */}
            <PWAInstallButton />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6">
        {activeView === 'library' && (
          <LibraryView
            onSelectBook={handleSelectBook}
          />
        )}

        {activeView === 'reader' && (
          <ReaderView
            book={currentBook}
            onBackToLibrary={() => setActiveView('library')}
          />
        )}
      </main>

      {/* Offline Alert Indicator */}
      <OfflineIndicator />
    </div>
  );
}
