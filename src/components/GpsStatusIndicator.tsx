// components/GpsStatusIndicator.tsx
import { Badge } from '@/components/ui/badge';
import { Satellite, Wifi, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface GpsStatusIndicatorProps {
  status: 'searching' | 'acquired' | 'timeout' | 'denied' | 'unavailable';
}

export function GpsStatusIndicator({ status }: GpsStatusIndicatorProps) {
  const statusConfig = {
    searching: {
      icon: <Clock className="w-3 h-3 animate-pulse" />,
      text: 'Searching GPS...',
      variant: 'secondary' as const,
      color: 'text-amber-600',
    },
    acquired: {
      icon: <CheckCircle className="w-3 h-3" />,
      text: 'GPS Active',
      variant: 'success' as const,
      color: 'text-green-600',
    },
    timeout: {
      icon: <Clock className="w-3 h-3" />,
      text: 'GPS Timeout (Using IP)',
      variant: 'outline' as const,
      color: 'text-amber-600',
    },
    denied: {
      icon: <AlertCircle className="w-3 h-3" />,
      text: 'Location Denied',
      variant: 'destructive' as const,
      color: 'text-red-600',
    },
    unavailable: {
      icon: <Satellite className="w-3 h-3" />,
      text: 'No GPS Signal',
      variant: 'outline' as const,
      color: 'text-gray-600',
    },
  };

  const config = statusConfig[status];

  return (
    <Badge variant={config.variant} className="gap-1">
      {config.icon}
      <span className={config.color}>{config.text}</span>
    </Badge>
  );
}