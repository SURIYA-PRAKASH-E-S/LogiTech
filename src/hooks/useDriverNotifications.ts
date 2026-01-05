import { useEffect, useMemo, useState } from 'react';
import { bookingService, userService } from '@/lib/firebase-utils';
import { Booking, User } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

export type NotificationSource = 'admin' | 'user';

export interface DriverNotification {
  id: string;
  bookingId: string;
  vehicleId: string;
  title: string;
  description: string;
  status: Booking['status'];
  createdAt: number;
  type: NotificationSource;
  fromName: string;
}

const buildNotificationTitle = (booking: Booking): string => {
  switch (booking.status) {
    case 'in_progress':
      return 'Delivery In Progress';
    case 'completed':
      return 'Delivery Completed';
    case 'cancelled':
      return 'Delivery Cancelled';
    case 'pending':
      return 'New Delivery Assigned';
    case 'pending_payment':
      return 'Payment Pending';
    default:
      return 'Booking Update';
  }
};

const buildNotificationDescription = (booking: Booking): string => {
  const pickup = booking.pickupAddress || 'Unknown pickup';
  const destination = booking.destinationAddress || 'Unknown destination';
  return `${pickup} → ${destination}`;
};

const determineSourceType = (bookingOwner?: User | null): NotificationSource => {
  if (!bookingOwner) return 'admin';
  return bookingOwner.role === 'customer' ? 'user' : 'admin';
};

export function useDriverNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<DriverNotification[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let isActive = true;

    const loadNotifications = async () => {
      if (!user || user.role !== 'driver') {
        if (isActive) {
          setNotifications([]);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        const bookings = await bookingService.getBookingsByDriver(user.id);

        if (!isActive) return;

        const relevant = bookings.filter((booking) =>
          ['pending', 'in_progress', 'completed'].includes(booking.status)
        );

        const ownerIds = Array.from(new Set(relevant.map((booking) => booking.userId).filter(Boolean)));

        const owners = await Promise.all(
          ownerIds.map(async (ownerId) => {
            try {
              const owner = await userService.getUser(ownerId);
              return owner ? ([ownerId, owner] as [string, User]) : null;
            } catch (error) {
              console.error('Failed to load booking owner', error);
              return null;
            }
          })
        );

        if (!isActive) return;

        const ownerMap = new Map<string, User>();
        owners.forEach((entry) => {
          if (entry) {
            const [ownerId, owner] = entry;
            ownerMap.set(ownerId, owner);
          }
        });

        const mapped = relevant
          .sort((a, b) => b.updatedAt - a.updatedAt)
          .map((booking) => {
            const owner = booking.userId ? ownerMap.get(booking.userId) : undefined;

            return {
              id: booking.id,
              bookingId: booking.id,
              vehicleId: booking.vehicleId,
              title: buildNotificationTitle(booking),
              description: buildNotificationDescription(booking),
              status: booking.status,
              createdAt: booking.updatedAt || booking.createdAt,
              type: determineSourceType(owner),
              fromName: owner?.name || 'Logistics Admin',
            } satisfies DriverNotification;
          });

        setNotifications(mapped);
      } catch (error) {
        console.error('Failed to load driver notifications', error);
        if (isActive) {
          setNotifications([]);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    loadNotifications();

    const interval = setInterval(loadNotifications, 60_000);

    return () => {
      isActive = false;
      clearInterval(interval);
    };
  }, [user]);

  const alerts = useMemo(() => notifications, [notifications]);

  return {
    notifications: alerts,
    loading,
    unreadCount: alerts.filter((notification) => notification.status !== 'completed').length,
  };
}
