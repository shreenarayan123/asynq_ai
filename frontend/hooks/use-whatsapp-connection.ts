import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

type ConnectionStatus = {
  status: 'connected' | 'disconnected';
  qr: string | null;
  lastUpdated: string;
};

export function useWhatsAppConnection() {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>({
    status: 'disconnected',
    qr: null,
    lastUpdated: new Date().toISOString()
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initial fetch
    fetchConnectionStatus();

    // Set up socket connection
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';
    console.log('Connecting to Socket.IO at:', backendUrl);
    
    const socket = io(backendUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    socket.on('connect', () => {
      console.log('Socket connected with ID:', socket.id);
    });

    socket.on('connectionStatus', (data: ConnectionStatus) => {
      console.log('Received connection status update:', data);
      setConnectionStatus(data);
      setIsLoading(false);
      
      // If we got a QR code, also refresh our state from API
      if (data.qr) {
        console.log('QR code received via socket, length:', data.qr.length);
      }
    });

    socket.on('connect_error', (err: Error) => {
      console.error('Socket connection error:', err);
      setError('Failed to connect to the backend server');
      setIsLoading(false);
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  const fetchConnectionStatus = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/connection');
      if (!response.ok) {
        throw new Error('Failed to fetch connection status');
      }
      const data = await response.json();
      setConnectionStatus(data);
      setError(null);
    } catch (err) {
      console.error('Error fetching connection status:', err);
      setError('Failed to fetch connection status');
    } finally {
      setIsLoading(false);
    }
  };

  const reconnect = async (forceNewQR = false) => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/connection/reconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ forceNewQR }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to reconnect');
      }
      
      // Give the backend a moment to clear the session and start reconnecting
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchConnectionStatus();
      return true;
    } catch (err) {
      console.error('Error reconnecting:', err);
      setError('Failed to reconnect');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resetQR = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/connection/reset', {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset QR code');
      }
      
      // Give the backend a moment to clear the session
      await new Promise(resolve => setTimeout(resolve, 1000));
      await fetchConnectionStatus();
      return true;
    } catch (err) {
      console.error('Error resetting QR code:', err);
      setError('Failed to reset QR code');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    connectionStatus,
    isLoading,
    error,
    reconnect,
    resetQR,
    refresh: fetchConnectionStatus
  };
}
