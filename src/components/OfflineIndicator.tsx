import { usePWA } from '../hooks/usePWA';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { WifiOff, Wifi } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export const OfflineIndicator = () => {
  const { isOnline: isOnlineOffline } = usePWA();
  const { t: tOffline } = useTranslation();
  // 只在离线时弹出 Toast
  useEffect(() => {
    if (!isOnlineOffline) {
      toast.error(
        <div className="flex items-center gap-2 text-sm">
          <WifiOff size={16} />
          <span>{tOffline('pwa.offline_hint')}</span>
        </div>
      );
    }
  }, [isOnlineOffline, tOffline]);
  return null;
};

export const OnlineIndicator = () => {
  const { isOnline: isOnlineOnline } = usePWA();
  const { t: tOnline } = useTranslation();
  return (
    <div className="flex items-center gap-1 text-xs" style={{ color: "var(--gray-11)" }}>
      {isOnlineOnline ? (
        <>
          <Wifi size={12} style={{ color: "var(--green-11)" }} />
          <span>{tOnline('nodeCard.online')}</span>
        </>
      ) : (
        <>
          <WifiOff size={12} style={{ color: "var(--amber-11)" }} />
          <span>{tOnline('nodeCard.offline')}</span>
        </>
      )}
    </div>
  );
};
