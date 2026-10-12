import React, { useState, useEffect, useRef } from 'react';
import { Book, BookPage } from '../types/book';
import { speech } from '../utils/speech';
import { FillBlankExerciseComponent } from './exercises/FillBlankExercise';
import { QcmExerciseComponent } from './exercises/QcmExercise';
import { ImageClickExerciseComponent } from './exercises/ImageClickExercise';
import { WordOrderExerciseComponent } from './exercises/WordOrderExercise';
import { SequenceOrderExerciseComponent } from './exercises/SequenceOrderExercise';
import { 
  ArrowRight, ArrowLeft, Play, Pause, RotateCcw, 
  Volume2, BookOpen, Dumbbell, FileText, CheckCircle, 
  Sparkles, Settings2, Sliders
} from 'lucide-react';

interface Props {
  book: Book;
  onBackToLibrary: () => void;
}

export const ReaderView: React.FC<Props> = ({ book, onBackToLibrary }) => {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'text' | 'vocab' | 'exercises' | 'notes'>('text');
  const [isPlaying, setIsPlaying] = useState(false);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState<number | null>(null);
  
  // Customization controls (Problem 7)
  const [textSize, setTextSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('lg');
  const [readingRate, setReadingRate] = useState<number>(0.85); // 0.85 is ideal for Arabic learners
  const [showSettings, setShowSettings] = useState(false);

  // Audio HTML element for MP3 mode
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentPage: BookPage | undefined = book.pages[currentPageIndex];

  // Stop audio whenever page changes
  useEffect(() => {
    stopCurrentAudio();
    setHighlightedWordIndex(null);
  }, [currentPageIndex]);

  const stopCurrentAudio = () => {
    speech.stop();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsPlaying(false);
  };

  // Split text into words for word-by-word click and highlighting
  const words = currentPage ? currentPage.texteAffiche.trim().split(/\s+/).filter(Boolean) : [];

  // Calculate precise character ranges for real-time word boundary highlighting during speech
  const wordRanges = React.useMemo(() => {
    if (!currentPage?.texteAffiche) return [];
    const text = currentPage.texteAffiche;
    const regex = /\S+/g;
    const ranges: { start: number; end: number; index: number }[] = [];
    let match;
    let idx = 0;
    while ((match = regex.exec(text)) !== null) {
      ranges.push({
        start: match.index,
        end: match.index + match[0].length,
        index: idx++
      });
    }
    return ranges;
  }, [currentPage?.texteAffiche]);

  // Handle single word click (Problem 6)
  const handleWordClick = (word: string, index: number) => {
    speech.playClickSound();
    setHighlightedWordIndex(index);

    // If page is in MP3 WebMAUS mode and timestamps exist
    if (currentPage?.audioMode === 'mp3' && currentPage.mots && currentPage.mots[index] && audioRef.current) {
      audioRef.current.currentTime = currentPage.mots[index].debut;
      audioRef.current.play();
      setIsPlaying(true);
    } else {
      // Direct TTS word pronunciation
      speech.speakWord(word, readingRate);
    }

    setTimeout(() => {
      // Clear manual highlight after 1.5s
      if (!isPlaying) setHighlightedWordIndex(null);
    }, 1500);
  };

  // Toggle full page read-aloud
  const togglePlayAudio = () => {
    if (!currentPage) return;

    if (isPlaying) {
      stopCurrentAudio();
      return;
    }

    setIsPlaying(true);

    if (currentPage.audioMode === 'mp3' && (currentPage.audioFileData || currentPage.audioPage)) {
      // MP3 Mode
      if (audioRef.current) {
        audioRef.current.play().catch(err => {
          console.warn('MP3 play error, falling back to TTS:', err);
          fallbackToTTS();
        });
      }
    } else {
      // TTS Mode (Native browser speech)
      fallbackToTTS();
    }
  };

  const fallbackToTTS = () => {
    if (!currentPage) return;
    setHighlightedWordIndex(0);

    speech.speakText(
      currentPage.texteAffiche,
      readingRate,
      () => {
        // onEnd
        setIsPlaying(false);
        setHighlightedWordIndex(null);
      },
      (charIndex) => {
        // Precise real-time word tracking as speech progresses
        const matched = wordRanges.find(r => charIndex >= r.start && charIndex < r.end)
          || wordRanges.find(r => charIndex >= r.start);
        if (matched) {
          setHighlightedWordIndex(matched.index);
        }
      },
      () => {
        setIsPlaying(false);
      }
    );
  };

  // WebMAUS MP3 timeupdate handler
  const handleAudioTimeUpdate = () => {
    if (!audioRef.current || !currentPage?.mots || currentPage.mots.length === 0) return;
    const time = audioRef.current.currentTime;
    const matchIndex = currentPage.mots.findIndex(m => time >= m.debut && time < m.fin);
    if (matchIndex !== -1) {
      setHighlightedWordIndex(matchIndex);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
    setHighlightedWordIndex(null);
  };

  const handleNextPage = () => {
    if (currentPageIndex < book.pages.length - 1) {
      setCurrentPageIndex(prev => prev + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(prev => prev - 1);
    }
  };

  // Font size mapping for high readability (Problem 7)
  const textSizeClasses = {
    sm: 'text-lg sm:text-xl leading-loose',
    md: 'text-xl sm:text-2xl leading-loose',
    lg: 'text-2xl sm:text-3xl leading-[2.2]',
    xl: 'text-3xl sm:text-4xl leading-[2.4]'
  };

  if (!currentPage) {
    return (
      <div className="p-8 text-center text-slate-600 bg-white rounded-2xl shadow-sm">
        <p className="text-xl">لا توجد صفحات في هذا الكتاب بعد.</p>
        <button onClick={onBackToLibrary} className="mt-4 px-4 py-2 bg-emerald-700 text-white rounded-xl">
          العودة للمكتبة
        </button>
      </div>
    );
  }

  const audioSrc = currentPage.audioFileData || currentPage.audioPage;

  return (
    <div className="max-w-3xl mx-auto pb-24" dir="rtl">
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between mb-4 bg-white/90 backdrop-blur-xs p-3 sm:p-4 rounded-2xl shadow-xs border border-emerald-900/10">
        <button
          onClick={onBackToLibrary}
          className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-900 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-2 rounded-xl transition"
        >
          <ArrowRight className="w-4 h-4" />
          <span>المكتبة</span>
        </button>

        <div className="text-center">
          <span className="text-xs sm:text-sm font-bold text-emerald-900 bg-emerald-100/70 px-3 py-1 rounded-full">
            صفحة {currentPageIndex + 1} من {book.pages.length}
          </span>
        </div>

        {/* Accessibility & Speed Controls Toggle */}
        <button
          onClick={() => setShowSettings(!showSettings)}
          className={`flex items-center gap-1 text-xs sm:text-sm font-semibold px-3 py-2 rounded-xl border transition ${
            showSettings ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200'
          }`}
          title="خيارات الخط والسرعة"
        >
          <Settings2 className="w-4 h-4" />
          <span className="hidden sm:inline">حجم الخط والسرعة</span>
        </button>
      </div>

      {/* Floating Settings Drawer (Problem 7) */}
      {showSettings && (
        <div className="bg-white border-2 border-emerald-600/30 rounded-2xl p-4 sm:p-5 mb-5 shadow-md animate-fadeIn">
          <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
            <h4 className="font-bold text-emerald-950 text-sm flex items-center gap-2">
              <Sliders className="w-4 h-4 text-emerald-700" />
              <span>إعدادات القراءة وسهولة الوصول (للمتعلمين):</span>
            </h4>
            <button onClick={() => setShowSettings(false)} className="text-xs text-slate-400 hover:text-slate-600">
              إغلاق ✕
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Font Size Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">حجم خط القراءة:</label>
              <div className="flex gap-1.5">
                {[
                  { key: 'sm', label: 'صغير (A)' },
                  { key: 'md', label: 'متوسط (A+)' },
                  { key: 'lg', label: 'كبير (A++)' },
                  { key: 'xl', label: 'كبير جداً' }
                ].map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => setTextSize(opt.key as any)}
                    className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg border transition ${
                      textSize === opt.key ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reading Speed Selector (Problem 7) */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-2">
                سرعة النطق الصوتي: <span className="text-emerald-700 font-extrabold">{readingRate}x</span>
              </label>
              <div className="flex gap-1.5">
                {[
                  { rate: 0.65, label: '0.6x بطيء' },
                  { rate: 0.85, label: '0.85x تعليمي' },
                  { rate: 1.0, label: '1.0x عادي' },
                  { rate: 1.2, label: '1.2x سريع' }
                ].map(opt => (
                  <button
                    key={opt.rate}
                    onClick={() => setReadingRate(opt.rate)}
                    className={`flex-1 py-1.5 px-2 text-xs font-bold rounded-lg border transition ${
                      readingRate === opt.rate ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Audio Diagnostic and Test Button */}
            <div className="sm:col-span-2 pt-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={() => {
                  speech.playSuccessSound();
                  setTimeout(() => {
                    speech.speakText('أَهْلاً بِكَ! الصَّوْتُ يَعْمَلُ بِنَجَاحٍ');
                  }, 150);
                }}
                className="w-full sm:w-auto flex items-center justify-center gap-2 py-2 px-4 bg-amber-400 hover:bg-amber-500 text-emerald-950 font-black rounded-xl text-xs sm:text-sm shadow-xs transition active:scale-95"
              >
                <Volume2 className="w-4 h-4" />
                <span>🔊 اضغط هنا لتجربة الصوت</span>
              </button>

              <div className="text-xs font-semibold text-emerald-800">
                <span>✅ صوت المتصفح المدمج مجاني وبدون إنترنت</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Reader Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/80 mb-6">
        {/* Page Image (Problem 8: Resized automatically to fit reserved area without overflow or distortion) */}
        {currentPage.image && (
          <div className="w-full h-48 sm:h-64 md:h-72 bg-slate-50 rounded-2xl overflow-hidden flex items-center justify-center p-2 mb-5 border border-slate-100">
            <img
              src={currentPage.imageFileData || currentPage.image}
              alt={currentPage.titreSection || 'صورة الدرس'}
              className="max-h-full max-w-full object-contain rounded-xl shadow-xs"
              loading="lazy"
            />
          </div>
        )}

        {/* Section Title */}
        {currentPage.titreSection && (
          <h2 className="text-xl sm:text-2xl font-black text-emerald-950 text-center mb-4 tracking-tight">
            {currentPage.titreSection}
          </h2>
        )}

        {/* Guidance tip for neo-literate learners */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-amber-800 bg-amber-50/80 border border-amber-200/60 rounded-xl py-1.5 px-3 mb-5 w-fit mx-auto">
          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
          <span>نصيحة: إضغط على أي كلمة لسماع نطقها فوراً بالحركات</span>
        </div>

        {/* Vocalized Text with word-by-word interactive clicks (Problem 6) */}
        <div className={`font-reading text-justify p-4 sm:p-6 bg-emerald-50/20 rounded-2xl border border-emerald-600/10 mb-6 select-text text-slate-900 ${textSizeClasses[textSize]}`}>
          {words.map((word, idx) => {
            const isHighlighted = highlightedWordIndex === idx;
            return (
              <span
                key={idx}
                onClick={() => handleWordClick(word, idx)}
                className={`inline-block mx-1 px-1.5 py-0.5 rounded-lg cursor-pointer transition-all duration-150 active:scale-95 hover:bg-emerald-100 hover:text-emerald-950 ${
                  isHighlighted 
                    ? 'bg-amber-300 text-amber-950 font-bold shadow-xs scale-105 ring-2 ring-amber-400' 
                    : ''
                }`}
                title="إضغط لسماع الكلمة"
              >
                {word}
              </span>
            );
          })}
        </div>

        {/* Main Audio Controls Bar */}
        <div className="flex items-center justify-center gap-4 pt-2 border-t border-slate-100">
          <button
            onClick={handlePrevPage}
            disabled={currentPageIndex === 0}
            className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="الصفحة السابقة"
          >
            <ArrowRight className="w-6 h-6" />
          </button>

          <button
            onClick={togglePlayAudio}
            className={`w-16 h-16 rounded-full flex items-center justify-center text-white shadow-lg transition-transform active:scale-95 ${
              isPlaying ? 'bg-amber-500 hover:bg-amber-600' : 'bg-emerald-700 hover:bg-emerald-800'
            }`}
            title={isPlaying ? 'إيقاف مؤقت' : 'قراءة الصفحة كاملة بالصوت'}
          >
            {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 mr-1" />}
          </button>

          <button
            onClick={handleNextPage}
            disabled={currentPageIndex === book.pages.length - 1}
            className="w-12 h-12 rounded-full flex items-center justify-center bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition"
            title="الصفحة التالية"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        </div>

        {/* Hidden MP3 element if using MP3 mode */}
        {audioSrc && (
          <audio
            ref={audioRef}
            src={audioSrc}
            onTimeUpdate={handleAudioTimeUpdate}
            onEnded={handleAudioEnded}
            className="hidden"
          />
        )}
      </div>

      {/* Interactive Tabs Header */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
        <button
          onClick={() => setActiveTab('text')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm transition whitespace-nowrap ${
            activeTab === 'text' ? 'bg-emerald-800 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>نص الصفحة</span>
        </button>

        <button
          onClick={() => setActiveTab('vocab')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm transition whitespace-nowrap ${
            activeTab === 'vocab' ? 'bg-emerald-800 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>المفردات والشرح ({currentPage.vocabulaire.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('exercises')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm transition whitespace-nowrap ${
            activeTab === 'exercises' ? 'bg-emerald-800 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Dumbbell className="w-4 h-4" />
          <span>التمارين التفاعلية ({currentPage.exercices.length})</span>
        </button>

        {currentPage.notes && (
          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl font-bold text-sm transition whitespace-nowrap ${
              activeTab === 'notes' ? 'bg-emerald-800 text-white shadow-sm' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>ملاحظات وإرشادات</span>
          </button>
        )}
      </div>

      {/* Tab 1: Vocabulary */}
      {activeTab === 'vocab' && (
        <div className="space-y-3">
          {currentPage.vocabulaire.length === 0 ? (
            <div className="bg-white p-6 rounded-2xl text-center text-slate-400">
              لا توجد مفردات مسجلة لهذه الصفحة.
            </div>
          ) : (
            currentPage.vocabulaire.map((v, i) => (
              <div key={i} className="bg-white p-4 sm:p-5 rounded-2xl border-r-4 border-emerald-600 shadow-xs flex items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-reading font-bold text-xl sm:text-2xl text-emerald-950">{v.mot}</h4>
                    <button
                      onClick={() => speech.speakWord(v.mot, readingRate)}
                      className="p-1 rounded-full text-emerald-700 hover:bg-emerald-50"
                      title="استمع للكلمة"
                    >
                      <Volume2 className="w-5 h-5" />
                    </button>
                  </div>
                  <p className="text-sm text-slate-700 leading-relaxed">{v.traduction}</p>
                  {v.synonymes && v.synonymes.length > 0 && (
                    <p className="text-xs text-slate-500">
                      🔄 مرادفات: <span className="font-semibold text-emerald-800">{v.synonymes.join(' ، ')}</span>
                    </p>
                  )}
                  {v.exemple && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg italic">
                      💬 مثال: {v.exemple}
                    </p>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab 2: Exercises (Fill Blank, QCM, Image Click, Word Order, Sequence Order) */}
      {activeTab === 'exercises' && (
        <div>
          {currentPage.exercices.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl text-center text-slate-400">
              لا توجد تمارين تفاعلية مضافة لهذه الصفحة.
            </div>
          ) : (
            currentPage.exercices.map((ex, i) => {
              if (ex.type === 'fillblank') {
                return <FillBlankExerciseComponent key={ex.id || i} exercise={ex} />;
              }
              if (ex.type === 'qcm') {
                return <QcmExerciseComponent key={ex.id || i} exercise={ex} />;
              }
              if (ex.type === 'image_click') {
                return <ImageClickExerciseComponent key={ex.id || i} exercise={ex} />;
              }
              if (ex.type === 'word_order') {
                return <WordOrderExerciseComponent key={ex.id || i} exercise={ex} />;
              }
              if (ex.type === 'sequence_order') {
                return <SequenceOrderExerciseComponent key={ex.id || i} exercise={ex} />;
              }
              return null;
            })
          )}
        </div>
      )}

      {/* Tab 3: Notes */}
      {activeTab === 'notes' && (
        <div className="bg-white p-6 rounded-2xl shadow-xs border border-slate-200">
          <h4 className="font-bold text-emerald-950 mb-3 text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-700" />
            <span>إرشادات تربوية ومعلومات إضافية:</span>
          </h4>
          <p className="text-slate-700 leading-relaxed font-reading text-lg">
            {currentPage.notes}
          </p>
        </div>
      )}

      {/* Floating Bottom Navigation Bar for Mobile */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 p-3 shadow-lg z-40 flex items-center justify-around max-w-lg mx-auto sm:rounded-t-2xl">
        <button
          onClick={handlePrevPage}
          disabled={currentPageIndex === 0}
          className="flex items-center gap-1 text-xs sm:text-sm font-bold text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-2 rounded-xl hover:bg-slate-100"
        >
          <ArrowRight className="w-4 h-4" />
          <span>السابق</span>
        </button>

        <span className="text-xs font-bold text-emerald-900 bg-emerald-100 px-3 py-1 rounded-full">
          {currentPageIndex + 1} / {book.pages.length}
        </span>

        <button
          onClick={handleNextPage}
          disabled={currentPageIndex === book.pages.length - 1}
          className="flex items-center gap-1 text-xs sm:text-sm font-bold text-slate-700 disabled:opacity-30 disabled:cursor-not-allowed px-3 py-2 rounded-xl hover:bg-slate-100"
        >
          <span>التالي</span>
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
