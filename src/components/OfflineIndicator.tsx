import React from 'react';
import { useOnlineStatus } from '../hooks/usePWAInstall';
import { WifiOff } from 'lucide-react';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs md:text-sm font-bold text-white shadow-xl animate-pulse" dir="rtl">
      <WifiOff className="w-4 h-4" />
      <span>وضع عدم الاتصال (بدون إنترنت) — تعمل الكتب المحفوظة والمخزنة محلياً</span>
    </div>
  );
};
