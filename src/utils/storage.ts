import JSZip from 'jszip';
import { Book } from '../types/book';

const LOCAL_STORAGE_KEY = 'mon_livre_studio_draft_v2';

/**
 * Saves current book draft to LocalStorage with all media embedded
 */
export function saveDraftLocally(book: Book): void {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(book));
  } catch (e) {
    console.warn('LocalStorage size limit exceeded, attempting compressed save', e);
    // If localstorage is full due to heavy audio/images, save metadata + text
    const lightweight = {
      ...book,
      pages: book.pages.map(p => ({
        ...p,
        imageFileData: undefined,
        audioFileData: undefined
      }))
    };
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(lightweight));
    } catch {}
  }
}

/**
 * Loads saved draft from LocalStorage
 */
export function loadDraftLocally(): Book | null {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Helper to convert a Blob or File to Base64 data URL
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Helper to extract base64 data from a data URL
 */
function dataUrlToBinary(dataUrl: string): Uint8Array {
  const parts = dataUrl.split(',');
  const byteString = atob(parts[1] || parts[0]);
  const arrayBuffer = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    arrayBuffer[i] = byteString.charCodeAt(i);
  }
  return arrayBuffer;
}

/**
 * Export 1: Single Complete Self-Contained Project File (.book.json)
 * Perfect for quick backup & instant re-import on any computer
 */
export function downloadCompleteBundle(book: Book): void {
  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(book, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `${book.id || 'livre'}.complet.book.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}

/**
 * Export 2: Complete ZIP Archive with separate JSON, MP3, Images, and Catalogue
 * Solves Problem 1 completely
 */
export async function downloadCompleteZip(book: Book): Promise<void> {
  const zip = new JSZip();
  const folderName = book.id || 'mon-livre';
  const root = zip.folder(folderName) || zip;

  // Clean relative JSON for distribution
  const exportBookJSON = {
    ...book,
    couverture: book.couvertureFileData ? `couverture.jpg` : book.couverture,
    pages: book.pages.map((p, idx) => ({
      ...p,
      image: p.imageFileData ? `images/page_${idx + 1}.jpg` : p.image,
      audioPage: p.audioFileData ? `audio/page_${idx + 1}.mp3` : p.audioPage,
      imageFileData: undefined,
      audioFileData: undefined
    })),
    couvertureFileData: undefined,
    resume: {
      ...book.resume,
      audio: book.resume.audioFileData ? `audio/resume.mp3` : book.resume.audio,
      audioFileData: undefined
    }
  };

  // Add livre.json
  root.file('livre.json', JSON.stringify(exportBookJSON, null, 2));

  // Add cover image if available
  if (book.couvertureFileData && book.couvertureFileData.startsWith('data:')) {
    root.file('couverture.jpg', dataUrlToBinary(book.couvertureFileData));
  }

  // Create subfolders
  const imgFolder = root.folder('images');
  const audioFolder = root.folder('audio');

  // Add pages media
  book.pages.forEach((page, index) => {
    const pageNum = index + 1;
    if (page.imageFileData && page.imageFileData.startsWith('data:') && imgFolder) {
      imgFolder.file(`page_${pageNum}.jpg`, dataUrlToBinary(page.imageFileData));
    }
    if (page.audioFileData && page.audioFileData.startsWith('data:') && audioFolder) {
      audioFolder.file(`page_${pageNum}.mp3`, dataUrlToBinary(page.audioFileData));
    }
  });

  // Add summary audio
  if (book.resume.audioFileData && book.resume.audioFileData.startsWith('data:') && audioFolder) {
    audioFolder.file('resume.mp3', dataUrlToBinary(book.resume.audioFileData));
  }

  // Add catalogue.json sample
  const catalogueSample = {
    derniereMAJ: new Date().toISOString(),
    livres: [
      {
        id: book.id,
        titre: book.titre,
        description: book.description,
        couverture: `${folderName}/couverture.jpg`,
        resume: book.resume.texte?.substring(0, 150) || '',
        niveau: book.niveau,
        auteur: book.auteur || '',
        nombrePages: book.pages.length,
        fichierJSON: `${folderName}/livre.json`,
        dateAjout: new Date().toISOString()
      }
    ]
  };
  root.file('catalogue.json', JSON.stringify(catalogueSample, null, 2));

  // Add README Instructions
  const readme = `# حزمة الكتاب التفاعلي: ${book.titre}
معرّف الكتاب: ${book.id}
تاريخ التصدير: ${new Date().toLocaleString()}

محتويات الحزمة:
- livre.json : ملف بيانات الكتاب والصفحات والتمارين
- couverture.jpg : صورة الغلاف
- images/ : صور الصفحات
- audio/ : الملفات الصوتية للدروس والتسجيلات
- catalogue.json : فهرس الكتب التفاعلية

كيفية استيراد هذا الكتاب:
1. يمكنك استيراد هذا الملف المضغوط (.ZIP) مباشرة داخل التطبيق بالضغط على "استيراد مشروع كامل".
2. أو رفعه إلى مستودع GitHub في مجلد "livres/${book.id}/" ليصبح متاحاً للجميع عبر الإنترنت.
`;
  root.file('اقرأني_تعليمات.txt', readme);

  // Generate ZIP file and trigger download
  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${folderName}_package_complet.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/**
 * Universal Import: Imports either a .ZIP package OR a .JSON / .book.json file
 */
export async function importBookFile(file: File): Promise<Book> {
  const fileName = file.name.toLowerCase();

  // Scenario 1: JSON file
  if (fileName.endsWith('.json')) {
    const text = await file.text();
    const data = JSON.parse(text);
    return normalizeImportedBook(data);
  }

  // Scenario 2: ZIP file
  if (fileName.endsWith('.zip')) {
    const zip = await JSZip.loadAsync(file);

    // Look for livre.json or any json file in the zip
    let jsonEntry: JSZip.JSZipObject | null = null;
    let jsonEntryPath = '';

    zip.forEach((relativePath, entry) => {
      if (!entry.dir && relativePath.endsWith('.json') && !relativePath.includes('catalogue')) {
        jsonEntry = entry;
        jsonEntryPath = relativePath;
      }
    });

    if (!jsonEntry) {
      throw new Error('لم يتم العثور على ملف livre.json داخل الأرشيف المضغوط');
    }

    const jsonText = await (jsonEntry as JSZip.JSZipObject).async('text');
    const bookData = JSON.parse(jsonText);

    // Reconstruct media as base64 data URLs
    const baseDir = jsonEntryPath.includes('/') ? jsonEntryPath.substring(0, jsonEntryPath.lastIndexOf('/') + 1) : '';

    // Check cover
    const coverPath = baseDir + 'couverture.jpg';
    const coverEntry = zip.file(coverPath) || zip.file('couverture.jpg');
    if (coverEntry) {
      const coverBlob = await coverEntry.async('blob');
      bookData.couvertureFileData = await fileToBase64(coverBlob);
      bookData.couverture = bookData.couvertureFileData;
    }

    // Check page images and audios
    if (Array.isArray(bookData.pages)) {
      for (let i = 0; i < bookData.pages.length; i++) {
        const pageNum = i + 1;
        // Image
        const imgPath = `${baseDir}images/page_${pageNum}.jpg`;
        const imgEntry = zip.file(imgPath) || zip.file(`images/page_${pageNum}.jpg`);
        if (imgEntry) {
          const imgBlob = await imgEntry.async('blob');
          const dataUrl = await fileToBase64(imgBlob);
          bookData.pages[i].imageFileData = dataUrl;
          bookData.pages[i].image = dataUrl;
        }

        // Audio
        const audioPath = `${baseDir}audio/page_${pageNum}.mp3`;
        const audioEntry = zip.file(audioPath) || zip.file(`audio/page_${pageNum}.mp3`);
        if (audioEntry) {
          const audioBlob = await audioEntry.async('blob');
          const dataUrl = await fileToBase64(audioBlob);
          bookData.pages[i].audioFileData = dataUrl;
          bookData.pages[i].audioPage = dataUrl;
        }
      }
    }

    return normalizeImportedBook(bookData);
  }

  throw new Error('نوع الملف غير مدعوم، يرجى اختيار ملف .ZIP أو .JSON');
}

function normalizeImportedBook(raw: any): Book {
  return {
    id: raw.id || `livre-${Date.now()}`,
    titre: raw.titre || 'كتاب بدون عنوان',
    couverture: raw.couverture || '',
    couvertureFileData: raw.couvertureFileData,
    description: raw.description || '',
    auteur: raw.auteur || '',
    niveau: raw.niveau || 'moyen',
    pages: (raw.pages || []).map((p: any, idx: number) => ({
      numero: p.numero || idx + 1,
      titreSection: p.titreSection || '',
      image: p.image || '',
      imageFileData: p.imageFileData,
      texteAffiche: p.texteAffiche || '',
      audioMode: p.audioMode || 'tts',
      audioPage: p.audioPage || '',
      audioFileData: p.audioFileData,
      mots: Array.isArray(p.mots) ? p.mots : [],
      vocabulaire: Array.isArray(p.vocabulaire) ? p.vocabulaire : [],
      exercices: Array.isArray(p.exercices) ? p.exercices : [],
      notes: p.notes || ''
    })),
    resume: {
      texte: raw.resume?.texte || '',
      modeAudio: raw.resume?.modeAudio || 'tts',
      audio: raw.resume?.audio || '',
      audioFileData: raw.resume?.audioFileData
    },
    dateCreation: raw.dateCreation || new Date().toISOString()
  };
}
