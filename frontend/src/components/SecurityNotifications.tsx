/**
 * Security Notifications Component
 * Displays security notifications and alerts to users
 */

import React from 'react';
import { useSecurityNotifications, SecurityNotification } from '../services/SecurityNotificationService';

const SecurityNotifications: React.FC = () => {
  const { notifications, removeNotification, clearAll } = useSecurityNotifications();

  const getNotificationIcon = (type: SecurityNotification['type']) => {
    switch (type) {
      case 'success': return '✅';
      case 'warning': return '⚠️';
      case 'error': return '❌';
      case 'info': return 'ℹ️';
      default: return '📢';
    }
  };

  const getNotificationColors = (type: SecurityNotification['type'], severity?: string) => {
    if (severity === 'CRITICAL') {
      return 'bg-red-100 border-red-500 text-red-800';
    }
    
    switch (type) {
      case 'success': return 'bg-green-100 border-green-500 text-green-800';
      case 'warning': return 'bg-yellow-100 border-yellow-500 text-yellow-800';
      case 'error': return 'bg-red-100 border-red-500 text-red-800';
      case 'info': return 'bg-blue-100 border-blue-500 text-blue-800';
      default: return 'bg-gray-100 border-gray-500 text-gray-800';
    }
  };

  const getSeverityBadge = (severity?: string) => {
    if (!severity) return null;
    
    const colors = {
      'LOW': 'bg-green-200 text-green-800',
      'MEDIUM': 'bg-yellow-200 text-yellow-800',
      'HIGH': 'bg-orange-200 text-orange-800',
      'CRITICAL': 'bg-red-200 text-red-800'
    };

    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[severity as keyof typeof colors] || colors.LOW}`}>
        {severity}
      </span>
    );
  };

  if (notifications.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {/* Clear all button */}
      {notifications.length > 1 && (
        <div className="flex justify-end">
          <button
            onClick={clearAll}
            className="text-xs text-gray-500 hover:text-gray-700 bg-white px-2 py-1 rounded shadow"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Notifications */}
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`border-l-4 p-4 rounded shadow-lg ${getNotificationColors(notification.type, notification.severity)} animate-slide-in`}
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <span className="text-lg">{getNotificationIcon(notification.type)}</span>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-semibold text-sm">{notification.title}</h4>
                  {getSeverityBadge(notification.severity)}
                </div>
                <p className="text-sm">{notification.message}</p>
                <p className="text-xs opacity-75 mt-1">
                  {notification.timestamp.toLocaleTimeString()}
                </p>
              </div>
            </div>
            <button
              onClick={() => removeNotification(notification.id)}
              className="ml-2 text-gray-500 hover:text-gray-700 focus:outline-none"
            >
              ×
            </button>
          </div>
        </div>
      ))}

      <style>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default SecurityNotifications;