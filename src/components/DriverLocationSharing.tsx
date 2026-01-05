import React, { useState, useEffect } from 'react';
import { trackingService } from '../lib/tracking-service';

interface Props {
  driverId: string;
  onShareStatusChange?: (customerId: string, isShared: boolean) => void;
}

const DriverLocationSharing: React.FC<Props> = ({ 
  driverId, 
  onShareStatusChange 
}) => {
  const [customerId, setCustomerId] = useState('');
  const [sharingList, setSharingList] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSharedCustomers();
  }, [driverId]);

  const loadSharedCustomers = async () => {
    try {
      const shared = await trackingService.getSharedCustomers(driverId);
      setSharingList(shared);
    } catch (error) {
      console.error('Failed to load shared customers:', error);
    }
  };

  const shareWithCustomer = async () => {
    if (!customerId.trim()) return;
    
    setLoading(true);
    try {
      await trackingService.shareDriverLocationWithCustomer(driverId, customerId.trim());
      setSharingList(prev => [...prev, customerId.trim()]);
      onShareStatusChange?.(customerId.trim(), true);
      setCustomerId('');
    } catch (error) {
      console.error('Failed to share location:', error);
    } finally {
      setLoading(false);
    }
  };

  const stopSharing = async (customerIdToRemove: string) => {
    try {
      await trackingService.stopSharingWithCustomer(driverId, customerIdToRemove);
      setSharingList(prev => prev.filter(id => id !== customerIdToRemove));
      onShareStatusChange?.(customerIdToRemove, false);
    } catch (error) {
      console.error('Failed to stop sharing:', error);
    }
  };

  return (
    <div className="driver-location-sharing p-4 border rounded-lg bg-white shadow-sm">
      <h3 className="text-lg font-semibold mb-4 text-gray-800">📍 Location Sharing</h3>
      
      <div className="share-controls mb-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            placeholder="Enter Customer ID"
            className="flex-1 border border-gray-300 p-2 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <button
            onClick={shareWithCustomer}
            disabled={loading || !customerId.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? 'Sharing...' : 'Share Location'}
          </button>
        </div>
      </div>

      <div className="sharing-list">
        <h4 className="font-medium mb-2 text-gray-700">Sharing with:</h4>
        {sharingList.length === 0 ? (
          <p className="text-gray-500 text-sm">Not sharing with any customers</p>
        ) : (
          <ul className="space-y-2">
            {sharingList.map(id => (
              <li key={id} className="flex items-center justify-between p-2 bg-gray-50 rounded-md">
                <span className="text-sm font-medium text-gray-700">{id}</span>
                <button
                  onClick={() => stopSharing(id)}
                  className="bg-red-500 text-white px-3 py-1 rounded text-sm hover:bg-red-600 transition-colors"
                >
                  Stop Sharing
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};

export default DriverLocationSharing;
