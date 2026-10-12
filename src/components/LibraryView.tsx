import React, { useState, useEffect } from 'react';
import { Book, BookCatalogItem } from '../types/book';
import { SAMPLE_BOOK } from '../data/sampleBook';
import { BookOpen, Sparkles, RefreshCw, Filter, Layers, CheckCircle } from 'lucide-react';

interface Props {
  onSelectBook: (book: Book) => void;
}

const DEFAULT_CATALOGUE_URL = 'https://raw.githubusercontent.com/semred/livre_alphabetisation/main/livres/catalogue.json';
const CACHED_BOOKS_KEY = 'pwa_cached_books_catalog_v2';

export const LibraryView: React.FC<Props> = ({ onSelectBook }) => {
  const [booksList, setBooksList] = useState<Book[]>([SAMPLE_BOOK]);
  const [selectedLevel, setSelectedLevel] = useState<'all' | 'debutant' | 'moyen' | 'avance'>('all');
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Load cached books on startup
  useEffect(() => {
    try {
      const cached = localStorage.getItem(CACHED_BOOKS_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setBooksList(parsed);
        }
      }
    } catch {}

    // Auto sync from GitHub in background
    fetchCatalogueFromGitHub();
  }, []);

  const fetchCatalogueFromGitHub = async () => {
    setIsLoadingRemote(true);
    try {
      const res = await fetch(DEFAULT_CATALOGUE_URL);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const catalogueItems: BookCatalogItem[] = data.livres || [];

      const githubRoot = DEFAULT_CATALOGUE_URL.replace(/\/livres\/catalogue\.json.*$/, '');
      const fetchedBooks: Book[] = [];

      for (const item of catalogueItems) {
        if (item.fichierJSON) {
          try {
            const bookRes = await fetch(`${githubRoot}/${item.fichierJSON}`);
            if (bookRes.ok) {
              const fullBook: Book = await bookRes.json();
              // Reconstruct asset full URLs if relative
              if (fullBook.couverture && !fullBook.couverture.startsWith('http') && !fullBook.couverture.startsWith('data:')) {
                fullBook.couverture = `${githubRoot}/${fullBook.couverture}`;
              }
              fullBook.pages = fullBook.pages.map(p => ({
                ...p,
                image: p.image && !p.image.startsWith('http') && !p.image.startsWith('data:') ? `${githubRoot}/${p.image}` : p.image,
                audioPage: p.audioPage && !p.audioPage.startsWith('http') && !p.audioPage.startsWith('data:') ? `${githubRoot}/${p.audioPage}` : p.audioPage,
              }));
              fetchedBooks.push(fullBook);
            }
          } catch {}
        }
      }

      if (fetchedBooks.length > 0) {
        // Merge with sample book ensuring no duplicates
        const merged = [...fetchedBooks];
        if (!merged.some(b => b.id === SAMPLE_BOOK.id)) {
          merged.push(SAMPLE_BOOK);
        }
        setBooksList(merged);
        localStorage.setItem(CACHED_BOOKS_KEY, JSON.stringify(merged));
        setLastSyncTime(new Date().toLocaleTimeString());
      }
    } catch (e) {
      console.log('GitHub catalogue sync info (offline or repo update):', e);
    } finally {
      setIsLoadingRemote(false);
    }
  };

  const filteredBooks = booksList.filter(book => {
    if (selectedLevel === 'all') return true;
    return book.niveau === selectedLevel;
  });

  return (
    <div className="max-w-4xl mx-auto pb-24" dir="rtl">
      {/* Friendly Welcome Card for Neo-Literates */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-md mb-8 relative overflow-hidden">
        <div className="relative z-10">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-xs rounded-full text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>مكتبة القراءة التفاعلية الميسرة</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black mb-2 tracking-tight">
            أَهْلاً بِكَ فِي مَكْتَبَتِكَ التَّفَاعُلِيَّةِ 📚
          </h1>

          <p className="text-emerald-100 text-sm sm:text-base max-w-xl leading-relaxed">
            اختر كتاباً من الرف للبدء في القراءة الممتعة، مع الاستماع لكل كلمة بالحركات والتمارين التفاعلية لتثبيت الفهم.
          </p>

          <div className="flex items-center gap-3 mt-5">
            <button
              onClick={() => onSelectBook(filteredBooks[0] || SAMPLE_BOOK)}
              className="flex items-center gap-2 bg-amber-400 hover:bg-amber-300 text-emerald-950 px-5 py-2.5 rounded-2xl font-black text-sm shadow-md transition active:scale-95"
            >
              <BookOpen className="w-4 h-4" />
              <span>ابدأ القراءة فوراً</span>
            </button>

            <button
              onClick={fetchCatalogueFromGitHub}
              disabled={isLoadingRemote}
              className="flex items-center gap-1.5 text-xs text-emerald-100 bg-white/10 hover:bg-white/20 px-3.5 py-2.5 rounded-2xl border border-white/20 transition"
              title="تحديث الكتب من المستودع"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRemote ? 'animate-spin' : ''}`} />
              <span>{isLoadingRemote ? 'جاري التحقق...' : 'تحديث الكتب الجديدة'}</span>
            </button>
          </div>
        </div>

        {/* Decorative blur elements */}
        <div className="absolute -left-12 -bottom-12 w-48 h-48 rounded-full bg-emerald-600/30 blur-2xl pointer-events-none" />
      </div>

      {/* Filter Tabs by Level */}
      <div className="flex items-center justify-between gap-3 mb-6 flex-wrap">
        <div className="flex items-center gap-1.5 p-1 bg-white rounded-2xl border border-slate-200 shadow-xs">
          {[
            { key: 'all', label: 'جميع الكتب' },
            { key: 'debutant', label: 'مبتدئ' },
            { key: 'moyen', label: 'متوسط' },
            { key: 'avance', label: 'متقدم' }
          ].map(lvl => (
            <button
              key={lvl.key}
              onClick={() => setSelectedLevel(lvl.key as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition ${
                selectedLevel === lvl.key
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {lvl.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-500 font-medium">
          متوفر في مكتبتك: <span className="font-bold text-emerald-900">{filteredBooks.length} كتب</span>
        </div>
      </div>

      {/* Grid of Books */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
        {filteredBooks.map((book) => (
          <div
            key={book.id}
            onClick={() => onSelectBook(book)}
            className="bg-white rounded-3xl p-4 shadow-xs hover:shadow-md border border-slate-200/80 hover:border-emerald-500 cursor-pointer transition-all duration-200 flex flex-col justify-between group active:scale-98"
          >
            <div>
              {/* Cover Image Container (Problem 8: Auto resized with object-contain) */}
              <div className="w-full h-48 bg-slate-50 rounded-2xl overflow-hidden flex items-center justify-center mb-3 border border-slate-100 p-2">
                <img
                  src={book.couvertureFileData || book.couverture || 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?w=400'}
                  alt={book.titre}
                  className="max-h-full max-w-full object-contain rounded-xl transition group-hover:scale-105 duration-300"
                  loading="lazy"
                />
              </div>

              <div className="flex items-center justify-between gap-2 mb-2">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                  book.niveau === 'debutant' ? 'bg-emerald-100 text-emerald-800' : book.niveau === 'avance' ? 'bg-purple-100 text-purple-800' : 'bg-sky-100 text-sky-800'
                }`}>
                  {book.niveau === 'debutant' ? 'مبتدئ' : book.niveau === 'avance' ? 'متقدم' : 'متوسط'}
                </span>

                <span className="text-xs text-slate-500 font-medium">
                  {book.pages.length} {book.pages.length === 1 ? 'صفحة' : 'صفحات'}
                </span>
              </div>

              <h3 className="font-reading text-xl sm:text-2xl font-bold text-slate-900 mb-1 leading-snug group-hover:text-emerald-800 transition">
                {book.titre}
              </h3>

              <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed mb-3">
                {book.description}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-emerald-800 font-bold">
              <span>اضغط للبدء</span>
              <span className="text-base group-hover:-translate-x-1 transition-transform">←</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-16 pt-8 border-t border-slate-200 text-center">
        <p className="text-xs text-slate-400">
          تطبيق مخصص لمتعلمي القراءة ومحو الأمية (PWA) — يعمل على الهواتف والأجهزة اللوحية
        </p>
      </div>
    </div>
  );
};
