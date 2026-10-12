import React, { useState, useEffect } from 'react';
import { Book, BookPage, Exercise, VocabItem } from '../types/book';
import { 
  saveDraftLocally, loadDraftLocally, downloadCompleteZip, 
  downloadCompleteBundle, importBookFile, fileToBase64 
} from '../utils/storage';
import { 
  Plus, Trash2, Save, Download, Upload, Eye, FileArchive, 
  Image as ImageIcon, Music, HelpCircle, FileText, CheckCircle2, 
  Sparkles, RefreshCw, Send, AlertCircle
} from 'lucide-react';

interface Props {
  currentBook: Book;
  onUpdateBook: (book: Book) => void;
  onPreviewBook: () => void;
}

export const StudioView: React.FC<Props> = ({ currentBook, onUpdateBook, onPreviewBook }) => {
  const [book, setBook] = useState<Book>(currentBook);
  const [activePageIndex, setActivePageIndex] = useState<number>(0);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // GitHub export state
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [ghToken, setGhToken] = useState('');
  const [ghOwner, setGhOwner] = useState('');
  const [ghRepo, setGhRepo] = useState('');
  const [ghBranch, setGhBranch] = useState('main');
  const [ghPath, setGhPath] = useState('livres');
  const [ghStatus, setGhStatus] = useState<string | null>(null);
  const [isGhLoading, setIsGhLoading] = useState(false);

  // Sync with prop if it changes
  useEffect(() => {
    setBook(currentBook);
  }, [currentBook]);

  // Load GitHub config from local storage on mount
  useEffect(() => {
    try {
      const savedConfig = localStorage.getItem('github_sync_config');
      if (savedConfig) {
        const parsed = JSON.parse(savedConfig);
        setGhToken(parsed.token || '');
        setGhOwner(parsed.owner || '');
        setGhRepo(parsed.repo || '');
        setGhBranch(parsed.branch || 'main');
        setGhPath(parsed.path || 'livres');
      }
    } catch {}
  }, []);

  const showNotice = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleBookChange = <K extends keyof Book>(key: K, value: Book[K]) => {
    const updated = { ...book, [key]: value };
    setBook(updated);
    onUpdateBook(updated);
    saveDraftLocally(updated);
  };

  // Cover image upload
  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToBase64(file);
      handleBookChange('couverture', dataUrl);
      handleBookChange('couvertureFileData', dataUrl);
      showNotice('تم تحميل صورة الغلاف بنجاح');
    } catch {
      showNotice('فشل تحميل الصورة', 'error');
    }
  };

  // Add Page
  const handleAddPage = () => {
    const newPageNum = book.pages.length + 1;
    const newPage: BookPage = {
      numero: newPageNum,
      titreSection: `درس ${newPageNum}`,
      texteAffiche: '',
      audioMode: 'tts',
      mots: [],
      vocabulaire: [],
      exercices: []
    };
    const updatedPages = [...book.pages, newPage];
    handleBookChange('pages', updatedPages);
    setActivePageIndex(updatedPages.length - 1);
    showNotice(`تمت إضافة صفحة جديدة (${newPageNum})`);
  };

  // Delete Page
  const handleDeletePage = (index: number) => {
    if (book.pages.length <= 1) {
      alert('يجب أن يحتوي الكتاب على صفحة واحدة على الأقل');
      return;
    }
    if (!confirm(`هل أنت متأكد من حذف الصفحة رقم ${index + 1}؟`)) return;

    const filtered = book.pages.filter((_, idx) => idx !== index).map((p, idx) => ({
      ...p,
      numero: idx + 1
    }));
    handleBookChange('pages', filtered);
    setActivePageIndex(Math.max(0, index - 1));
    showNotice('تم حذف الصفحة');
  };

  // Update current active page
  const handlePageChange = <K extends keyof BookPage>(key: K, value: BookPage[K]) => {
    const updatedPages = [...book.pages];
    if (!updatedPages[activePageIndex]) return;
    updatedPages[activePageIndex] = { ...updatedPages[activePageIndex], [key]: value };
    handleBookChange('pages', updatedPages);
  };

  // Page image upload
  const handlePageImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToBase64(file);
      handlePageChange('image', dataUrl);
      handlePageChange('imageFileData', dataUrl);
      showNotice('تم تحديث صورة الصفحة');
    } catch {
      showNotice('فشل تحميل الصورة', 'error');
    }
  };

  // Page audio upload
  const handlePageAudioUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await fileToBase64(file);
      handlePageChange('audioPage', dataUrl);
      handlePageChange('audioFileData', dataUrl);
      handlePageChange('audioMode', 'mp3');
      showNotice('تم تحميل ملف الصوت MP3');
    } catch {
      showNotice('فشل تحميل الملف الصوتي', 'error');
    }
  };

  // Parse WebMAUS CSV
  const handleWebMausCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.trim().split('\n');
      const sampleRate = 44100;
      const mots = [];
      const texteBrut = [];

      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(';');
        if (cols.length < 6) continue;

        const token = parseInt(cols[2]);
        const ort = cols[5]?.trim();

        if (token >= 0 && ort !== '' && ort !== '<usb>') {
          const begin = parseInt(cols[0]);
          const duration = parseInt(cols[1]);
          const debut = parseFloat((begin / sampleRate).toFixed(3));
          const fin = parseFloat(((begin + duration) / sampleRate).toFixed(3));

          mots.push({ texte: ort, debut, fin });
          texteBrut.push(ort);
        }
      }

      handlePageChange('mots', mots);
      if (!currentPage?.texteAffiche) {
        handlePageChange('texteAffiche', texteBrut.join(' '));
      }
      showNotice(`تم استخراج ${mots.length} كلمة وتوقيت من ملف WebMAUS`);
    };
    reader.readAsText(file);
  };

  // Add Vocabulary Item
  const handleAddVocab = () => {
    const newVocab: VocabItem = { mot: '', traduction: '', synonymes: [], exemple: '' };
    handlePageChange('vocabulaire', [...(currentPage?.vocabulaire || []), newVocab]);
  };

  const handleUpdateVocab = (index: number, updated: VocabItem) => {
    const list = [...(currentPage?.vocabulaire || [])];
    list[index] = updated;
    handlePageChange('vocabulaire', list);
  };

  const handleDeleteVocab = (index: number) => {
    const list = (currentPage?.vocabulaire || []).filter((_, i) => i !== index);
    handlePageChange('vocabulaire', list);
  };

  // Add Exercise
  const handleAddExercise = (type: Exercise['type']) => {
    let newEx: Exercise;
    const id = `exo-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    if (type === 'fillblank') {
      newEx = {
        id,
        type: 'fillblank',
        titre: 'أكمل الفراغات بالكلمة المناسبة:',
        texte: 'الجُمْلَةُ مَعَ ___ ثُمَّ الفَرَاغِ الثَّانِي ___ .',
        reponses: ['الفَرَاغِ الأَوَّلِ', 'أَحْسَنْتَ'],
        leurres: ['خَاطِئٌ'],
        motsMelanges: ['الفَرَاغِ الأَوَّلِ', 'أَحْسَنْتَ', 'خَاطِئٌ']
      };
    } else if (type === 'qcm') {
      newEx = {
        id,
        type: 'qcm',
        titre: 'اختر الإجابة الصحيحة:',
        question: 'مَا هُوَ السُّؤَالُ المَطْلُوبُ؟',
        options: ['الخِيَارُ الأَوَّلُ (صَحِيحٌ)', 'الخِيَارُ الثَّانِي', 'الخِيَارُ الثَّالِثُ'],
        bonneReponseIndex: 0,
        explication: 'توضيح الإجابة الصحيحة.'
      };
    } else if (type === 'image_click') {
      newEx = {
        id,
        type: 'image_click',
        titre: 'استمع واختر الصورة:',
        instruction: 'إِضْغَطْ عَلَى الصُّورَةِ المُنَاسِبَةِ',
        images: [
          { id: 'img-1', url: 'https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?w=300', label: 'تُفَّاحَة' },
          { id: 'img-2', url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=300', label: 'شَطِيرَة' }
        ],
        bonneImageId: 'img-1'
      };
    } else if (type === 'word_order') {
      newEx = {
        id,
        type: 'word_order',
        titre: 'رتّب الكلمات لتكوين جملة:',
        phraseCorrecte: 'العَقْلُ السَّلِيمُ فِي الجِسْمِ السَّلِيمِ',
        motsMelanges: ['الجِسْمِ', 'السَّلِيمُ', 'العَقْلُ', 'فِي', 'السَّلِيمِ']
      };
    } else {
      newEx = {
        id,
        type: 'sequence_order',
        titre: 'رتّب الخطوات بالتسلسل الصحيح:',
        consigne: 'رتّب الخطوات من البداية إلى النهاية:',
        elements: [
          { id: 's-1', texte: 'الخُطْوَةُ الأُولَى', ordreCorrect: 1 },
          { id: 's-2', texte: 'الخُطْوَةُ الثَّانِيَةُ', ordreCorrect: 2 },
          { id: 's-3', texte: 'الخُطْوَةُ الثَّالِثَةُ', ordreCorrect: 3 }
        ]
      };
    }

    handlePageChange('exercices', [...(currentPage?.exercices || []), newEx]);
    showNotice(`تمت إضافة تمرين جديد (${type})`);
  };

  const handleDeleteExercise = (index: number) => {
    const list = (currentPage?.exercices || []).filter((_, i) => i !== index);
    handlePageChange('exercices', list);
  };

  // Export & Import Handlers (Problem 1)
  const handleExportZip = async () => {
    setIsExportingZip(true);
    try {
      await downloadCompleteZip(book);
      showNotice('تم تصدير حزمة ZIP بنجاح');
    } catch (e: any) {
      showNotice('خطأ أثناء إنشاء حزمة ZIP: ' + e.message, 'error');
    } finally {
      setIsExportingZip(false);
    }
  };

  const handleExportBundle = () => {
    downloadCompleteBundle(book);
    showNotice('تم تنزيل ملف المشروع المتكامل (.book.json)');
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      showNotice('جاري استيراد وفك ضغط المشروع...', 'info');
      const importedBook = await importBookFile(file);
      setBook(importedBook);
      onUpdateBook(importedBook);
      saveDraftLocally(importedBook);
      setActivePageIndex(0);
      showNotice(`تم استيراد الكتاب بنجاح: "${importedBook.titre}"`);
    } catch (err: any) {
      showNotice('خطأ أثناء الاستيراد: ' + err.message, 'error');
    }
  };

  const handleSaveToGitHub = async () => {
    if (!ghToken || !ghOwner || !ghRepo) {
      setGhStatus('يرجى ملء جميع الحقول المطلوبة (Token, Owner, Repo)');
      return;
    }

    // Save config for next time
    localStorage.setItem('github_sync_config', JSON.stringify({
      token: ghToken, owner: ghOwner, repo: ghRepo, branch: ghBranch, path: ghPath
    }));

    setIsGhLoading(true);
    setGhStatus('جاري إرسال الملفات إلى GitHub...');

    try {
      const headers = {
        'Authorization': `token ${ghToken.trim()}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      };

      const bookId = book.id || 'mon-livre';
      const targetFilePath = `${ghPath}/${bookId}/livre.json`;
      const apiUrl = `https://api.github.com/repos/${ghOwner.trim()}/${ghRepo.trim()}/contents/${targetFilePath}`;

      // Check existing SHA
      let sha: string | undefined;
      const getRes = await fetch(apiUrl, { headers });
      if (getRes.ok) {
        const existingData = await getRes.json();
        sha = existingData.sha;
      }

      const contentBase64 = btoa(unescape(encodeURIComponent(JSON.stringify(book, null, 2))));
      const putRes = await fetch(apiUrl, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: `Update book: ${book.titre} (${bookId})`,
          content: contentBase64,
          branch: ghBranch || 'main',
          sha
        })
      });

      if (!putRes.ok) {
        const errJson = await putRes.json();
        throw new Error(errJson.message || `HTTP ${putRes.status}`);
      }

      setGhStatus('✅ تم رفع وتحديث الكتاب على GitHub بنجاح!');
      showNotice('تم التصدير إلى GitHub بنجاح!');
    } catch (e: any) {
      setGhStatus(`❌ خطأ: ${e.message}`);
    } finally {
      setIsGhLoading(false);
    }
  };

  const currentPage = book.pages[activePageIndex];

  return (
    <div className="max-w-4xl mx-auto pb-24" dir="rtl">
      {/* Notification Toast */}
      {notification && (
        <div className={`fixed top-4 left-1/2 -translate-x-1/2 z-50 px-5 py-3 rounded-2xl shadow-xl font-bold text-sm flex items-center gap-2 animate-fadeIn ${
          notification.type === 'error' ? 'bg-red-600 text-white' : notification.type === 'info' ? 'bg-sky-600 text-white' : 'bg-emerald-700 text-white'
        }`}>
          {notification.type === 'error' ? <AlertCircle className="w-5 h-5" /> : <CheckCircle2 className="w-5 h-5" />}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Main Studio Header & Action Bar (Problem 1) */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200/80 mb-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-emerald-950 flex items-center gap-2">
              <span>✍️</span>
              <span>استوديو المؤلف — إنشاء وتعديل الكتب التفاعلية</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              أضف النصوص المشكولة، التسجيلات، المفردات والتمارين التفاعلية مع دعم الحفظ الشامل.
            </p>
          </div>

          <button
            onClick={onPreviewBook}
            className="flex items-center gap-2 bg-emerald-800 hover:bg-emerald-900 text-white px-4 py-2.5 rounded-2xl font-bold text-sm shadow-md transition active:scale-95"
          >
            <Eye className="w-4 h-4" />
            <span>معاينة حية في القارئ</span>
          </button>
        </div>

        {/* Universal Backup & Export / Import Toolbar (Addresses Problem 1) */}
        <div className="mt-4 pt-2">
          <div className="text-xs font-bold text-emerald-900 mb-2.5 flex items-center gap-1.5">
            <Save className="w-4 h-4 text-emerald-700" />
            <span>أدوات الحفظ والاستيراد الشامل على الحاسوب (حل مشكلة فقدان الملفات):</span>
          </div>

          <div className="flex flex-wrap gap-2.5">
            {/* Download Full ZIP */}
            <button
              onClick={handleExportZip}
              disabled={isExportingZip}
              className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition"
              title="تنزيل أرشيف ZIP يحتوي على livre.json والصور والصوتيات كاملة"
            >
              <FileArchive className="w-4 h-4" />
              <span>{isExportingZip ? 'جاري ضغط ZIP...' : 'تحميل حزمة كاملة (.ZIP)'}</span>
            </button>

            {/* Single Portable File */}
            <button
              onClick={handleExportBundle}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition"
              title="ملف مشروع متكامل بصيغة JSON يحتوي على جميع الوسائط مدمجة"
            >
              <Download className="w-4 h-4" />
              <span>حفظ كملف مشروع (.JSON)</span>
            </button>

            {/* Import from ZIP or JSON */}
            <label className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold border border-slate-300 cursor-pointer shadow-xs transition">
              <Upload className="w-4 h-4 text-slate-600" />
              <span>استيراد مشروع كامل (ZIP أو JSON)</span>
              <input
                type="file"
                accept=".zip,.json"
                className="hidden"
                onChange={handleImportFile}
              />
            </label>

            {/* GitHub Sync */}
            <button
              onClick={() => setShowGitHubModal(true)}
              className="flex items-center gap-1.5 bg-slate-900 hover:bg-black text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition mr-auto"
            >
              <span>🚀 تصدير إلى GitHub</span>
            </button>
          </div>
        </div>
      </div>

      {/* Book General Info Card */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/80 mb-6">
        <h2 className="text-lg font-bold text-emerald-950 mb-4 flex items-center gap-2">
          <span>📖</span>
          <span>معلومات الكتاب الأساسية:</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">عنوان الكتاب *</label>
            <input
              type="text"
              value={book.titre}
              onChange={(e) => handleBookChange('titre', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-reading text-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              placeholder="مثال: التَّغْذِيَةُ السَّلِيمَةُ"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              المعرّف الفريد (ID المجلد) * <span className="text-slate-400 font-normal">(أحرف إنجليزية بدون مسافات)</span>
            </label>
            <input
              type="text"
              value={book.id}
              onChange={(e) => handleBookChange('id', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-mono text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              placeholder="ex: taghdia-tifl"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">المؤلف / فريق الإعداد</label>
            <input
              type="text"
              value={book.auteur || ''}
              onChange={(e) => handleBookChange('auteur', e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              placeholder="فريق محو الأمية"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">مستوى الصعوبة</label>
            <select
              value={book.niveau}
              onChange={(e) => handleBookChange('niveau', e.target.value as any)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            >
              <option value="debutant">مبتدئ (حروف وكلمات قصيرة)</option>
              <option value="moyen">متوسط (جمل وفقرات مع التشكيل)</option>
              <option value="avance">متقدم (نصوص كاملة وقصص)</option>
            </select>
          </div>
        </div>

        {/* Cover Image */}
        <div className="mb-4">
          <label className="block text-xs font-bold text-slate-700 mb-1.5">صورة الغلاف (Couverture)</label>
          <div className="flex items-center gap-4">
            {book.couverture && (
              <img
                src={book.couvertureFileData || book.couverture}
                alt="غلاف"
                className="w-20 h-28 object-contain rounded-xl border border-slate-200 bg-slate-50"
              />
            )}
            <label className="flex items-center gap-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm border border-emerald-200 cursor-pointer transition">
              <ImageIcon className="w-4 h-4 text-emerald-700" />
              <span>اختر صورة الغلاف من الحاسوب</span>
              <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
            </label>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">وصف الكتاب والهدف التعليمي</label>
          <textarea
            value={book.description}
            onChange={(e) => handleBookChange('description', e.target.value)}
            className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-sm h-20 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
            placeholder="موجز عن محتوى الكتاب..."
          />
        </div>
      </div>

      {/* Pages Section */}
      <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200/80 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
            <span>📄</span>
            <span>صفحات الكتاب ({book.pages.length}):</span>
          </h2>

          <button
            onClick={handleAddPage}
            className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة صفحة</span>
          </button>
        </div>

        {/* Page selector pills */}
        <div className="flex gap-2 overflow-x-auto pb-3 mb-6 scrollbar-none">
          {book.pages.map((p, index) => (
            <button
              key={index}
              onClick={() => setActivePageIndex(index)}
              className={`px-4 py-2 rounded-xl font-bold text-sm whitespace-nowrap transition flex items-center gap-1.5 ${
                activePageIndex === index
                  ? 'bg-emerald-800 text-white shadow-sm ring-2 ring-emerald-600'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <span>صفحة {index + 1}</span>
              {book.pages.length > 1 && (
                <span 
                  onClick={(e) => { e.stopPropagation(); handleDeletePage(index); }}
                  className="opacity-50 hover:opacity-100 p-0.5 hover:bg-red-500 hover:text-white rounded-full text-xs"
                  title="حذف الصفحة"
                >
                  ✕
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Current Page Editor */}
        {currentPage && (
          <div className="space-y-5 bg-slate-50/60 p-4 sm:p-6 rounded-2xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-200">
              <span className="font-bold text-emerald-900 text-base">تعديل الصفحة رقم {activePageIndex + 1}:</span>
              <button
                onClick={() => handleDeletePage(activePageIndex)}
                className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-lg transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>حذف هذه الصفحة</span>
              </button>
            </div>

            {/* Page Title & Image */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">عنوان المقطع أو الدرس</label>
                <input
                  type="text"
                  value={currentPage.titreSection}
                  onChange={(e) => handlePageChange('titreSection', e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 font-reading text-lg bg-white"
                  placeholder="عنوان الدرس"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">صورة الصفحة</label>
                <div className="flex items-center gap-3">
                  {currentPage.image && (
                    <img
                      src={currentPage.imageFileData || currentPage.image}
                      alt="صورة"
                      className="w-16 h-16 object-contain rounded-xl border border-slate-200 bg-white"
                    />
                  )}
                  <label className="flex items-center gap-1.5 bg-white hover:bg-slate-100 text-slate-700 px-3 py-2 rounded-xl text-xs font-bold border border-slate-300 cursor-pointer">
                    <ImageIcon className="w-4 h-4 text-emerald-700" />
                    <span>رفع صورة</span>
                    <input type="file" accept="image/*" className="hidden" onChange={handlePageImageUpload} />
                  </label>
                </div>
              </div>
            </div>

            {/* Audio Mode Selection */}
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <label className="block text-xs font-bold text-emerald-900 mb-2">وضع الصوت لهذه الصفحة:</label>
              <div className="flex gap-3 mb-3">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="audioMode"
                    checked={currentPage.audioMode === 'tts'}
                    onChange={() => handlePageChange('audioMode', 'tts')}
                  />
                  <span className="font-bold">🤖 نطق آلي ذكي (TTS) - يعمل تلقائياً وبسهولة</span>
                </label>

                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input
                    type="radio"
                    name="audioMode"
                    checked={currentPage.audioMode === 'mp3'}
                    onChange={() => handlePageChange('audioMode', 'mp3')}
                  />
                  <span className="font-bold">🎵 تسجيل MP3 مع ملف WebMAUS CSV</span>
                </label>
              </div>

              {currentPage.audioMode === 'mp3' && (
                <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100">
                  <label className="flex items-center gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 px-3 py-2 rounded-xl text-xs font-bold border border-emerald-200 cursor-pointer">
                    <Music className="w-4 h-4 text-emerald-700" />
                    <span>رفع ملف MP3</span>
                    <input type="file" accept="audio/*" className="hidden" onChange={handlePageAudioUpload} />
                  </label>

                  <label className="flex items-center gap-1.5 bg-sky-50 hover:bg-sky-100 text-sky-900 px-3 py-2 rounded-xl text-xs font-bold border border-sky-200 cursor-pointer">
                    <FileText className="w-4 h-4 text-sky-700" />
                    <span>استيراد توقيتات WebMAUS (.CSV)</span>
                    <input type="file" accept=".csv" className="hidden" onChange={handleWebMausCsvUpload} />
                  </label>

                  {currentPage.mots && currentPage.mots.length > 0 && (
                    <span className="text-xs text-emerald-700 font-bold">
                      ✅ {currentPage.mots.length} كلمة متزامنة
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Vocalized Text */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-700">النص المعروض (مع التشكيل الكامل بالحركات) *</label>
                <span className="text-xs text-amber-700">💡 التشكيل الدقيق يسهل القراءة للمتعلمين</span>
              </div>
              <textarea
                value={currentPage.texteAffiche}
                onChange={(e) => handlePageChange('texteAffiche', e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-200 font-reading text-xl sm:text-2xl leading-loose bg-white h-32 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                placeholder="اكتب أو الصق النص هنا مع الحركات والتنوين..."
              />
            </div>

            {/* Vocabulary Editor */}
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <div className="flex justify-between items-center mb-3">
                <span className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-700" />
                  <span>المفردات والشروحات ({currentPage.vocabulaire.length}):</span>
                </span>
                <button
                  onClick={handleAddVocab}
                  className="flex items-center gap-1 text-xs bg-emerald-50 hover:bg-emerald-100 text-emerald-800 px-2.5 py-1.5 rounded-lg border border-emerald-200 font-bold"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>إضافة كلمة</span>
                </button>
              </div>

              <div className="space-y-3">
                {currentPage.vocabulaire.map((v, vIdx) => (
                  <div key={vIdx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={v.mot}
                        onChange={(e) => handleUpdateVocab(vIdx, { ...v, mot: e.target.value })}
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 font-reading text-lg bg-white"
                        placeholder="الكلمة (مثال: الغِذَاءُ)"
                      />
                      <input
                        type="text"
                        value={v.traduction}
                        onChange={(e) => handleUpdateVocab(vIdx, { ...v, traduction: e.target.value })}
                        className="flex-2 px-3 py-1.5 rounded-lg border border-slate-200 text-sm bg-white"
                        placeholder="الشرح أو المعنى"
                      />
                      <button
                        onClick={() => handleDeleteVocab(vIdx)}
                        className="text-red-500 hover:text-red-700 p-1.5"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={v.synonymes?.join(', ') || ''}
                        onChange={(e) => handleUpdateVocab(vIdx, { 
                          ...v, 
                          synonymes: e.target.value.split(/[,،]/).map(s => s.trim()).filter(Boolean) 
                        })}
                        className="flex-1 px-3 py-1 rounded-lg border border-slate-200 text-xs bg-white"
                        placeholder="مرادفات (مفصولة بفواصل)"
                      />
                      <input
                        type="text"
                        value={v.exemple || ''}
                        onChange={(e) => handleUpdateVocab(vIdx, { ...v, exemple: e.target.value })}
                        className="flex-1 px-3 py-1 rounded-lg border border-slate-200 text-xs bg-white"
                        placeholder="مثال في جملة مفيدة"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Exercises Editor (All types supported) */}
            <div className="p-4 bg-white rounded-xl border border-slate-200">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                <span className="font-bold text-sm text-emerald-950 flex items-center gap-1.5">
                  <HelpCircle className="w-4 h-4 text-emerald-700" />
                  <span>التمارين التفاعلية ({currentPage.exercices.length}):</span>
                </span>

                <div className="flex flex-wrap gap-1.5">
                  <button
                    onClick={() => handleAddExercise('fillblank')}
                    className="text-xs bg-emerald-100 hover:bg-emerald-200 text-emerald-900 px-2.5 py-1.5 rounded-lg font-bold"
                  >
                    + ملء الفراغات
                  </button>
                  <button
                    onClick={() => handleAddExercise('qcm')}
                    className="text-xs bg-sky-100 hover:bg-sky-200 text-sky-900 px-2.5 py-1.5 rounded-lg font-bold"
                  >
                    + سؤال QCM
                  </button>
                  <button
                    onClick={() => handleAddExercise('image_click')}
                    className="text-xs bg-amber-100 hover:bg-amber-200 text-amber-900 px-2.5 py-1.5 rounded-lg font-bold"
                  >
                    + اختيار الصورة
                  </button>
                  <button
                    onClick={() => handleAddExercise('word_order')}
                    className="text-xs bg-purple-100 hover:bg-purple-200 text-purple-900 px-2.5 py-1.5 rounded-lg font-bold"
                  >
                    + ترتيب الكلمات
                  </button>
                </div>
              </div>

              {/* List of exercises */}
              <div className="space-y-4">
                {currentPage.exercices.map((ex, exIdx) => (
                  <div key={ex.id || exIdx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex justify-between items-center pb-2 border-b border-slate-200">
                      <span className="font-bold text-xs text-slate-700">
                        {ex.type === 'fillblank' && '✍️ تمرين ملء الفراغات'}
                        {ex.type === 'qcm' && '❓ سؤال اختيار من متعدد (QCM)'}
                        {ex.type === 'image_click' && '🖼️ اختيار الصورة بالتعليمة'}
                        {ex.type === 'word_order' && '🔤 ترتيب الكلمات لتكوين جملة'}
                        {ex.type === 'sequence_order' && '🔢 ترتيب خطوات أو أحداث'}
                      </span>
                      <button
                        onClick={() => handleDeleteExercise(exIdx)}
                        className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>حذف</span>
                      </button>
                    </div>

                    {/* Specific fields depending on exercise type */}
                    {ex.type === 'fillblank' && (
                      <div className="space-y-2 text-xs">
                        <label className="font-bold block">النص مع الفراغات (استخدم ___ لكل فراغ):</label>
                        <input
                          type="text"
                          value={ex.texte}
                          onChange={(e) => {
                            const updated = [...currentPage.exercices];
                            (updated[exIdx] as any).texte = e.target.value;
                            handlePageChange('exercices', updated);
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 font-reading text-lg bg-white"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="font-bold block">الكلمات الصحيحة بالترتيب (مفصولة بفواصل):</label>
                            <input
                              type="text"
                              value={ex.reponses.join(', ')}
                              onChange={(e) => {
                                const reps = e.target.value.split(/[,،]/).map(s => s.trim()).filter(Boolean);
                                const updated = [...currentPage.exercices];
                                (updated[exIdx] as any).reponses = reps;
                                (updated[exIdx] as any).motsMelanges = [...reps, ...(ex.leurres || [])].sort(() => Math.random() - 0.5);
                                handlePageChange('exercices', updated);
                              }}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                            />
                          </div>
                          <div>
                            <label className="font-bold block">كلمات للتمويه (مفصولة بفواصل):</label>
                            <input
                              type="text"
                              value={ex.leurres?.join(', ') || ''}
                              onChange={(e) => {
                                const dists = e.target.value.split(/[,،]/).map(s => s.trim()).filter(Boolean);
                                const updated = [...currentPage.exercices];
                                (updated[exIdx] as any).leurres = dists;
                                (updated[exIdx] as any).motsMelanges = [...ex.reponses, ...dists].sort(() => Math.random() - 0.5);
                                handlePageChange('exercices', updated);
                              }}
                              className="w-full px-3 py-1.5 rounded-lg border border-slate-200 bg-white"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {ex.type === 'qcm' && (
                      <div className="space-y-2 text-xs">
                        <label className="font-bold block">نص السؤال:</label>
                        <input
                          type="text"
                          value={ex.question}
                          onChange={(e) => {
                            const updated = [...currentPage.exercices];
                            (updated[exIdx] as any).question = e.target.value;
                            handlePageChange('exercices', updated);
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 font-reading text-lg bg-white"
                        />
                        <label className="font-bold block">الخيارات (حدد الخيار الصحيح بـ Radio):</label>
                        {ex.options.map((opt, oIdx) => (
                          <div key={oIdx} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`qcm-correct-${exIdx}`}
                              checked={ex.bonneReponseIndex === oIdx}
                              onChange={() => {
                                const updated = [...currentPage.exercices];
                                (updated[exIdx] as any).bonneReponseIndex = oIdx;
                                handlePageChange('exercices', updated);
                              }}
                            />
                            <input
                              type="text"
                              value={opt}
                              onChange={(e) => {
                                const nextOpts = [...ex.options];
                                nextOpts[oIdx] = e.target.value;
                                const updated = [...currentPage.exercices];
                                (updated[exIdx] as any).options = nextOpts;
                                handlePageChange('exercices', updated);
                              }}
                              className="flex-1 px-3 py-1 rounded-lg border border-slate-200 bg-white"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {ex.type === 'word_order' && (
                      <div className="space-y-2 text-xs">
                        <label className="font-bold block">الجملة الصحيحة (ستقوم المنظومة بخلط كلماتها آلياً للمتعلم):</label>
                        <input
                          type="text"
                          value={ex.phraseCorrecte}
                          onChange={(e) => {
                            const phrase = e.target.value;
                            const shuffled = phrase.trim().split(/\s+/).filter(Boolean).sort(() => Math.random() - 0.5);
                            const updated = [...currentPage.exercices];
                            (updated[exIdx] as any).phraseCorrecte = phrase;
                            (updated[exIdx] as any).motsMelanges = shuffled;
                            handlePageChange('exercices', updated);
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 font-reading text-lg bg-white"
                        />
                      </div>
                    )}

                    {ex.type === 'image_click' && (
                      <div className="space-y-2 text-xs">
                        <label className="font-bold block">التعليمة الصوتية / المكتوبة:</label>
                        <input
                          type="text"
                          value={ex.instruction}
                          onChange={(e) => {
                            const updated = [...currentPage.exercices];
                            (updated[exIdx] as any).instruction = e.target.value;
                            handlePageChange('exercices', updated);
                          }}
                          className="w-full px-3 py-2 rounded-lg border border-slate-200 font-reading text-lg bg-white"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">ملاحظات وإرشادات تربوية إضافية لهذه الصفحة</label>
              <textarea
                value={currentPage.notes || ''}
                onChange={(e) => handlePageChange('notes', e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs bg-white h-16"
                placeholder="توجيهات للمتعلم أو المعلم..."
              />
            </div>
          </div>
        )}
      </div>

      {/* GitHub Export Modal */}
      {showGitHubModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn" dir="rtl">
          <div className="w-full max-w-lg rounded-3xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
                <span>🚀</span>
                <span>تصدير الكتاب مباشرة إلى مستودع GitHub</span>
              </h3>
              <button onClick={() => setShowGitHubModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700">
              <div>
                <label className="block font-bold mb-1">رمز الدخول الشخصي (GitHub Personal Access Token) *</label>
                <input
                  type="password"
                  value={ghToken}
                  onChange={(e) => setGhToken(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono text-xs"
                  placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">اسم المالك (Owner) *</label>
                  <input
                    type="text"
                    value={ghOwner}
                    onChange={(e) => setGhOwner(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    placeholder="مثال: semred"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">اسم المستودع (Repo) *</label>
                  <input
                    type="text"
                    value={ghRepo}
                    onChange={(e) => setGhRepo(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    placeholder="livre_alphabetisation"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold mb-1">الفرع (Branch)</label>
                  <input
                    type="text"
                    value={ghBranch}
                    onChange={(e) => setGhBranch(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    placeholder="main"
                  />
                </div>
                <div>
                  <label className="block font-bold mb-1">مجلد الكتب (Base Path)</label>
                  <input
                    type="text"
                    value={ghPath}
                    onChange={(e) => setGhPath(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs"
                    placeholder="livres"
                  />
                </div>
              </div>

              {ghStatus && (
                <div className={`p-3 rounded-xl font-bold text-xs ${
                  ghStatus.includes('✅') ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900'
                }`}>
                  {ghStatus}
                </div>
              )}
            </div>

            <div className="flex gap-2.5 mt-5">
              <button
                onClick={handleSaveToGitHub}
                disabled={isGhLoading}
                className="flex-1 py-2.5 bg-emerald-800 hover:bg-emerald-900 text-white font-bold rounded-xl shadow-md transition disabled:opacity-50"
              >
                {isGhLoading ? 'جاري الرفع إلى GitHub...' : 'تصدير وتحديث الكتاب الآن'}
              </button>
              <button
                onClick={() => setShowGitHubModal(false)}
                className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl"
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
