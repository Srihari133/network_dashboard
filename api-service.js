// Network Dashboard API Service
class ApiService {
    constructor(config) {
        this.config = config || window.CONFIG;
        this.baseUrl = this.config.API.BASE_URL;
        this.endpoints = this.config.API.ENDPOINTS;
        this.requestQueue = new Map();
        this.retryAttempts = new Map();
    }

    // Generic HTTP request method
    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const requestId = `${options.method || 'GET'}_${endpoint}_${Date.now()}`;
        
        const defaultOptions = {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            },
            timeout: this.config.ERROR.TIMEOUT
        };

        const finalOptions = { ...defaultOptions, ...options };

        try {
            // Add authorization if available
            const token = this.getAuthToken();
            if (token) {
                finalOptions.headers['Authorization'] = `Bearer ${token}`;
            }

            // Create abort controller for timeout
            const controller = new AbortController();
            finalOptions.signal = controller.signal;

            const timeoutId = setTimeout(() => controller.abort(), finalOptions.timeout);

            console.log(`🌐 API Request: ${finalOptions.method} ${url}`);

            const response = await fetch(url, finalOptions);
            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            
            // Reset retry attempts on success
            this.retryAttempts.delete(requestId);
            
            console.log(`✅ API Success: ${finalOptions.method} ${url}`, data);
            return data;

        } catch (error) {
            console.error(`❌ API Error: ${finalOptions.method} ${url}`, error);
            
            // Handle retry logic
            const attempts = this.retryAttempts.get(requestId) || 0;
            if (attempts < this.config.ERROR.RETRY_ATTEMPTS && this.shouldRetry(error)) {
                this.retryAttempts.set(requestId, attempts + 1);
                console.log(`🔄 Retrying request (${attempts + 1}/${this.config.ERROR.RETRY_ATTEMPTS})`);
                
                await this.delay(1000 * Math.pow(2, attempts)); // Exponential backoff
                return this.request(endpoint, options);
            }

            throw error;
        }
    }

    // Authentication token management
    getAuthToken() {
        return localStorage.getItem('network_dashboard_token');
    }

    setAuthToken(token) {
        localStorage.setItem('network_dashboard_token', token);
    }

    // Utility methods
    shouldRetry(error) {
        return error.name === 'AbortError' || 
               (error.message && error.message.includes('500')) ||
               (error.message && error.message.includes('502')) ||
               (error.message && error.message.includes('503'));
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Replace path parameters
    formatEndpoint(endpoint, params = {}) {
        let formattedEndpoint = endpoint;
        Object.keys(params).forEach(key => {
            formattedEndpoint = formattedEndpoint.replace(`{${key}}`, params[key]);
        });
        return formattedEndpoint;
    }

    // Network Metrics API
    async getNetworkStats() {
        return this.request(this.endpoints.NETWORK_STATS);
    }

    async getBandwidthUsage(timeRange = '1h') {
        return this.request(`${this.endpoints.BANDWIDTH_USAGE}?range=${timeRange}`);
    }

    async getSystemHealth() {
        return this.request(this.endpoints.SYSTEM_HEALTH);
    }

    // Device Management API
    async getDevices() {
        return this.request(this.endpoints.DEVICES);
    }

    async getDevice(deviceId) {
        return this.request(`${this.endpoints.DEVICES}/${deviceId}`);
    }

    async scanDevices() {
        return this.request(this.endpoints.DEVICE_SCAN, { method: 'POST' });
    }

    async pingDevice(deviceId) {
        const endpoint = this.formatEndpoint(this.endpoints.DEVICE_PING, { id: deviceId });
        return this.request(endpoint, { method: 'POST' });
    }

    async traceDevice(deviceId) {
        const endpoint = this.formatEndpoint(this.endpoints.DEVICE_TRACE, { id: deviceId });
        return this.request(endpoint, { method: 'POST' });
    }

    async updateDevice(deviceId, data) {
        return this.request(`${this.endpoints.DEVICES}/${deviceId}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    }

    // Network Events API
    async getEvents(filters = {}) {
        const queryParams = new URLSearchParams(filters).toString();
        const url = queryParams ? `${this.endpoints.EVENTS}?${queryParams}` : this.endpoints.EVENTS;
        return this.request(url);
    }

    async createEvent(eventData) {
        return this.request(this.endpoints.EVENTS, {
            method: 'POST',
            body: JSON.stringify(eventData)
        });
    }

    async exportEvents(format = 'csv', filters = {}) {
        const queryParams = new URLSearchParams({ format, ...filters }).toString();
        const url = `${this.endpoints.EVENTS_EXPORT}?${queryParams}`;
        
        const response = await fetch(`${this.baseUrl}${url}`, {
            headers: {
                'Authorization': `Bearer ${this.getAuthToken()}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`Export failed: ${response.statusText}`);
        }
        
        return response.blob();
    }

    // Security & Alerts API
    async getSecurityAlerts(severity = null) {
        const url = severity ? `${this.endpoints.SECURITY_ALERTS}?severity=${severity}` : this.endpoints.SECURITY_ALERTS;
        return this.request(url);
    }

    async getSecurityLogs(limit = 100) {
        return this.request(`${this.endpoints.SECURITY_LOGS}?limit=${limit}`);
    }

    async acknowledgeAlert(alertId) {
        return this.request(`${this.endpoints.SECURITY_ALERTS}/${alertId}/acknowledge`, {
            method: 'POST'
        });
    }

    // Traffic Analytics API
    async getRealTimeTraffic() {
        return this.request(this.endpoints.TRAFFIC_REAL_TIME);
    }

    async getHistoricalTraffic(timeRange = '24h', interval = '1h') {
        return this.request(`${this.endpoints.TRAFFIC_HISTORICAL}?range=${timeRange}&interval=${interval}`);
    }

    async getDeviceTraffic(deviceId, timeRange = '1h') {
        const endpoint = this.formatEndpoint(this.endpoints.TRAFFIC_BY_DEVICE, { id: deviceId });
        return this.request(`${endpoint}?range=${timeRange}`);
    }

    // Network Topology API
    async getNetworkTopology() {
        return this.request(this.endpoints.TOPOLOGY);
    }

    async getNetworkMap() {
        return this.request(this.endpoints.NETWORK_MAP);
    }

    // Configuration API
    async getDashboardConfig() {
        return this.request(this.endpoints.DASHBOARD_CONFIG);
    }

    async updateDashboardConfig(config) {
        return this.request(this.endpoints.DASHBOARD_CONFIG, {
            method: 'PUT',
            body: JSON.stringify(config)
        });
    }

    async getUserPreferences() {
        return this.request(this.endpoints.USER_PREFERENCES);
    }

    async updateUserPreferences(preferences) {
        return this.request(this.endpoints.USER_PREFERENCES, {
            method: 'PUT',
            body: JSON.stringify(preferences)
        });
    }

    // Batch API operations
    async batchRequest(requests) {
        const promises = requests.map(request => 
            this.request(request.endpoint, request.options)
                .catch(error => ({ error, request }))
        );
        
        return Promise.all(promises);
    }

    // Connection testing
    async testConnection() {
        try {
            await this.request('/health');
            return { status: 'connected', timestamp: new Date().toISOString() };
        } catch (error) {
            return { status: 'disconnected', error: error.message, timestamp: new Date().toISOString() };
        }
    }

    // Cache management
    clearCache() {
        this.requestQueue.clear();
        this.retryAttempts.clear();
    }
}

// WebSocket Service for real-time data
class WebSocketService {
    constructor(config) {
        this.config = config || window.CONFIG;
        this.url = this.config.WEBSOCKET.URL;
        this.channels = this.config.WEBSOCKET.CHANNELS;
        this.socket = null;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = this.config.WEBSOCKET.RECONNECT.MAX_ATTEMPTS;
        this.reconnectDelay = this.config.WEBSOCKET.RECONNECT.DELAY;
        this.eventListeners = new Map();
        this.isConnected = false;
        this.shouldReconnect = true;
    }

    connect() {
        try {
            console.log('🔌 Connecting to WebSocket:', this.url);
            this.socket = new WebSocket(this.url);
            
            this.socket.onopen = this.onOpen.bind(this);
            this.socket.onmessage = this.onMessage.bind(this);
            this.socket.onclose = this.onClose.bind(this);
            this.socket.onerror = this.onError.bind(this);
            
        } catch (error) {
            console.error('❌ WebSocket connection failed:', error);
            this.scheduleReconnect();
        }
    }

    onOpen(event) {
        console.log('✅ WebSocket connected');
        this.isConnected = true;
        this.reconnectAttempts = 0;
        
        // Subscribe to all channels
        Object.values(this.channels).forEach(channel => {
            this.subscribe(channel);
        });
        
        this.emit('connected', { timestamp: new Date().toISOString() });
    }

    onMessage(event) {
        try {
            const data = JSON.parse(event.data);
            console.log('📨 WebSocket message:', data);
            
            if (data.channel && data.type) {
                this.emit(`${data.channel}:${data.type}`, data.payload);
                this.emit(data.channel, data);
            }
            
        } catch (error) {
            console.error('❌ WebSocket message parsing error:', error);
        }
    }

    onClose(event) {
        console.log('🔌 WebSocket disconnected:', event.code, event.reason);
        this.isConnected = false;
        this.emit('disconnected', { code: event.code, reason: event.reason });
        
        if (this.shouldReconnect && event.code !== 1000) {
            this.scheduleReconnect();
        }
    }

    onError(error) {
        console.error('❌ WebSocket error:', error);
        this.emit('error', error);
    }

    subscribe(channel) {
        if (this.isConnected) {
            const message = {
                type: 'subscribe',
                channel: channel,
                timestamp: new Date().toISOString()
            };
            this.send(message);
            console.log(`📡 Subscribed to channel: ${channel}`);
        }
    }

    unsubscribe(channel) {
        if (this.isConnected) {
            const message = {
                type: 'unsubscribe',
                channel: channel,
                timestamp: new Date().toISOString()
            };
            this.send(message);
            console.log(`📡 Unsubscribed from channel: ${channel}`);
        }
    }

    send(data) {
        if (this.isConnected && this.socket.readyState === WebSocket.OPEN) {
            this.socket.send(JSON.stringify(data));
        } else {
            console.warn('⚠️ WebSocket not connected, message not sent:', data);
        }
    }

    scheduleReconnect() {
        if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('❌ Max reconnection attempts reached');
            this.emit('max-reconnects-reached');
            return;
        }

        const delay = this.reconnectDelay * Math.pow(
            this.config.WEBSOCKET.RECONNECT.BACKOFF_MULTIPLIER, 
            this.reconnectAttempts
        );

        console.log(`🔄 Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts + 1}/${this.maxReconnectAttempts})`);
        
        setTimeout(() => {
            this.reconnectAttempts++;
            this.connect();
        }, delay);
    }

    // Event listener management
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }

    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }

    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`❌ Error in event listener for ${event}:`, error);
                }
            });
        }
    }

    disconnect() {
        this.shouldReconnect = false;
        if (this.socket) {
            this.socket.close(1000, 'Manual disconnect');
        }
    }

    getConnectionStatus() {
        return {
            connected: this.isConnected,
            readyState: this.socket ? this.socket.readyState : WebSocket.CLOSED,
            reconnectAttempts: this.reconnectAttempts,
            url: this.url
        };
    }
}

// Export services
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ApiService, WebSocketService };
} else {
    window.ApiService = ApiService;
    window.WebSocketService = WebSocketService;
} 