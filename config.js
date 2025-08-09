// Network Dashboard Configuration
const CONFIG = {
    // API Configuration
    API: {
        BASE_URL: 'http://localhost:8080/api/v1',
        ENDPOINTS: {
            // System Metrics
            NETWORK_STATS: '/metrics/network',
            BANDWIDTH_USAGE: '/metrics/bandwidth',
            SYSTEM_HEALTH: '/metrics/system',
            
            // Device Management
            DEVICES: '/devices',
            DEVICE_SCAN: '/devices/scan',
            DEVICE_PING: '/devices/{id}/ping',
            DEVICE_TRACE: '/devices/{id}/trace',
            
            // Network Events
            EVENTS: '/events',
            EVENTS_EXPORT: '/events/export',
            EVENTS_FILTER: '/events/filter',
            
            // Security & Alerts
            SECURITY_ALERTS: '/security/alerts',
            SECURITY_LOGS: '/security/logs',
            
            // Traffic Analytics
            TRAFFIC_REAL_TIME: '/traffic/realtime',
            TRAFFIC_HISTORICAL: '/traffic/historical',
            TRAFFIC_BY_DEVICE: '/traffic/device/{id}',
            
            // Network Topology
            TOPOLOGY: '/network/topology',
            NETWORK_MAP: '/network/map',
            
            // Configuration
            DASHBOARD_CONFIG: '/config/dashboard',
            USER_PREFERENCES: '/config/user',
        }
    },
    
    // WebSocket Configuration
    WEBSOCKET: {
        URL: 'ws://localhost:8080/ws',
        CHANNELS: {
            METRICS: 'network-metrics',
            SYSTEM_HEALTH: 'system-health',
            EVENTS: 'network-events',
            ALERTS: 'security-alerts',
            DEVICE_STATUS: 'device-status',
            TRAFFIC: 'traffic-updates'
        },
        RECONNECT: {
            MAX_ATTEMPTS: 5,
            DELAY: 1000,
            BACKOFF_MULTIPLIER: 2
        }
    },
    
    // Polling Configuration
    POLLING: {
        NETWORK_STATS: 10000,    // 10 seconds
        SYSTEM_HEALTH: 10000,    // 10 seconds
        DEVICE_STATUS: 15000,    // 15 seconds
        TRAFFIC_DATA: 5000,      // 5 seconds
        EVENTS: 30000,           // 30 seconds
        ALERTS: 20000            // 20 seconds
    },
    
    // Dashboard Settings
    DASHBOARD: {
        AUTO_REFRESH: true,
        REFRESH_INTERVAL: 30000,  // 30 seconds
        MAX_EVENTS: 100,
        MAX_ALERTS: 50,
        CHART_UPDATE_INTERVAL: 2000,  // 2 seconds
        NOTIFICATION_TIMEOUT: 5000    // 5 seconds
    },
    
    // Feature Flags
    FEATURES: {
        REAL_TIME_MONITORING: true,
        WEBSOCKET_ENABLED: true,
        AUTO_DISCOVERY: true,
        EXPORT_FUNCTIONALITY: true,
        ADVANCED_ANALYTICS: true
    },
    
    // Error Handling
    ERROR: {
        RETRY_ATTEMPTS: 3,
        TIMEOUT: 30000,  // 30 seconds
        SHOW_NOTIFICATIONS: true
    }
};

// Export configuration
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
} else {
    window.CONFIG = CONFIG;
} 