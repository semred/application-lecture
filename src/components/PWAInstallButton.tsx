import React, { useState, useEffect } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Smartphone, Laptop, X, CheckCircle, Share2, ExternalLink, AlertCircle } from 'lucide-react';

export const PWAInstallButton: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showGuide, setShowGuide] = useState(false);
  const [isInIframe, setIsInIframe] = useState(false);

  useEffect(() => {
    // Detect if running inside preview iframe
    try {
      setIsInIframe(window.self !== window.top);
    } catch {
      setIsInIframe(true);
    }
  }, []);

  // If already running as an installed standalone PWA, show clean badge
  if (isInstalled) {
    return (
      <div className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-800 text-emerald-200 rounded-xl text-xs font-bold border border-emerald-700">
        <CheckCircle className="w-3.5 h-3.5 text-amber-300" />
        <span>تطبيق مثبت (PWA)</span>
      </div>
    );
  }

  const handleInstallClick = async () => {
    if (isInIframe) {
      // In iframe, browsers block beforeinstallprompt, show explanation and offer opening in new tab
      setShowGuide(true);
      return;
    }

    if (isInstallable) {
      const success = await install();
      if (!success) {
        setShowGuide(true);
      }
    } else {
      setShowGuide(true);
    }
  };

  const openInNewTab = () => {
    window.open(window.location.href, '_blank', 'noopener,noreferrer');
  };

  return (
    <>
      <button
        onClick={handleInstallClick}
        className={`flex items-center gap-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-emerald-950 px-3.5 py-1.5 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 ${className}`}
        title="تثبيت التطبيق على الحاسوب أو الهاتف (PWA)"
      >
        <Download className="w-3.5 h-3.5 animate-bounce" />
        <span>تثبيت التطبيق (PWA)</span>
      </button>

      {/* Guide modal for Desktop and Mobile PWA Installation */}
      {showGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fadeIn" dir="rtl">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 text-slate-800">
            <div className="flex justify-between items-center mb-4 pb-3 border-b border-slate-100">
              <h3 className="text-lg font-bold text-emerald-950 flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-600" />
                <span>تثبيت التطبيق على الحاسوب والهاتف</span>
              </h3>
              <button 
                onClick={() => setShowGuide(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 font-bold"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Crucial Notice for Iframe Preview vs Real Browser Tab */}
            {isInIframe && (
              <div className="mb-4 p-3.5 bg-amber-50 border border-amber-300 rounded-2xl text-xs text-amber-950 leading-relaxed">
                <div className="flex items-center gap-1.5 font-black text-amber-900 mb-1">
                  <AlertCircle className="w-4 h-4 text-amber-700" />
                  <span>سبب عدم ظهور أيقونة التثبيت في المتصفح حالياً:</span>
                </div>
                <p className="mb-2.5">
                  متصفح Chrome و Edge <strong>يمنع أمنياً</strong> ظهور أيقونة التثبيت في شريط العنوان طالما أن الصفحة معروضة داخل نافذة المعاينة (iframe). 
                  لظهور الأيقونة وتثبيت التطبيق، يجب فتحه في <strong>تبويب مستقل بالمتصفح</strong>.
                </p>
                <button
                  onClick={openInNewTab}
                  className="w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 text-emerald-950 font-black rounded-xl flex items-center justify-center gap-2 transition"
                >
                  <ExternalLink className="w-4 h-4" />
                  <span>اضغط هنا لفتح التطبيق في تبويب مستقل بالمتصفح</span>
                </button>
              </div>
            )}

            <div className="space-y-3.5 text-xs sm:text-sm leading-relaxed">
              {/* Option 1: On PC (Chrome / Edge) */}
              <div className="p-3.5 bg-emerald-50 rounded-2xl border border-emerald-200">
                <div className="flex items-center gap-2 font-bold text-emerald-950 mb-1">
                  <Laptop className="w-4 h-4 text-emerald-700" />
                  <span>1. على الحاسوب (Google Chrome أو Edge) :</span>
                </div>
                <p className="text-slate-600">
                  عند فتح التطبيق في تبويب مستقل، ستجد في أقصى يمين شريط العنوان (URL) أيقونة تثبيت صغيرة <strong>(شاشة مع سهم 🖥️ ⬇️)</strong> أو اضغط على قائمة المتصفح <strong>(⋮) ➔ «Installer l'application»</strong>.
                </p>
              </div>

              {/* Option 2: On Android Phone */}
              <div className="p-3.5 bg-sky-50 rounded-2xl border border-sky-200">
                <div className="flex items-center gap-2 font-bold text-sky-950 mb-1">
                  <Smartphone className="w-4 h-4 text-sky-700" />
                  <span>2. على الهاتف (Android / Chrome) :</span>
                </div>
                <p className="text-slate-600">
                  اضغط على خيارات المتصفح <strong>(⋮)</strong> بأعلى الشاشة ثم اختر <strong>«تثبيت التطبيق» (Installer l'application)</strong> ليظهر على الشاشة الرئيسية.
                </p>
              </div>

              {/* Option 3: On iPhone / iPad Safari */}
              <div className="p-3.5 bg-purple-50 rounded-2xl border border-purple-200">
                <div className="flex items-center gap-2 font-bold text-purple-950 mb-1">
                  <Share2 className="w-4 h-4 text-purple-700" />
                  <span>3. على iPhone / iPad (Safari) :</span>
                </div>
                <p className="text-slate-600">
                  اضغط على زر المشاركة <strong>(Partager)</strong> أسفل الشاشة، ثم اختر <strong>«Sur l'écran d'accueil» (إضافة إلى الشاشة الرئيسية)</strong>.
                </p>
              </div>
            </div>

            <button
              onClick={() => setShowGuide(false)}
              className="mt-4 w-full rounded-xl bg-emerald-800 py-2.5 text-sm font-bold text-white shadow-md hover:bg-emerald-900 transition"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}
    </>
  );
};
