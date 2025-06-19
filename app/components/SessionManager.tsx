"use client";

import React, { useState, useEffect } from 'react';
import { authService } from '../services/authService';

export const SessionManager: React.FC = () => {
  const [isValid, setIsValid] = useState<boolean>(false);
  const [expiryTime, setExpiryTime] = useState<Date | null>(null);
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<number>(0);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [lastValidation, setLastValidation] = useState<Date | null>(null);

  // Update session status every minute
  useEffect(() => {
    const updateSessionStatus = () => {
      const valid = authService.isTokenValid();
      const expiry = authService.getTokenExpiry();
      const timeUntil = authService.getTimeUntilExpiry();

      setIsValid(valid);
      setExpiryTime(expiry);
      setTimeUntilExpiry(timeUntil);
    };

    // Initial update
    updateSessionStatus();

    // Update every minute
    const interval = setInterval(updateSessionStatus, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleManualValidation = async () => {
    setIsValidating(true);
    try {
      const success = await authService.validateSession();
      if (success) {
        setLastValidation(new Date());
        // Update status
        setIsValid(true);
        setExpiryTime(authService.getTokenExpiry());
        setTimeUntilExpiry(authService.getTimeUntilExpiry());
      } else {
        setIsValid(false);
      }
    } catch (error) {
      console.error('Manual validation failed:', error);
      setIsValid(false);
    } finally {
      setIsValidating(false);
    }
  };

  const handleRevalidation = async () => {
    setIsValidating(true);
    try {
      const success = await authService.revalidateSession();
      if (success) {
        setLastValidation(new Date());
        // Update status
        setIsValid(true);
        setExpiryTime(authService.getTokenExpiry());
        setTimeUntilExpiry(authService.getTimeUntilExpiry());
      } else {
        setIsValid(false);
      }
    } catch (error) {
      console.error('Revalidation failed:', error);
      setIsValid(false);
    } finally {
      setIsValidating(false);
    }
  };

  const formatTimeRemaining = (milliseconds: number): string => {
    if (milliseconds <= 0) return 'Expired';
    
    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    } else {
      return `${minutes}m remaining`;
    }
  };

  const getStatusColor = (): string => {
    if (!isValid) return 'text-red-400';
    if (timeUntilExpiry < 60 * 60 * 1000) return 'text-yellow-400'; // Less than 1 hour
    return 'text-green-400';
  };

  const getStatusText = (): string => {
    if (!isValid) return 'Invalid';
    if (timeUntilExpiry <= 0) return 'Expired';
    if (timeUntilExpiry < 60 * 60 * 1000) return 'Expiring Soon';
    return 'Valid';
  };

  if (!authService.getCurrentToken()) {
    return null; // Don't show if no token exists
  }

  return (
    <div className="fixed bottom-4 right-4 bg-gray-800 border border-gray-600 rounded-lg p-4 shadow-lg max-w-sm">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-white">Session Status</h3>
        <div className={`text-xs font-medium ${getStatusColor()}`}>
          {getStatusText()}
        </div>
      </div>
      
      {isValid && expiryTime && (
        <div className="text-xs text-gray-300 mb-3">
          <div>Expires: {expiryTime.toLocaleString()}</div>
          <div className={getStatusColor()}>
            {formatTimeRemaining(timeUntilExpiry)}
          </div>
        </div>
      )}

      {lastValidation && (
        <div className="text-xs text-gray-400 mb-3">
          Last validated: {lastValidation.toLocaleTimeString()}
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={handleManualValidation}
          disabled={isValidating}
          className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
        >
          {isValidating ? 'Validating...' : 'Validate'}
        </button>
        <button
          onClick={handleRevalidation}
          disabled={isValidating}
          className="px-2 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
        >
          {isValidating ? 'Revalidating...' : 'Revalidate'}
        </button>
      </div>
    </div>
  );
}; 