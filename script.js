// Network Monitoring Dashboard JavaScript
class NetworkDashboard {
    constructor() {
        // Initialize services
        this.apiService = new ApiService();
        this.wsService = new WebSocketService();
        
        // Dashboard state
        this.data = {
            networkStats: {
                uptime: { value: 0, change: 0, trend: 'up' },
                bandwidth: { value: 0, change: 0, trend: 'up' },
                devices: { value: 0, change: 0, trend: 'up' },
                alerts: { value: 0, change: 0, trend: 'up' }
            },
            systemStats: {
                cpu: { value: 0, change: 0, trend: 'up' },
                memory: { value: 0, change: 0, trend: 'up' },
                disk: { value: 0, change: 0, trend: 'up' }
            },
            trafficData: {
                upload: [],
                download: [],
                timestamp: []
            },
            devices: [],
            events: []
        };
        
        this.filteredEvents = [];
        this.currentTheme = 'dark';
        this.monitoringInterval = null;
        this.pollingIntervals = new Map();
        this.isOnline = navigator.onLine;
        this.lastDataUpdate = null;
        
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupNotifications();
        this.setupSearch();
        this.setupTableSorting();
        this.setupDeviceScanning();
        this.setupConnectionMonitoring();
        
        // Load initial data
        await this.loadInitialData();
        
        // Setup real-time connections
        this.setupWebSocketConnection();
        this.setupPollingIntervals();
        
        // Load user preferences
        await this.loadUserPreferences();
        
        // Start monitoring
        this.startNetworkMonitoring();
        
        console.log('🚀 Network Dashboard initialized successfully!');
    }

    setupEventListeners() {
        // Sidebar toggle
        const menuToggle = document.querySelector('.menu-toggle');
        const sidebar = document.querySelector('.sidebar');
        
        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            localStorage.setItem('sidebarCollapsed', sidebar.classList.contains('collapsed'));
        });

        // Navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                
                const section = link.getAttribute('data-section');
                if (section) {
                    this.navigateToSection(section);
                }
            });
        });

        // Set initial section
        this.currentSection = 'overview';

        // Time filter
        const timeFilter = document.querySelector('.time-filter');
        if (timeFilter) {
            timeFilter.addEventListener('change', (e) => {
                this.updateTrafficData(e.target.value);
            });
        }

        // Export Log button
        const exportBtn = document.querySelector('.btn-primary');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportNetworkLog();
            });
        }

        // Add refresh button functionality
        this.addRefreshButton();
    }

    animateStats() {
        const statCards = document.querySelectorAll('.stats-grid .stat-card');
        
        statCards.forEach((card, index) => {
            const valueElement = card.querySelector('h3');
            const originalValue = valueElement.textContent;
            
            // Reset to 0 and animate to final value
            setTimeout(() => {
                this.animateNumber(valueElement, originalValue, 1500);
            }, index * 200);
        });
    }

    animateSystemStats() {
        const systemCards = document.querySelectorAll('.system-stats .stat-card');
        
        systemCards.forEach((card, index) => {
            const valueElement = card.querySelector('h3');
            const progressFill = card.querySelector('.progress-fill');
            const originalValue = valueElement.textContent;
            const percentage = parseFloat(originalValue.replace('%', ''));
            
            // Reset to 0 and animate to final value
            setTimeout(() => {
                this.animateNumber(valueElement, originalValue, 1500);
                if (progressFill) {
                    this.animateProgressBar(progressFill, percentage, 1500);
                }
            }, index * 200);
        });
        
        // Update with current data
        this.updateSystemProgressBars();
    }

    animateProgressBar(element, targetWidth, duration) {
        element.style.width = '0%';
        
        setTimeout(() => {
            element.style.transition = `width ${duration}ms cubic-bezier(0.4, 0, 0.2, 1)`;
            element.style.width = targetWidth + '%';
        }, 50);
    }

    updateSystemProgressBars() {
        // Update CPU progress
        const cpuFill = document.querySelector('.cpu-fill');
        if (cpuFill && this.data.systemStats?.cpu) {
            cpuFill.style.width = this.data.systemStats.cpu.value + '%';
            this.updateProgressColor(cpuFill, this.data.systemStats.cpu.value, 'cpu');
        }
        
        // Update Memory progress
        const memoryFill = document.querySelector('.memory-fill');
        if (memoryFill && this.data.systemStats?.memory) {
            memoryFill.style.width = this.data.systemStats.memory.value + '%';
            this.updateProgressColor(memoryFill, this.data.systemStats.memory.value, 'memory');
        }
        
        // Update Disk progress
        const diskFill = document.querySelector('.disk-fill');
        if (diskFill && this.data.systemStats?.disk) {
            diskFill.style.width = this.data.systemStats.disk.value + '%';
            this.updateProgressColor(diskFill, this.data.systemStats.disk.value, 'disk');
        }
    }

    updateProgressColor(element, value, type) {
        // Change color based on usage level
        element.classList.remove('low', 'medium', 'high', 'critical');
        
        if (value < 30) {
            element.classList.add('low');
        } else if (value < 60) {
            element.classList.add('medium');
        } else if (value < 85) {
            element.classList.add('high');
        } else {
            element.classList.add('critical');
        }
    }

    animateNumber(element, finalValue, duration) {
        const isPercentage = finalValue.includes('%');
        const isCurrency = finalValue.includes('$');
        const numericValue = parseFloat(finalValue.replace(/[$,%]/g, ''));
        
        const startTime = Date.now();
        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const currentValue = numericValue * easeOut;
            
            let displayValue = Math.floor(currentValue);
            if (isCurrency) {
                displayValue = '$' + displayValue.toLocaleString();
            } else if (isPercentage) {
                displayValue = currentValue.toFixed(1) + '%';
            } else {
                displayValue = displayValue.toLocaleString();
            }
            
            element.textContent = displayValue;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    }

    animateTrafficChart() {
        const uploadLine = document.querySelector('.upload-line');
        const downloadLine = document.querySelector('.download-line');
        
        if (uploadLine && downloadLine) {
            uploadLine.style.width = '0%';
            downloadLine.style.width = '0%';
            
            setTimeout(() => {
                uploadLine.style.transition = 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
                downloadLine.style.transition = 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)';
                uploadLine.style.width = '35%';
                downloadLine.style.width = '85%';
            }, 500);
        }
    }

    showChartTooltip(bar, index) {
        // Remove existing tooltips
        document.querySelectorAll('.chart-tooltip').forEach(tooltip => tooltip.remove());
        
        const tooltip = document.createElement('div');
        tooltip.className = 'chart-tooltip';
        tooltip.innerHTML = `
            <div class="tooltip-content">
                <strong>Day ${index + 1}</strong><br>
                Revenue: $${(Math.random() * 10000 + 5000).toFixed(0)}
            </div>
        `;
        
        const rect = bar.getBoundingClientRect();
        tooltip.style.position = 'absolute';
        tooltip.style.left = rect.left + 'px';
        tooltip.style.top = rect.top - 60 + 'px';
        tooltip.style.background = '#1e293b';
        tooltip.style.color = '#e2e8f0';
        tooltip.style.padding = '8px 12px';
        tooltip.style.borderRadius = '6px';
        tooltip.style.fontSize = '12px';
        tooltip.style.zIndex = '1000';
        tooltip.style.border = '1px solid #334155';
        tooltip.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        
        document.body.appendChild(tooltip);
        
        setTimeout(() => tooltip.remove(), 3000);
    }

    setupRealTimeMonitoring() {
        // Network monitoring updates every 10 seconds
        this.monitoringInterval = setInterval(() => {
            this.updateNetworkStats();
            this.simulateTrafficChanges();
            this.checkDeviceStatus();
        }, 10000);

        // Update timestamps every minute
        setInterval(() => {
            this.updateEventTimestamps();
        }, 60000);
    }

    // API Integration Methods
    async loadInitialData() {
        try {
            this.showLoadingState(true);
            
            // Test API connection first
            const connectionStatus = await this.apiService.testConnection();
            if (connectionStatus.status === 'disconnected') {
                this.showNotification('API server unavailable, using offline mode', 'warning');
                this.loadFallbackData();
                return;
            }

            // Load all initial data in parallel
            const [networkStats, systemHealth, devices, events, trafficData] = await Promise.all([
                this.apiService.getNetworkStats().catch(e => this.handleApiError('Network Stats', e)),
                this.apiService.getSystemHealth().catch(e => this.handleApiError('System Health', e)),
                this.apiService.getDevices().catch(e => this.handleApiError('Devices', e)),
                this.apiService.getEvents({ limit: 50 }).catch(e => this.handleApiError('Events', e)),
                this.apiService.getRealTimeTraffic().catch(e => this.handleApiError('Traffic', e))
            ]);

            // Update dashboard with API data
            if (networkStats) this.updateNetworkStatsFromApi(networkStats);
            if (systemHealth) this.updateSystemStatsFromApi(systemHealth);
            if (devices) this.updateDevicesFromApi(devices);
            if (events) this.updateEventsFromApi(events);
            if (trafficData) this.updateTrafficFromApi(trafficData);

            this.lastDataUpdate = new Date();
            this.showNotification('Dashboard data loaded successfully', 'success');
            
        } catch (error) {
            console.error('❌ Failed to load initial data:', error);
            this.showNotification('Failed to load data, using offline mode', 'error');
            this.loadFallbackData();
        } finally {
            this.showLoadingState(false);
        }
    }

    loadFallbackData() {
        // Fallback data when API is unavailable
        this.data = {
            networkStats: {
                uptime: { value: 98.7, change: 0.2, trend: 'up' },
                bandwidth: { value: 847, change: -5.1, trend: 'down' },
                devices: { value: 156, change: 3.2, trend: 'up' },
                alerts: { value: 23, change: 15.3, trend: 'down' }
            },
            systemStats: {
                cpu: { value: 45.2, change: -2.1, trend: 'down' },
                memory: { value: 67.8, change: 1.5, trend: 'up' },
                disk: { value: 82.1, change: 0.3, trend: 'up' }
            },
            trafficData: {
                upload: [35, 42, 38, 45, 40, 37, 41],
                download: [85, 78, 82, 90, 87, 83, 88],
                timestamp: Array.from({length: 7}, (_, i) => new Date(Date.now() - (6-i) * 60000))
            },
            devices: [
                { id: '1', ip: '192.168.1.10', name: 'Main Server', type: 'server', status: 'online', ping: 12, lastSeen: new Date() },
                { id: '2', ip: '192.168.1.1', name: 'WiFi Router', type: 'router', status: 'online', ping: 5, lastSeen: new Date() },
                { id: '3', ip: '192.168.1.25', name: 'Workstation-01', type: 'desktop', status: 'warning', ping: 45, lastSeen: new Date() },
                { id: '4', ip: '192.168.1.50', name: 'Network Printer', type: 'printer', status: 'offline', ping: null, lastSeen: new Date(Date.now() - 300000) }
            ],
            events: [
                { id: '1', timestamp: new Date().toLocaleTimeString(), type: 'Connection', device: '192.168.1.45', description: 'New device connected', severity: 'info', status: 'active' },
                { id: '2', timestamp: new Date(Date.now() - 300000).toLocaleTimeString(), type: 'Security', device: '192.168.1.1', description: 'Failed login attempt', severity: 'warning', status: 'monitoring' }
            ]
        };
        
        this.filteredEvents = [...this.data.events];
        this.updateDashboardUI();
    }

    setupWebSocketConnection() {
        if (!CONFIG.FEATURES.WEBSOCKET_ENABLED) {
            console.log('WebSocket disabled in configuration');
            return;
        }

        // Setup WebSocket event listeners
        this.wsService.on('connected', () => {
            this.showNotification('Real-time connection established', 'success');
            this.updateConnectionStatus(true);
        });

        // this.wsService.on('disconnected', () => {
        //     this.showNotification('Real-time connection lost', 'warning');
        //     this.updateConnectionStatus(false);
        // });

        // this.wsService.on('error', (error) => {
        //     console.error('WebSocket error:', error);
        //     this.showNotification('Real-time connection error', 'error');
        // });

        // Handle real-time data updates
        this.wsService.on(CONFIG.WEBSOCKET.CHANNELS.METRICS, (data) => {
            this.handleRealTimeMetrics(data);
        });

        this.wsService.on(CONFIG.WEBSOCKET.CHANNELS.SYSTEM_HEALTH, (data) => {
            this.handleSystemHealthUpdate(data);
        });

        this.wsService.on(CONFIG.WEBSOCKET.CHANNELS.EVENTS, (data) => {
            this.handleRealTimeEvent(data);
        });

        this.wsService.on(CONFIG.WEBSOCKET.CHANNELS.DEVICE_STATUS, (data) => {
            this.handleDeviceStatusUpdate(data);
        });

        this.wsService.on(CONFIG.WEBSOCKET.CHANNELS.TRAFFIC, (data) => {
            this.handleTrafficUpdate(data);
        });

        this.wsService.on(CONFIG.WEBSOCKET.CHANNELS.ALERTS, (data) => {
            this.handleSecurityAlert(data);
        });

        // Connect to WebSocket
        this.wsService.connect();
    }

    setupPollingIntervals() {
        // Setup polling for fallback when WebSocket is not available
        if (CONFIG.FEATURES.WEBSOCKET_ENABLED) {
            // Reduced polling when WebSocket is active
            this.setupReducedPolling();
        } else {
            // Full polling when WebSocket is disabled
            this.setupFullPolling();
        }
    }

    setupReducedPolling() {
        // Backup polling every 30 seconds
        this.pollingIntervals.set('backup', setInterval(async () => {
            if (!this.wsService.isConnected) {
                await this.pollNetworkStats();
            }
        }, 30000));
    }

    setupFullPolling() {
        // Network stats polling
        this.pollingIntervals.set('networkStats', setInterval(async () => {
            await this.pollNetworkStats();
        }, CONFIG.POLLING.NETWORK_STATS));

        // Device status polling
        this.pollingIntervals.set('deviceStatus', setInterval(async () => {
            await this.pollDeviceStatus();
        }, CONFIG.POLLING.DEVICE_STATUS));

        // Traffic data polling
        this.pollingIntervals.set('trafficData', setInterval(async () => {
            await this.pollTrafficData();
        }, CONFIG.POLLING.TRAFFIC_DATA));

        // Events polling
        this.pollingIntervals.set('events', setInterval(async () => {
            await this.pollEvents();
        }, CONFIG.POLLING.EVENTS));
    }

    async pollNetworkStats() {
        try {
            const [networkStats, systemHealth] = await Promise.all([
                this.apiService.getNetworkStats(),
                this.apiService.getSystemHealth()
            ]);
            
            if (networkStats) this.updateNetworkStatsFromApi(networkStats);
            if (systemHealth) this.updateSystemStatsFromApi(systemHealth);
        } catch (error) {
            this.handleApiError('Network Stats Polling', error);
        }
    }

    async pollDeviceStatus() {
        try {
            const devices = await this.apiService.getDevices();
            this.updateDevicesFromApi(devices);
        } catch (error) {
            this.handleApiError('Device Status Polling', error);
        }
    }

    async pollTrafficData() {
        try {
            const traffic = await this.apiService.getRealTimeTraffic();
            this.updateTrafficFromApi(traffic);
        } catch (error) {
            this.handleApiError('Traffic Data Polling', error);
        }
    }

    async pollEvents() {
        try {
            const events = await this.apiService.getEvents({ 
                since: this.lastDataUpdate?.toISOString() 
            });
            if (events && events.length > 0) {
                this.updateEventsFromApi(events, true);
            }
        } catch (error) {
            this.handleApiError('Events Polling', error);
        }
    }

    setupConnectionMonitoring() {
        // Monitor online/offline status
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.showNotification('Connection restored', 'success');
            this.loadInitialData();
        });

        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.showNotification('Connection lost - working offline', 'warning');
        });
    }

    startNetworkMonitoring() {
        this.showNotification('Network monitoring started', 'info');
        console.log('🔍 Network monitoring active...');
    }

    stopNetworkMonitoring() {
        // Clear all polling intervals
        this.pollingIntervals.forEach((interval, name) => {
            clearInterval(interval);
            console.log(`Stopped polling: ${name}`);
        });
        this.pollingIntervals.clear();

        // Disconnect WebSocket
        this.wsService.disconnect();

        this.showNotification('Network monitoring stopped', 'warning');
        console.log('🛑 Network monitoring stopped');
    }

    updateNetworkStats() {
        // Update uptime
        const uptimeCard = document.querySelector('.network-health h3');
        if (uptimeCard) {
            const currentUptime = parseFloat(uptimeCard.textContent.replace('%', ''));
            const newUptime = Math.max(95, Math.min(99.9, currentUptime + (Math.random() - 0.5) * 0.1));
            uptimeCard.textContent = newUptime.toFixed(1) + '%';
        }

        // Update bandwidth
        const bandwidthCard = document.querySelector('.bandwidth h3');
        if (bandwidthCard) {
            const newBandwidth = Math.floor(Math.random() * 200 + 700);
            bandwidthCard.textContent = newBandwidth + ' Mbps';
        }

        // Update device count
        const devicesCard = document.querySelector('.devices h3');
        if (devicesCard) {
            const activeDevices = this.data.devices.filter(d => d.status === 'online').length;
            devicesCard.textContent = activeDevices.toString();
        }
    }

    simulateTrafficChanges() {
        const uploadLine = document.querySelector('.upload-line');
        const downloadLine = document.querySelector('.download-line');
        
        if (uploadLine && downloadLine) {
            const newUpload = Math.random() * 20 + 25; // 25-45%
            const newDownload = Math.random() * 20 + 75; // 75-95%
            
            uploadLine.style.width = newUpload + '%';
            downloadLine.style.width = newDownload + '%';
            
            // Update legend values
            const uploadLegend = document.querySelector('.legend-item:first-child');
            const downloadLegend = document.querySelector('.legend-item:last-child');
            
            if (uploadLegend && downloadLegend) {
                const uploadSpeed = Math.floor(newUpload * 5);
                const downloadSpeed = Math.floor(newDownload * 10);
                
                uploadLegend.innerHTML = `<span class="legend-color upload"></span>Upload: ${uploadSpeed} Mbps`;
                downloadLegend.innerHTML = `<span class="legend-color download"></span>Download: ${downloadSpeed} Mbps`;
            }
        }
    }

    checkDeviceStatus() {
        this.data.devices.forEach((device, index) => {
            // Simulate device status changes
            if (Math.random() < 0.1) { // 10% chance of status change
                const deviceElement = document.querySelectorAll('.device-item')[index];
                if (deviceElement) {
                    // Randomly change status
                    const statuses = ['online', 'warning', 'offline'];
                    const currentStatus = device.status;
                    let newStatus = statuses[Math.floor(Math.random() * statuses.length)];
                    
                    // Prefer keeping devices online
                    if (Math.random() < 0.8 && currentStatus === 'online') {
                        newStatus = 'online';
                    }
                    
                    device.status = newStatus;
                    device.ping = newStatus === 'offline' ? null : Math.floor(Math.random() * 50 + 5);
                    
                    this.updateDeviceDisplay(deviceElement, device);
                    this.logNetworkEvent(device, newStatus);
                }
            }
        });
    }

    updateDeviceDisplay(element, device) {
        element.className = `device-item ${device.status}`;
        const statusBadge = element.querySelector('.status-badge');
        const pingElement = element.querySelector('.ping');
        
        if (statusBadge) {
            statusBadge.className = `status-badge ${device.status}`;
            statusBadge.textContent = device.status === 'online' ? 'Online' : 
                                    device.status === 'warning' ? 'High Load' : 'Offline';
        }
        
        if (pingElement) {
            pingElement.textContent = device.ping ? `${device.ping}ms` : '--';
        }
    }

    logNetworkEvent(device, status) {
        const event = {
            timestamp: new Date().toLocaleTimeString(),
            type: status === 'offline' ? 'Disconnection' : 'Status Change',
            device: device.ip,
            description: `${device.name} status changed to ${status}`,
            severity: status === 'offline' ? 'critical' : status === 'warning' ? 'warning' : 'info',
            status: status === 'online' ? 'active' : status
        };
        
        this.data.events.unshift(event);
        this.updateEventsTable();
        this.showNotification(`Device ${device.name} is now ${status}`, status === 'offline' ? 'error' : 'info');
    }

    addRandomActivity() {
        const activities = [
            { icon: 'fa-user-plus', text: 'New user registered' },
            { icon: 'fa-shopping-cart', text: `Order #${Math.floor(Math.random() * 9999)} completed` },
            { icon: 'fa-bell', text: 'System notification sent' },
            { icon: 'fa-chart-line', text: 'Analytics updated' }
        ];
        
        const randomActivity = activities[Math.floor(Math.random() * activities.length)];
        const activityList = document.querySelector('.activity-list');
        
        const newActivity = document.createElement('div');
        newActivity.className = 'activity-item';
        newActivity.style.opacity = '0';
        newActivity.innerHTML = `
            <div class="activity-icon">
                <i class="fas ${randomActivity.icon}"></i>
            </div>
            <div class="activity-content">
                <p>${randomActivity.text}</p>
                <span class="activity-time">Just now</span>
            </div>
        `;
        
        activityList.insertBefore(newActivity, activityList.firstChild);
        
        // Animate in
        setTimeout(() => {
            newActivity.style.transition = 'opacity 0.3s ease';
            newActivity.style.opacity = '1';
        }, 100);
        
        // Remove oldest if more than 4 activities
        const activities_elements = activityList.querySelectorAll('.activity-item');
        if (activities_elements.length > 4) {
            activities_elements[activities_elements.length - 1].remove();
        }
    }

    setupDeviceScanning() {
        const scanBtn = document.querySelector('.scan-btn');
        if (scanBtn) {
            scanBtn.addEventListener('click', () => {
                this.performNetworkScan();
            });
        }
    }

    async performNetworkScan() {
        const scanBtn = document.querySelector('.scan-btn');
        const originalText = scanBtn.innerHTML;
        
        scanBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Scanning...';
        scanBtn.disabled = true;
        
        try {
            // Call API to perform actual network scan
            const scanResult = await this.apiService.scanDevices();
            
            if (scanResult && scanResult.devices) {
                this.updateDevicesFromApi(scanResult.devices);
                this.showNotification(`Network scan completed - ${scanResult.devices.length} devices found`, 'success');
            } else {
                // Fallback simulation if API fails
                this.simulateNetworkScan();
                this.showNotification('Network scan completed (simulation)', 'info');
            }
            
        } catch (error) {
            console.error('Network scan failed:', error);
            this.simulateNetworkScan();
            this.showNotification('Network scan failed, using cached data', 'warning');
        } finally {
            scanBtn.innerHTML = originalText;
            scanBtn.disabled = false;
        }
    }

    simulateNetworkScan() {
        // Fallback simulation
        this.data.devices.forEach(device => {
            device.ping = Math.floor(Math.random() * 50 + 5);
            device.lastSeen = new Date();
        });
        this.updateDevicesList();
    }

    updateDevicesList() {
        const deviceList = document.querySelector('.device-list');
        if (!deviceList) return;

        deviceList.innerHTML = '';
        
        this.data.devices.forEach(device => {
            const deviceElement = document.createElement('div');
            deviceElement.className = `device-item ${device.status}`;
            
            const iconClass = this.getDeviceIcon(device.type);
            const statusText = device.status === 'online' ? 'Online' : 
                             device.status === 'warning' ? 'High Load' : 'Offline';
            
            deviceElement.innerHTML = `
                <div class="device-icon">
                    <i class="fas ${iconClass}"></i>
                </div>
                <div class="device-info">
                    <p>${device.name}</p>
                    <span class="device-ip">${device.ip}</span>
                    <span class="status-badge ${device.status}">${statusText}</span>
                </div>
                <div class="device-metrics">
                    <span class="ping">${device.ping ? device.ping + 'ms' : '--'}</span>
                </div>
            `;
            
            deviceElement.addEventListener('click', () => {
                this.showDeviceDetails(device);
            });
            
            deviceList.appendChild(deviceElement);
        });
    }

    getDeviceIcon(type) {
        switch(type) {
            case 'server': return 'fa-server';
            case 'router': return 'fa-wifi';
            case 'desktop': return 'fa-desktop';
            case 'laptop': return 'fa-laptop';
            case 'printer': return 'fa-print';
            default: return 'fa-question';
        }
    }

    showDeviceDetails(device) {
        this.showModal(`
            <h3>Device Details</h3>
            <div class="device-details">
                <p><strong>Name:</strong> ${device.name}</p>
                <p><strong>IP Address:</strong> ${device.ip}</p>
                <p><strong>Type:</strong> ${device.type}</p>
                <p><strong>Status:</strong> <span class="status-badge ${device.status}">${device.status}</span></p>
                <p><strong>Ping:</strong> ${device.ping ? device.ping + 'ms' : 'N/A'}</p>
                <p><strong>Last Seen:</strong> ${device.lastSeen.toLocaleString()}</p>
            </div>
            <div class="device-actions">
                <button class="btn-primary" onclick="window.networkDashboard.pingDevice('${device.ip}')">Ping Device</button>
                <button class="btn-secondary" onclick="window.networkDashboard.traceRoute('${device.ip}')">Trace Route</button>
            </div>
        `);
    }

    async pingDevice(ip) {
        try {
            this.showNotification(`Pinging ${ip}...`, 'info');
            
            const device = this.data.devices.find(d => d.ip === ip);
            if (device) {
                const result = await this.apiService.pingDevice(device.id);
                this.showNotification(`Ping to ${ip}: ${result.ping_ms}ms`, 'success');
            } else {
                throw new Error('Device not found');
            }
        } catch (error) {
            console.error('Ping failed:', error);
            // Fallback simulation
            const pingTime = Math.floor(Math.random() * 50 + 5);
            this.showNotification(`Ping to ${ip}: ${pingTime}ms (simulated)`, 'info');
        }
    }

    async traceRoute(ip) {
        try {
            this.showNotification(`Tracing route to ${ip}...`, 'info');
            
            const device = this.data.devices.find(d => d.ip === ip);
            if (device) {
                const result = await this.apiService.traceDevice(device.id);
                this.showNotification(`Route to ${ip} - ${result.hops} hops, ${result.total_time}ms`, 'success');
            } else {
                throw new Error('Device not found');
            }
        } catch (error) {
            console.error('Trace route failed:', error);
            // Fallback simulation
            this.showNotification(`Route to ${ip} completed - 4 hops (simulated)`, 'info');
        }
    }

    // UI Update Methods
    updateStatsDisplay() {
        this.animateStats();
    }

    updateSystemStatsDisplay() {
        this.animateSystemStats();
    }

    updateDeviceCount() {
        const activeDevices = this.data.devices.filter(d => d.status === 'online').length;
        this.data.networkStats.devices.value = activeDevices;
        this.updateStatsDisplay();
    }

    updateTrafficDisplay(upload, download) {
        const uploadLine = document.querySelector('.upload-line');
        const downloadLine = document.querySelector('.download-line');
        
        if (uploadLine && downloadLine) {
            const uploadPercent = Math.min(100, (upload / 1000) * 100); // Assume 1000 Mbps max
            const downloadPercent = Math.min(100, (download / 1000) * 100);
            
            uploadLine.style.width = uploadPercent + '%';
            downloadLine.style.width = downloadPercent + '%';
            
            // Update legend
            const uploadLegend = document.querySelector('.legend-item:first-child');
            const downloadLegend = document.querySelector('.legend-item:last-child');
            
            if (uploadLegend && downloadLegend) {
                uploadLegend.innerHTML = `<span class="legend-color upload"></span>Upload: ${upload} Mbps`;
                downloadLegend.innerHTML = `<span class="legend-color download"></span>Download: ${download} Mbps`;
            }
        }
    }

    updateTrafficChart() {
        // Update traffic chart with historical data
        if (this.data.trafficData.upload.length > 0) {
            // This could be enhanced with a proper charting library
            console.log('📈 Traffic chart updated with', this.data.trafficData.upload.length, 'data points');
        }
    }

    updateDashboardUI() {
        this.updateStatsDisplay();
        this.updateSystemStatsDisplay();
        this.updateDevicesList();
        this.updateEventsTable();
        this.updateTrafficChart();
    }

    updateConnectionStatus(connected) {
        const statusIndicator = this.createConnectionStatusIndicator();
        if (statusIndicator) {
            statusIndicator.className = `connection-status ${connected ? 'connected' : 'disconnected'}`;
            statusIndicator.title = connected ? 'Real-time connection active' : 'Real-time connection lost';
        }
    }

    createConnectionStatusIndicator() {
        let indicator = document.querySelector('.connection-status');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.className = 'connection-status';
            indicator.innerHTML = '<i class="fas fa-circle"></i>';
            
            const header = document.querySelector('.header-right');
            if (header) {
                header.insertBefore(indicator, header.firstChild);
            }
        }
        return indicator;
    }

    showLoadingState(show) {
        const dashboard = document.querySelector('.dashboard-content');
        if (show) {
            dashboard?.classList.add('loading');
        } else {
            dashboard?.classList.remove('loading');
        }
    }

    async loadUserPreferences() {
        try {
            const preferences = await this.apiService.getUserPreferences();
            if (preferences) {
                // Apply user preferences
                if (preferences.theme) this.currentTheme = preferences.theme;
                if (preferences.refreshInterval) CONFIG.DASHBOARD.REFRESH_INTERVAL = preferences.refreshInterval;
            }
        } catch (error) {
            console.log('Using default preferences');
            this.loadDefaultPreferences();
        }
    }

    loadDefaultPreferences() {
        const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (sidebarCollapsed) {
            document.querySelector('.sidebar')?.classList.add('collapsed');
        }
    }

    setupSearch() {
        const searchInput = document.querySelector('.search-box input');
        if (!searchInput) return;

        searchInput.addEventListener('input', (e) => {
            const searchTerm = e.target.value.toLowerCase();
            this.filterEvents(searchTerm);
        });

        // Add search suggestions
        this.addSearchSuggestions(searchInput);
    }

    addSearchSuggestions(searchInput) {
        const suggestions = document.createElement('div');
        suggestions.className = 'search-suggestions';
        suggestions.style.position = 'absolute';
        suggestions.style.top = '100%';
        suggestions.style.left = '0';
        suggestions.style.right = '0';
        suggestions.style.background = '#1e293b';
        suggestions.style.border = '1px solid #334155';
        suggestions.style.borderRadius = '0.5rem';
        suggestions.style.marginTop = '0.25rem';
        suggestions.style.zIndex = '1000';
        suggestions.style.display = 'none';
        
        searchInput.parentElement.style.position = 'relative';
        searchInput.parentElement.appendChild(suggestions);

        searchInput.addEventListener('focus', () => {
            if (searchInput.value.length > 0) {
                suggestions.style.display = 'block';
            }
        });

        searchInput.addEventListener('blur', () => {
            setTimeout(() => suggestions.style.display = 'none', 200);
        });
    }

    filterEvents(searchTerm) {
        this.filteredEvents = this.data.events.filter(event =>
            event.type.toLowerCase().includes(searchTerm) ||
            event.device.toLowerCase().includes(searchTerm) ||
            event.description.toLowerCase().includes(searchTerm) ||
            event.severity.toLowerCase().includes(searchTerm) ||
            event.status.toLowerCase().includes(searchTerm)
        );
        
        this.updateEventsTable();
    }

    updateEventsTable() {
        const tbody = document.querySelector('.data-table tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        
        this.filteredEvents.slice(0, 10).forEach(event => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${event.timestamp}</td>
                <td>${event.type}</td>
                <td>${event.device}</td>
                <td>${event.description}</td>
                <td><span class="status ${event.severity}">${event.severity}</span></td>
                <td><span class="status ${event.status}">${event.status}</span></td>
            `;
            
            row.addEventListener('click', () => {
                this.showEventDetails(event);
            });
            
            tbody.appendChild(row);
        });
    }

    showEventDetails(event) {
        this.showModal(`
            <h3>Event Details</h3>
            <div class="event-details">
                <p><strong>Timestamp:</strong> ${event.timestamp}</p>
                <p><strong>Type:</strong> ${event.type}</p>
                <p><strong>Device:</strong> ${event.device}</p>
                <p><strong>Description:</strong> ${event.description}</p>
                <p><strong>Severity:</strong> <span class="status ${event.severity}">${event.severity}</span></p>
                <p><strong>Status:</strong> <span class="status ${event.status}">${event.status}</span></p>
            </div>
        `);
    }

    setupTableSorting() {
        const headers = document.querySelectorAll('.data-table th');
        
        headers.forEach((header, index) => {
            header.style.cursor = 'pointer';
            header.addEventListener('click', () => {
                this.sortTable(index, header);
            });
            
            // Add sort indicator
            const sortIcon = document.createElement('i');
            sortIcon.className = 'fas fa-sort sort-icon';
            sortIcon.style.marginLeft = '0.5rem';
            sortIcon.style.opacity = '0.5';
            header.appendChild(sortIcon);
        });
    }

    sortTable(columnIndex, header) {
        const sortIcons = document.querySelectorAll('.sort-icon');
        sortIcons.forEach(icon => {
            icon.className = 'fas fa-sort sort-icon';
            icon.style.opacity = '0.5';
        });

        const sortIcon = header.querySelector('.sort-icon');
        const isAscending = sortIcon.classList.contains('fa-sort-up');
        
        sortIcon.className = `fas fa-sort-${isAscending ? 'down' : 'up'} sort-icon`;
        sortIcon.style.opacity = '1';

        // Sort the filtered events
        this.filteredEvents.sort((a, b) => {
            const values = Object.values(a);
            const aVal = values[columnIndex];
            const bVal = values[columnIndex];
            
            if (typeof aVal === 'number') {
                return isAscending ? bVal - aVal : aVal - bVal;
            } else {
                return isAscending ? bVal.localeCompare(aVal) : aVal.localeCompare(bVal);
            }
        });

        this.updateEventsTable();
    }

    async exportNetworkLog() {
        try {
            // Try to export via API first
            const blob = await this.apiService.exportEvents('csv', {
                startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                endDate: new Date().toISOString()
            });
            
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", `network_log_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            this.showNotification('Network log exported successfully', 'success');
            
        } catch (error) {
            console.error('API export failed, using fallback:', error);
            
            // Fallback to client-side export
            const csvContent = "data:text/csv;charset=utf-8," + 
                "Timestamp,Type,Device,Description,Severity,Status\n" +
                this.data.events.map(event => 
                    `${event.timestamp},${event.type},${event.device},"${event.description}",${event.severity},${event.status}`
                ).join("\n");
            
            const encodedUri = encodeURI(csvContent);
            const link = document.createElement("a");
            link.setAttribute("href", encodedUri);
            link.setAttribute("download", `network_log_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showNotification('Network log exported (offline)', 'info');
        }
    }

    // API Data Update Methods
    updateNetworkStatsFromApi(apiData) {
        if (!apiData) return;
        
        this.data.networkStats = {
            uptime: {
                value: apiData.uptime?.percentage || 0,
                change: apiData.uptime?.change || 0,
                trend: apiData.uptime?.change >= 0 ? 'up' : 'down'
            },
            bandwidth: {
                value: apiData.bandwidth?.current || 0,
                change: apiData.bandwidth?.change || 0,
                trend: apiData.bandwidth?.change >= 0 ? 'up' : 'down'
            },
            devices: {
                value: apiData.devices?.total || 0,
                change: apiData.devices?.change || 0,
                trend: apiData.devices?.change >= 0 ? 'up' : 'down'
            },
            alerts: {
                value: apiData.alerts?.active || 0,
                change: apiData.alerts?.change || 0,
                trend: apiData.alerts?.change >= 0 ? 'down' : 'up' // More alerts is bad
            }
        };
        
        this.updateStatsDisplay();
    }

    updateSystemStatsFromApi(apiData) {
        if (!apiData) return;
        
        this.data.systemStats = {
            cpu: {
                value: apiData.cpu_usage || 0,
                change: apiData.cpu_change || 0,
                trend: apiData.cpu_change <= 0 ? 'up' : 'down' // Lower CPU usage is better
            },
            memory: {
                value: apiData.memory_usage || 0,
                change: apiData.memory_change || 0,
                trend: apiData.memory_change <= 0 ? 'up' : 'down' // Lower memory usage is better
            },
            disk: {
                value: apiData.disk_usage || 0,
                change: apiData.disk_change || 0,
                trend: apiData.disk_change <= 0 ? 'up' : 'down' // Lower disk usage is better
            }
        };
        
        this.updateSystemStatsDisplay();
    }

    updateDevicesFromApi(apiData) {
        if (!apiData || !Array.isArray(apiData)) return;
        
        this.data.devices = apiData.map(device => ({
            id: device.id,
            ip: device.ip_address || device.ip,
            name: device.hostname || device.name || `Device-${device.ip}`,
            type: device.device_type || device.type || 'unknown',
            status: device.status || 'unknown',
            ping: device.ping_ms || device.ping || null,
            lastSeen: device.last_seen ? new Date(device.last_seen) : new Date(),
            mac: device.mac_address,
            vendor: device.vendor
        }));
        
        this.updateDevicesList();
        this.updateDeviceCount();
    }

    updateEventsFromApi(apiData, append = false) {
        if (!apiData || !Array.isArray(apiData)) return;
        
        const newEvents = apiData.map(event => ({
            id: event.id,
            timestamp: event.timestamp ? new Date(event.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString(),
            type: event.event_type || event.type,
            device: event.device_ip || event.device,
            description: event.description || event.message,
            severity: event.severity || event.level || 'info',
            status: event.status || 'active'
        }));
        
        if (append) {
            this.data.events = [...newEvents, ...this.data.events];
            // Keep only the latest events
            this.data.events = this.data.events.slice(0, CONFIG.DASHBOARD.MAX_EVENTS);
        } else {
            this.data.events = newEvents;
        }
        
        this.filteredEvents = [...this.data.events];
        this.updateEventsTable();
    }

    updateTrafficFromApi(apiData) {
        if (!apiData) return;
        
        if (apiData.historical) {
            // Historical data for charts
            this.data.trafficData = {
                upload: apiData.historical.upload || [],
                download: apiData.historical.download || [],
                timestamp: apiData.historical.timestamps ? 
                    apiData.historical.timestamps.map(t => new Date(t)) : 
                    Array.from({length: apiData.historical.upload?.length || 0}, (_, i) => new Date(Date.now() - (i * 60000)))
            };
        }
        
        if (apiData.realtime) {
            // Real-time data for current display
            this.updateTrafficDisplay(apiData.realtime.upload, apiData.realtime.download);
        }
        
        this.updateTrafficChart();
    }

    // Real-time Event Handlers
    handleRealTimeMetrics(data) {
        console.log('📊 Real-time metrics update:', data);
        if (data.network) this.updateNetworkStatsFromApi(data.network);
        if (data.system) this.updateSystemStatsFromApi(data.system);
        this.lastDataUpdate = new Date();
    }

    handleSystemHealthUpdate(data) {
        console.log('💻 System health update:', data);
        this.updateSystemStatsFromApi(data);
        this.lastDataUpdate = new Date();
        
        // Show alerts for high resource usage
        if (data.cpu_usage > 90) {
            this.showNotification(`High CPU usage: ${data.cpu_usage}%`, 'warning');
        }
        if (data.memory_usage > 90) {
            this.showNotification(`High memory usage: ${data.memory_usage}%`, 'warning');
        }
        if (data.disk_usage > 95) {
            this.showNotification(`Disk space critical: ${data.disk_usage}%`, 'error');
        }
    }

    handleRealTimeEvent(data) {
        console.log('📝 Real-time event:', data);
        const newEvent = {
            id: data.id || Date.now(),
            timestamp: new Date().toLocaleTimeString(),
            type: data.type,
            device: data.device,
            description: data.description,
            severity: data.severity || 'info',
            status: data.status || 'active'
        };
        
        this.data.events.unshift(newEvent);
        this.data.events = this.data.events.slice(0, CONFIG.DASHBOARD.MAX_EVENTS);
        this.filteredEvents = [...this.data.events];
        this.updateEventsTable();
        
        // Show notification for important events
        if (data.severity === 'critical' || data.severity === 'warning') {
            this.showNotification(data.description, data.severity === 'critical' ? 'error' : 'warning');
        }
    }

    handleDeviceStatusUpdate(data) {
        console.log('🖥️ Device status update:', data);
        const deviceIndex = this.data.devices.findIndex(d => d.id === data.device_id || d.ip === data.device_ip);
        
        if (deviceIndex !== -1) {
            this.data.devices[deviceIndex] = {
                ...this.data.devices[deviceIndex],
                status: data.status,
                ping: data.ping,
                lastSeen: new Date()
            };
            
            this.updateDevicesList();
            
            // Log status change event
            if (data.status_changed) {
                this.handleRealTimeEvent({
                    type: 'Status Change',
                    device: data.device_ip,
                    description: `Device ${data.device_ip} status changed to ${data.status}`,
                    severity: data.status === 'offline' ? 'warning' : 'info'
                });
            }
        }
    }

    handleTrafficUpdate(data) {
        console.log('🌐 Traffic update:', data);
        this.updateTrafficDisplay(data.upload, data.download);
        
        // Update traffic history
        if (this.data.trafficData.upload.length >= 20) {
            this.data.trafficData.upload.shift();
            this.data.trafficData.download.shift();
            this.data.trafficData.timestamp.shift();
        }
        
        this.data.trafficData.upload.push(data.upload);
        this.data.trafficData.download.push(data.download);
        this.data.trafficData.timestamp.push(new Date());
    }

    handleSecurityAlert(data) {
        console.log('🚨 Security alert:', data);
        this.showNotification(`Security Alert: ${data.description}`, 'error');
        
        // Add to events
        this.handleRealTimeEvent({
            type: 'Security Alert',
            device: data.source_ip,
            description: data.description,
            severity: 'critical',
            status: 'active'
        });
        
        // Update alert count
        this.data.networkStats.alerts.value++;
        this.updateStatsDisplay();
    }

    // Error Handling
    handleApiError(operation, error) {
        console.error(`❌ ${operation} error:`, error);
        
        if (CONFIG.ERROR.SHOW_NOTIFICATIONS) {
            this.showNotification(`${operation} failed: ${error.message}`, 'error');
        }
        
        return null;
    }

    showModal(content) {
        // Remove existing modal
        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content">
                <button class="modal-close">&times;</button>
                ${content}
            </div>
        `;

        document.body.appendChild(modal);

        // Add styles
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.background = 'rgba(0, 0, 0, 0.8)';
        modal.style.display = 'flex';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.zIndex = '10000';

        const modalContent = modal.querySelector('.modal-content');
        modalContent.style.background = '#1e293b';
        modalContent.style.border = '1px solid #334155';
        modalContent.style.borderRadius = '1rem';
        modalContent.style.padding = '2rem';
        modalContent.style.maxWidth = '500px';
        modalContent.style.width = '90%';
        modalContent.style.position = 'relative';
        modalContent.style.color = '#e2e8f0';

        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.style.position = 'absolute';
        closeBtn.style.top = '1rem';
        closeBtn.style.right = '1rem';
        closeBtn.style.background = 'none';
        closeBtn.style.border = 'none';
        closeBtn.style.color = '#94a3b8';
        closeBtn.style.fontSize = '1.5rem';
        closeBtn.style.cursor = 'pointer';

        // Event listeners
        closeBtn.addEventListener('click', () => modal.remove());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    setupNotifications() {
        // Add notification system
        const notificationContainer = document.createElement('div');
        notificationContainer.className = 'notification-container';
        notificationContainer.style.position = 'fixed';
        notificationContainer.style.top = '1rem';
        notificationContainer.style.right = '1rem';
        notificationContainer.style.zIndex = '10000';
        document.body.appendChild(notificationContainer);
    }

    showNotification(message, type = 'info') {
        const container = document.querySelector('.notification-container');
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;

        notification.style.background = type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6';
        notification.style.color = 'white';
        notification.style.padding = '1rem 1.5rem';
        notification.style.borderRadius = '0.5rem';
        notification.style.marginBottom = '0.5rem';
        notification.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.3)';
        notification.style.transform = 'translateX(100%)';
        notification.style.transition = 'transform 0.3s ease';

        container.appendChild(notification);

        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 100);

        setTimeout(() => {
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    addRefreshButton() {
        const header = document.querySelector('.top-header .header-right');
        const refreshBtn = document.createElement('button');
        refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
        refreshBtn.className = 'refresh-btn';
        refreshBtn.style.background = 'none';
        refreshBtn.style.border = '1px solid #334155';
        refreshBtn.style.color = '#cbd5e1';
        refreshBtn.style.padding = '0.5rem';
        refreshBtn.style.borderRadius = '0.5rem';
        refreshBtn.style.cursor = 'pointer';
        refreshBtn.style.transition = 'all 0.3s ease';

        refreshBtn.addEventListener('click', () => {
            refreshBtn.style.transform = 'rotate(360deg)';
            this.refreshDashboard();
            setTimeout(() => {
                refreshBtn.style.transform = 'rotate(0deg)';
            }, 500);
        });

        header.insertBefore(refreshBtn, header.firstChild);
    }

    refreshDashboard() {
        this.updateStatsRandomly();
        this.addRandomActivity();
        this.showNotification('Dashboard refreshed successfully!', 'success');
    }

    updateTrafficData(period) {
        // Update traffic chart based on selected time period
        this.simulateTrafficChanges();
        this.showNotification(`Traffic data updated for ${period}`, 'info');
    }

    updateEventTimestamps() {
        // Update event timestamps to reflect passage of time
        const now = new Date();
        this.data.events.forEach(event => {
            if (event.timestamp && !event.timestamp.includes(':')) {
                event.timestamp = now.toLocaleTimeString();
            }
        });
    }

    loadUserPreferences() {
        const sidebarCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (sidebarCollapsed) {
            document.querySelector('.sidebar').classList.add('collapsed');
        }
    }

    refreshDashboard() {
        this.updateNetworkStats();
        this.simulateTrafficChanges();
        this.performNetworkScan();
        this.showNotification('Network dashboard refreshed successfully!', 'success');
    }

    navigateToSection(sectionName) {
        console.log(`🧭 Navigating to section: ${sectionName}`);
        
        // Update active navigation link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
        
        // Hide all sections
        document.querySelectorAll('.section-content').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show target section
        const targetSection = document.querySelector(`.section-content[data-section="${sectionName}"]`);
        if (targetSection) {
            targetSection.classList.add('active');
            
            // Update page title
            this.updatePageTitle(sectionName);
            
            // Initialize section-specific functionality
            this.initializeSectionContent(sectionName);
        }
        
        this.currentSection = sectionName;
    }

    updatePageTitle(sectionName) {
        const titles = {
            overview: 'Network Overview',
            devices: 'Network Devices', 
            traffic: 'Network Traffic',
            security: 'Security Overview',
            alerts: 'System Alerts',
            reports: 'Reports & Analytics',
            settings: 'System Settings'
        };
        
        const headerTitle = document.querySelector('.top-header h1');
        if (headerTitle) {
            headerTitle.textContent = titles[sectionName] || 'Dashboard';
        }
        
        // Update browser title
        document.title = `${titles[sectionName] || 'Dashboard'} - NetMonitor`;
    }

    initializeSectionContent(sectionName) {
        switch (sectionName) {
            case 'overview':
                this.initializeOverviewSection();
                break;
            case 'devices':
                this.initializeDevicesSection();
                break;
            case 'traffic':
                this.initializeTrafficSection();
                break;
            case 'security':
                this.initializeSecuritySection();
                break;
            case 'alerts':
                this.initializeAlertsSection();
                break;
            case 'reports':
                this.initializeReportsSection();
                break;
            case 'settings':
                this.initializeSettingsSection();
                break;
        }
    }

    initializeOverviewSection() {
        // Reinitialize overview dashboard functionality
        this.updateStatsDisplay();
        this.updateSystemStatsDisplay();
        this.updateDevicesList();
        this.updateEventsTable();
        this.updateTrafficChart();
    }

    initializeDevicesSection() {
        console.log('🖥️ Initializing devices section...');
        // Initialize device management
        this.setupDeviceManagement();
        
        // Initialize device manager if not already done
        if (!deviceManager) {
            console.log('🔧 Creating new DeviceManager instance...');
            deviceManager = new DeviceManager();
            this.deviceManager = deviceManager;
            window.deviceManager = deviceManager; // Ensure global access
            console.log('✅ DeviceManager created and assigned globally');
        } else {
            console.log('♻️ Using existing DeviceManager instance');
        }
    }

    initializeTrafficSection() {
        console.log('🌐 Initializing traffic section...');
        // Initialize traffic monitoring
        this.setupTrafficMonitoring();
        
        // Initialize traffic charts if not already done
        if (!this.trafficMonitor) {
            this.trafficMonitor = new TrafficMonitor();
        }
    }

    initializeSecuritySection() {
        console.log('🔒 Initializing security section...');
        // Initialize security monitoring
        this.setupSecurityMonitoring();
    }

    initializeAlertsSection() {
        console.log('🚨 Initializing alerts section...');
        // Initialize alerts functionality
        this.setupAlertsMonitoring();
    }

    initializeReportsSection() {
        console.log('📊 Initializing reports section...');
        // Initialize reports functionality
        this.setupReportsGeneration();
    }

    initializeSettingsSection() {
        console.log('⚙️ Initializing settings section...');
        // Initialize settings functionality
        this.setupSettingsManagement();
    }

    // Section-specific initialization methods
    setupTrafficMonitoring() {
        // Implement traffic monitoring initialization
        const trafficChart = document.querySelector('.traffic-chart .chart-placeholder');
        if (trafficChart) {
            trafficChart.innerHTML = `
                <i class="fas fa-chart-area"></i>
                <p>Real-time traffic monitoring active</p>
                <small style="color: var(--text-muted);">Live data will be displayed here</small>
            `;
        }
    }

    setupSecurityMonitoring() {
        // Implement security monitoring initialization
        this.loadSecurityEvents();
    }

    setupAlertsMonitoring() {
        // Implement alerts monitoring initialization
        this.loadSystemAlerts();
    }

    setupReportsGeneration() {
        // Setup report generation functionality
        const reportButtons = document.querySelectorAll('.report-card .btn');
        reportButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const reportType = e.target.closest('.report-card').querySelector('h3').textContent;
                this.generateReport(reportType);
            });
        });
    }

    setupSettingsManagement() {
        // Setup theme switching functionality
        this.setupThemeSwitcher();
        
        // Setup other settings functionality
        const settingsForm = document.querySelector('.settings-form');
        if (settingsForm) {
            const saveBtn = document.getElementById('saveAllSettings');
            if (saveBtn) {
                saveBtn.addEventListener('click', () => {
                    this.saveAllSettings();
                });
            }
        }
        
        // Load saved settings
        this.loadUserSettings();
    }

    setupThemeSwitcher() {
        // Theme selector functionality
        const themeOptions = document.querySelectorAll('.theme-option');
        const themeRadios = document.querySelectorAll('input[name="theme"]');
        
        themeOptions.forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.getAttribute('data-theme');
                const radio = option.querySelector('input[type="radio"]');
                
                // Update radio selection
                themeRadios.forEach(r => r.checked = false);
                radio.checked = true;
                
                // Update visual selection
                themeOptions.forEach(opt => opt.classList.remove('selected'));
                option.classList.add('selected');
                
                // Apply theme
                this.setTheme(theme);
            });
        });
        
        // Font size selector
        const fontSizeSelect = document.getElementById('fontSize');
        if (fontSizeSelect) {
            fontSizeSelect.addEventListener('change', (e) => {
                this.setFontSize(e.target.value);
            });
        }
        
        // Reduced motion toggle
        const reducedMotionToggle = document.getElementById('reducedMotion');
        if (reducedMotionToggle) {
            reducedMotionToggle.addEventListener('change', (e) => {
                this.setReducedMotion(e.target.checked);
            });
        }
        
        // Compact mode toggle
        const compactModeToggle = document.getElementById('compactMode');
        if (compactModeToggle) {
            compactModeToggle.addEventListener('change', (e) => {
                this.setCompactMode(e.target.checked);
            });
        }
    }

    setTheme(theme) {
        console.log(`🎨 Switching to ${theme} theme`);
        
        // Apply theme to document
        document.documentElement.setAttribute('data-theme', theme);
        
        // Save preference
        localStorage.setItem('dashboard-theme', theme);
        this.currentTheme = theme;
        
        // Show notification
        this.showNotification(`Switched to ${theme} theme`, 'success');
        
        // Update theme indicator in other parts of the UI if needed
        this.updateThemeIndicators(theme);
    }

    setFontSize(size) {
        console.log(`📝 Setting font size to ${size}`);
        
        document.documentElement.setAttribute('data-font-size', size);
        localStorage.setItem('dashboard-font-size', size);
        
        this.showNotification(`Font size changed to ${size}`, 'success');
    }

    setReducedMotion(enabled) {
        console.log(`${enabled ? '⏸️' : '▶️'} ${enabled ? 'Enabling' : 'Disabling'} reduced motion`);
        
        if (enabled) {
            document.documentElement.setAttribute('data-reduced-motion', 'true');
        } else {
            document.documentElement.removeAttribute('data-reduced-motion');
        }
        
        localStorage.setItem('dashboard-reduced-motion', enabled.toString());
        this.showNotification(`Animations ${enabled ? 'reduced' : 'enabled'}`, 'success');
    }

    setCompactMode(enabled) {
        console.log(`${enabled ? '📏' : '📐'} ${enabled ? 'Enabling' : 'Disabling'} compact mode`);
        
        if (enabled) {
            document.documentElement.setAttribute('data-compact-mode', 'true');
        } else {
            document.documentElement.removeAttribute('data-compact-mode');
        }
        
        localStorage.setItem('dashboard-compact-mode', enabled.toString());
        this.showNotification(`Compact mode ${enabled ? 'enabled' : 'disabled'}`, 'success');
    }

    updateThemeIndicators(theme) {
        // Update any theme indicators in the UI
        const themeIndicators = document.querySelectorAll('.theme-indicator');
        themeIndicators.forEach(indicator => {
            indicator.textContent = theme.charAt(0).toUpperCase() + theme.slice(1);
            indicator.className = `theme-indicator theme-${theme}`;
        });
    }

    loadUserSettings() {
        // Load theme preference
        const savedTheme = localStorage.getItem('dashboard-theme') || 'dark';
        const savedFontSize = localStorage.getItem('dashboard-font-size') || 'medium';
        const savedReducedMotion = localStorage.getItem('dashboard-reduced-motion') === 'true';
        const savedCompactMode = localStorage.getItem('dashboard-compact-mode') === 'true';
        
        // Apply saved theme
        this.setTheme(savedTheme);
        
        // Update theme selector
        const themeRadio = document.getElementById(`theme-${savedTheme}`);
        if (themeRadio) {
            themeRadio.checked = true;
            themeRadio.closest('.theme-option').classList.add('selected');
        }
        
        // Apply other settings
        this.setFontSize(savedFontSize);
        this.setReducedMotion(savedReducedMotion);
        this.setCompactMode(savedCompactMode);
        
        // Update UI controls
        const fontSizeSelect = document.getElementById('fontSize');
        const reducedMotionToggle = document.getElementById('reducedMotion');
        const compactModeToggle = document.getElementById('compactMode');
        
        if (fontSizeSelect) fontSizeSelect.value = savedFontSize;
        if (reducedMotionToggle) reducedMotionToggle.checked = savedReducedMotion;
        if (compactModeToggle) compactModeToggle.checked = savedCompactMode;
        
        // Load other dashboard settings
        this.loadDashboardSettings();
    }

    loadDashboardSettings() {
        // Load monitoring settings
        const savedMonitoringInterval = localStorage.getItem('dashboard-monitoring-interval') || '60';
        const savedAlertThreshold = localStorage.getItem('dashboard-alert-threshold') || 'medium';
        const savedRealtimeMonitoring = localStorage.getItem('dashboard-realtime-monitoring') !== 'false';
        const savedEmailNotifications = localStorage.getItem('dashboard-email-notifications') !== 'false';
        const savedSoundAlerts = localStorage.getItem('dashboard-sound-alerts') === 'true';
        
        // Update UI controls
        const monitoringIntervalSelect = document.getElementById('monitoringInterval');
        const alertThresholdSelect = document.getElementById('alertThreshold');
        const realtimeMonitoringToggle = document.getElementById('realtimeMonitoring');
        const emailNotificationsToggle = document.getElementById('emailNotifications');
        const soundAlertsToggle = document.getElementById('soundAlerts');
        
        if (monitoringIntervalSelect) monitoringIntervalSelect.value = savedMonitoringInterval;
        if (alertThresholdSelect) alertThresholdSelect.value = savedAlertThreshold;
        if (realtimeMonitoringToggle) realtimeMonitoringToggle.checked = savedRealtimeMonitoring;
        if (emailNotificationsToggle) emailNotificationsToggle.checked = savedEmailNotifications;
        if (soundAlertsToggle) soundAlertsToggle.checked = savedSoundAlerts;
    }

    saveAllSettings() {
        console.log('💾 Saving all settings...');
        
        // Get all setting values
        const monitoringInterval = document.getElementById('monitoringInterval')?.value;
        const alertThreshold = document.getElementById('alertThreshold')?.value;
        const realtimeMonitoring = document.getElementById('realtimeMonitoring')?.checked;
        const emailNotifications = document.getElementById('emailNotifications')?.checked;
        const soundAlerts = document.getElementById('soundAlerts')?.checked;
        
        // Save dashboard settings
        if (monitoringInterval) localStorage.setItem('dashboard-monitoring-interval', monitoringInterval);
        if (alertThreshold) localStorage.setItem('dashboard-alert-threshold', alertThreshold);
        if (realtimeMonitoring !== undefined) localStorage.setItem('dashboard-realtime-monitoring', realtimeMonitoring.toString());
        if (emailNotifications !== undefined) localStorage.setItem('dashboard-email-notifications', emailNotifications.toString());
        if (soundAlerts !== undefined) localStorage.setItem('dashboard-sound-alerts', soundAlerts.toString());
        
        // Apply settings
        if (monitoringInterval) {
            this.updateMonitoringInterval(parseInt(monitoringInterval));
        }
        
        this.showNotification('All settings saved successfully!', 'success');
    }

    updateMonitoringInterval(intervalSeconds) {
        // Update polling intervals based on user preference
        this.setupPollingIntervals();
        console.log(`⏱️ Monitoring interval updated to ${intervalSeconds} seconds`);
    }

    loadSecurityEvents() {
        // Load and display security events
        console.log('🔍 Loading security events...');
    }

    loadSystemAlerts() {
        // Load and display system alerts
        console.log('📢 Loading system alerts...');
    }

    generateReport(reportType) {
        console.log(`📋 Generating ${reportType} report...`);
        this.showNotification(`Generating ${reportType}...`, 'info');
        
        // Simulate report generation
        setTimeout(() => {
            this.showNotification(`${reportType} generated successfully!`, 'success');
        }, 2000);
    }


}

// Device Manager Class for Device CRUD Operations
class DeviceManager {
    constructor() {
        console.log('🏗️ DeviceManager constructor called');
        this.devices = [];
        this.filteredDevices = [];
        this.loadDevicesFromStorage();
        this.init();
        console.log('✅ DeviceManager fully initialized');
    }

    init() {
        console.log('🖥️ Initializing Device Manager...');
        this.setupEventListeners();
        this.renderDevices();
        this.updateDeviceStats();
        
        // Add debug method to global scope
        window.debugDevices = () => {
            console.log('🔍 Device Manager Debug Info:');
            console.log('Total devices:', this.devices.length);
            console.log('Filtered devices:', this.filteredDevices.length);
            console.log('Devices array:', this.devices);
            console.log('DevicesGrid element:', document.getElementById('devicesGrid'));
            console.log('Discovery status element:', document.getElementById('discoveryStatus'));
            console.log('Discover button element:', document.getElementById('discoverDevices'));
        };
        
        // Add manual test discovery function
        window.testDiscovery = () => {
            console.log('🧪 Testing discovery manually...');
            if (this.discoverNetworkDevices) {
                this.discoverNetworkDevices();
            } else {
                console.error('❌ discoverNetworkDevices method not found!');
            }
        };
    }

    setupEventListeners() {
        // Add Device button
        const addDeviceBtn = document.getElementById('addDevice');
        if (addDeviceBtn) {
            addDeviceBtn.addEventListener('click', () => {
                this.openAddDeviceModal();
            });
        }

        // Discover Devices button
        const discoverBtn = document.getElementById('discoverDevices');
        if (discoverBtn) {
            console.log('✅ Discover button found, adding event listener');
            discoverBtn.addEventListener('click', () => {
                console.log('🔘 Discover button clicked!');
                this.discoverNetworkDevices();
            });
        } else {
            console.error('❌ Discover button not found!');
        }

        // Refresh Devices button
        const refreshBtn = document.getElementById('refreshDevices');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.refreshDevices();
            });
        }

        // Search functionality
        const searchInput = document.getElementById('deviceSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchDevices(e.target.value);
            });
        }

        // Modal controls
        const modal = document.getElementById('addDeviceModal');
        const closeModal = document.getElementById('closeAddDeviceModal');
        const cancelBtn = document.getElementById('cancelAddDevice');

        if (closeModal) {
            closeModal.addEventListener('click', () => {
                this.closeAddDeviceModal();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                this.closeAddDeviceModal();
            });
        }

        // Close modal on overlay click
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeAddDeviceModal();
                }
            });
        }

        // Form submission
        const form = document.getElementById('addDeviceForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAddDevice();
            });
        }

        // Test Connection button
        const testBtn = document.getElementById('testConnection');
        if (testBtn) {
            testBtn.addEventListener('click', () => {
                this.testDeviceConnection();
            });
        }

        // Filters
        const statusFilter = document.getElementById('statusFilter');
        const typeFilter = document.getElementById('typeFilter');

        if (statusFilter) {
            statusFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        if (typeFilter) {
            typeFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        // Real-time input validation
        this.setupFormValidation();
    }

    setupFormValidation() {
        const ipInput = document.getElementById('ipAddress');
        const macInput = document.getElementById('macAddress');
        const nameInput = document.getElementById('deviceName');

        if (ipInput) {
            ipInput.addEventListener('input', () => {
                this.validateIP(ipInput);
            });
        }

        if (macInput) {
            macInput.addEventListener('input', () => {
                this.validateMAC(macInput);
            });
        }

        if (nameInput) {
            nameInput.addEventListener('input', () => {
                this.validateDeviceName(nameInput);
            });
        }
    }

    validateIP(input) {
        const value = input.value;
        const ipPattern = /^((25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
        const errorElement = document.getElementById('ipAddressError');

        input.classList.remove('error', 'success');
        
        if (value && !ipPattern.test(value)) {
            input.classList.add('error');
            if (errorElement) {
                errorElement.textContent = 'Please enter a valid IP address (e.g., 192.168.1.100)';
                errorElement.classList.add('show');
            }
            return false;
        } else if (value) {
            // Check for duplicate IP
            const isDuplicate = this.devices.some(device => device.ipAddress === value);
            if (isDuplicate) {
                input.classList.add('error');
                if (errorElement) {
                    errorElement.textContent = 'This IP address is already in use';
                    errorElement.classList.add('show');
                }
                return false;
            } else {
                input.classList.add('success');
                if (errorElement) {
                    errorElement.classList.remove('show');
                }
                return true;
            }
        } else {
            if (errorElement) {
                errorElement.classList.remove('show');
            }
            return false;
        }
    }

    validateMAC(input) {
        const value = input.value;
        const macPattern = /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/;
        const errorElement = document.getElementById('macAddressError');

        input.classList.remove('error', 'success');

        if (value && !macPattern.test(value)) {
            input.classList.add('error');
            if (errorElement) {
                errorElement.textContent = 'Please enter a valid MAC address (e.g., 00:1B:44:11:3A:B7)';
                errorElement.classList.add('show');
            }
            return false;
        } else if (value) {
            input.classList.add('success');
            if (errorElement) {
                errorElement.classList.remove('show');
            }
            return true;
        } else {
            if (errorElement) {
                errorElement.classList.remove('show');
            }
            return true; // MAC is optional
        }
    }

    validateDeviceName(input) {
        const value = input.value.trim();
        const errorElement = document.getElementById('deviceNameError');

        input.classList.remove('error', 'success');

        if (!value) {
            input.classList.add('error');
            if (errorElement) {
                errorElement.textContent = 'Device name is required';
                errorElement.classList.add('show');
            }
            return false;
        } else if (value.length < 2) {
            input.classList.add('error');
            if (errorElement) {
                errorElement.textContent = 'Device name must be at least 2 characters';
                errorElement.classList.add('show');
            }
            return false;
        } else {
            // Check for duplicate name
            const isDuplicate = this.devices.some(device => 
                device.name.toLowerCase() === value.toLowerCase()
            );
            if (isDuplicate) {
                input.classList.add('error');
                if (errorElement) {
                    errorElement.textContent = 'This device name is already in use';
                    errorElement.classList.add('show');
                }
                return false;
            } else {
                input.classList.add('success');
                if (errorElement) {
                    errorElement.classList.remove('show');
                }
                return true;
            }
        }
    }

    openAddDeviceModal() {
        const modal = document.getElementById('addDeviceModal');
        if (modal) {
            modal.classList.add('active');
            document.body.style.overflow = 'hidden';
            
            // Focus on first input
            setTimeout(() => {
                const firstInput = document.getElementById('deviceName');
                if (firstInput) firstInput.focus();
            }, 100);
        }
    }

    closeAddDeviceModal() {
        const modal = document.getElementById('addDeviceModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
            this.resetForm();
        }
    }

    resetForm() {
        const form = document.getElementById('addDeviceForm');
        if (form) {
            form.reset();
            
            // Reset validation states
            const inputs = form.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.classList.remove('error', 'success');
            });
            
            // Hide error messages
            const errorMessages = form.querySelectorAll('.error-message');
            errorMessages.forEach(error => {
                error.classList.remove('show');
            });
            
            // Reset test connection button
            const testBtn = document.getElementById('testConnection');
            if (testBtn) {
                testBtn.className = 'btn btn-secondary';
                testBtn.innerHTML = '<i class="fas fa-wifi"></i> Test Connection';
            }
        }
    }

    async testDeviceConnection() {
        const ipInput = document.getElementById('ipAddress');
        const testBtn = document.getElementById('testConnection');
        
        if (!ipInput || !ipInput.value) {
            this.showNotification('Please enter an IP address first', 'error');
            return;
        }

        if (!this.validateIP(ipInput)) {
            this.showNotification('Please enter a valid IP address', 'error');
            return;
        }

        // Update button state
        testBtn.className = 'btn btn-secondary testing';
        testBtn.innerHTML = '<span class="loading-spinner"></span> Testing...';

        try {
            // Simulate ping test (in real implementation, you'd call your API)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Simulate random success/failure
            const isReachable = Math.random() > 0.3;
            
            if (isReachable) {
                testBtn.className = 'btn btn-secondary success';
                testBtn.innerHTML = '<i class="fas fa-check"></i> Connection Successful';
                this.showNotification('Device is reachable!', 'success');
            } else {
                testBtn.className = 'btn btn-secondary error';
                testBtn.innerHTML = '<i class="fas fa-times"></i> Connection Failed';
                this.showNotification('Device is not reachable', 'error');
            }
            
            // Reset button after 3 seconds
            setTimeout(() => {
                testBtn.className = 'btn btn-secondary';
                testBtn.innerHTML = '<i class="fas fa-wifi"></i> Test Connection';
            }, 3000);
            
        } catch (error) {
            testBtn.className = 'btn btn-secondary error';
            testBtn.innerHTML = '<i class="fas fa-times"></i> Test Failed';
            this.showNotification('Connection test failed', 'error');
        }
    }

    handleAddDevice() {
        const form = document.getElementById('addDeviceForm');
        const formData = new FormData(form);
        
        // Validate all required fields
        const nameValid = this.validateDeviceName(document.getElementById('deviceName'));
        const ipValid = this.validateIP(document.getElementById('ipAddress'));
        const macValid = this.validateMAC(document.getElementById('macAddress'));
        const typeValid = document.getElementById('deviceType').value !== '';
        
        if (!nameValid || !ipValid || !macValid || !typeValid) {
            this.showNotification('Please fix validation errors before saving', 'error');
            return;
        }

        // Create device object
        const device = {
            id: Date.now().toString(),
            name: formData.get('deviceName'),
            type: formData.get('deviceType'),
            ipAddress: formData.get('ipAddress'),
            macAddress: formData.get('macAddress') || '',
            subnet: formData.get('subnet') || '',
            gateway: formData.get('gateway') || '',
            manufacturer: formData.get('manufacturer') || '',
            model: formData.get('model') || '',
            location: formData.get('location') || '',
            owner: formData.get('owner') || '',
            pingInterval: parseInt(formData.get('pingInterval')),
            alertThreshold: parseInt(formData.get('alertThreshold')),
            enableMonitoring: formData.get('enableMonitoring') === 'on',
            enableAlerts: formData.get('enableAlerts') === 'on',
            description: formData.get('description') || '',
            status: 'online', // Default status
            lastSeen: new Date().toISOString(),
            uptime: '0d 0h',
            ping: Math.floor(Math.random() * 50) + 1 + 'ms',
            createdAt: new Date().toISOString()
        };

        // Add device to array
        this.devices.push(device);
        this.saveDevicesToStorage();
        this.renderDevices();
        this.updateDeviceStats();
        
        // Close modal and show success
        this.closeAddDeviceModal();
        this.showNotification(`Device "${device.name}" added successfully!`, 'success');
        
        console.log('✅ Device added:', device);
    }

    renderDevices() {
        const container = document.getElementById('devicesGrid');
        if (!container) {
            console.error('❌ devicesGrid container not found!');
            return;
        }

        console.log(`🔄 Rendering devices. Total devices: ${this.devices.length}`);

        // Apply current filters
        this.applyFilters();

        // Clear all existing device cards
        container.innerHTML = '';

        // Show message if no devices
        if (this.filteredDevices.length === 0) {
            const noDevicesMessage = document.createElement('div');
            noDevicesMessage.className = 'no-devices-message';
            noDevicesMessage.innerHTML = `
                <div class="message-content">
                    <i class="fas fa-search"></i>
                    <h3>No devices found</h3>
                    <p>Click "Discover Network Devices" to scan for active devices or "Add Device" to manually add a device.</p>
                </div>
            `;
            container.appendChild(noDevicesMessage);
            console.log('📱 No devices to render, showing empty message');
            return;
        }

        // Render filtered devices
        this.filteredDevices.forEach(device => {
            const deviceCard = this.createDeviceCard(device);
            container.appendChild(deviceCard);
        });

        console.log(`📱 Successfully rendered ${this.filteredDevices.length} devices`);
    }

    createDeviceCard(device) {
        const card = document.createElement('div');
        card.className = `device-card ${device.status}`;
        card.dataset.deviceId = device.id;

        const statusIcon = {
            online: 'fas fa-circle',
            warning: 'fas fa-exclamation-triangle', 
            offline: 'fas fa-times-circle'
        }[device.status] || 'fas fa-question-circle';

        const statusColor = {
            online: '#22c55e',
            warning: '#f59e0b',
            offline: '#ef4444'
        }[device.status] || '#64748b';

                 card.innerHTML = `
            <div class="device-header">
                <div class="device-info">
                    <h3>${device.name}</h3>
                    <span class="device-type">${device.type}</span>
                    ${device.discoveredAt ? '<span class="device-badge discovered">Discovered</span>' : ''}
                </div>
                <div class="device-status ${device.status}">
                    <i class="${statusIcon}" style="color: ${statusColor}"></i> ${device.status.charAt(0).toUpperCase() + device.status.slice(1)}
                </div>
            </div>
            <div class="device-details">
                <div class="device-detail">
                    <label>IP Address:</label>
                    <span>${device.ipAddress}</span>
                </div>
                <div class="device-detail">
                    <label>MAC Address:</label>
                    <span>${device.macAddress || 'Unknown'}</span>
                </div>
                <div class="device-detail">
                    <label>Ping:</label>
                    <span>${device.ping}</span>
                </div>
                <div class="device-detail">
                    <label>Uptime:</label>
                    <span>${device.uptime}</span>
                </div>
                ${device.manufacturer ? `
                <div class="device-detail">
                    <label>Manufacturer:</label>
                    <span>${device.manufacturer}</span>
                </div>` : ''}
                ${device.location ? `
                <div class="device-detail">
                    <label>Location:</label>
                    <span>${device.location}</span>
                </div>` : ''}
                <div class="device-detail">
                    <label>Last Seen:</label>
                    <span>${this.formatTimeAgo(device.lastSeen)}</span>
                </div>
            </div>
            <div class="device-actions">
                <button class="btn btn-sm btn-primary" onclick="deviceManager.pingDevice('${device.id}')">
                    <i class="fas fa-wifi"></i> Ping
                </button>
                <button class="btn btn-sm btn-secondary" onclick="deviceManager.editDevice('${device.id}')">
                    <i class="fas fa-edit"></i> Edit
                </button>
                <button class="btn btn-sm btn-secondary" onclick="deviceManager.deleteDevice('${device.id}')">
                    <i class="fas fa-trash"></i> Delete
                </button>
            </div>
        `;

        return card;
    }

    applyFilters() {
        const statusFilter = document.getElementById('statusFilter');
        const typeFilter = document.getElementById('typeFilter');
        const searchInput = document.getElementById('deviceSearch');

        let filtered = [...this.devices];

        if (statusFilter && statusFilter.value !== 'all') {
            filtered = filtered.filter(device => device.status === statusFilter.value);
        }

        if (typeFilter && typeFilter.value !== 'all') {
            filtered = filtered.filter(device => device.type === typeFilter.value);
        }

        if (searchInput && searchInput.value.trim()) {
            const searchTerm = searchInput.value.toLowerCase().trim();
            filtered = filtered.filter(device => 
                device.name.toLowerCase().includes(searchTerm) ||
                device.ipAddress.includes(searchTerm) ||
                device.type.toLowerCase().includes(searchTerm) ||
                (device.manufacturer && device.manufacturer.toLowerCase().includes(searchTerm)) ||
                (device.location && device.location.toLowerCase().includes(searchTerm))
            );
        }

        this.filteredDevices = filtered;
    }

    searchDevices(searchTerm) {
        this.applyFilters();
        this.renderDevices();
    }

    async discoverNetworkDevices() {
        console.log('🔍 Starting network device discovery...');
        
        const discoverBtn = document.getElementById('discoverDevices');
        const discoveryStatus = document.getElementById('discoveryStatus');
        
        // Update UI to show scanning
        if (discoverBtn) {
            discoverBtn.innerHTML = '<span class="loading-spinner"></span> Scanning Network...';
            discoverBtn.disabled = true;
        }
        
        if (discoveryStatus) {
            discoveryStatus.classList.add('scanning');
            discoveryStatus.querySelector('.status-message span').textContent = 'Scanning network for active devices...';
        }

        try {
            // Simulate network discovery (in real implementation, this would call your backend API)
            console.log('🔍 Starting network scan...');
            const discoveredDevices = await this.performNetworkScan();
            console.log('✅ Network scan completed. Found devices:', discoveredDevices);
            
            // Clear existing devices and add discovered ones
            this.devices = discoveredDevices;
            console.log('💾 Updated devices array:', this.devices.length, 'devices');
            
            this.saveDevicesToStorage();
            console.log('💿 Saved devices to storage');
            
            // Update UI
            console.log('🎨 Updating UI...');
            this.renderDevices();
            this.updateDeviceStats();
            
            // Hide discovery status and show results
            if (discoveryStatus) {
                discoveryStatus.style.display = 'none';
                console.log('✨ Hidden discovery status');
            }
            
            this.showNotification(`Found ${discoveredDevices.length} active devices on the network!`, 'success');
            console.log('🎉 Discovery completed successfully!');
            
        } catch (error) {
            console.error('❌ Network discovery failed:', error);
            this.showNotification('Network discovery failed. Please try again.', 'error');
        } finally {
            // Reset button
            if (discoverBtn) {
                discoverBtn.innerHTML = '<i class="fas fa-search"></i> Discover Network Devices';
                discoverBtn.disabled = false;
            }
            
            if (discoveryStatus) {
                discoveryStatus.classList.remove('scanning');
            }
        }
    }

    async performNetworkScan() {
        // Simulate network scanning delay
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Generate realistic discovered devices
        const networkDevices = [
            {
                id: 'discovered-1',
                name: 'Home Router',
                type: 'router',
                ipAddress: '192.168.1.1',
                macAddress: '00:14:D1:12:34:56',
                status: 'online',
                ping: '1ms',
                uptime: '127d 15h',
                manufacturer: 'TP-Link',
                model: 'Archer AX6000',
                location: 'Living Room',
                lastSeen: new Date().toISOString(),
                discoveredAt: new Date().toISOString(),
                enableMonitoring: true,
                enableAlerts: true,
                pingInterval: 60,
                alertThreshold: 100
            },
            {
                id: 'discovered-2',
                name: 'Network Switch',
                type: 'switch',
                ipAddress: '192.168.1.2',
                macAddress: '00:1B:44:11:3A:B7',
                status: 'online',
                ping: '2ms',
                uptime: '89d 7h',
                manufacturer: 'Netgear',
                model: 'GS308',
                location: 'Server Closet',
                lastSeen: new Date().toISOString(),
                discoveredAt: new Date().toISOString(),
                enableMonitoring: true,
                enableAlerts: true,
                pingInterval: 60,
                alertThreshold: 100
            },
            {
                id: 'discovered-3',
                name: 'John\'s Laptop',
                type: 'workstation',
                ipAddress: '192.168.1.15',
                macAddress: '3C:22:FB:45:67:89',
                status: 'online',
                ping: '5ms',
                uptime: '2d 4h',
                manufacturer: 'Dell',
                model: 'XPS 13',
                location: 'Home Office',
                lastSeen: new Date().toISOString(),
                discoveredAt: new Date().toISOString(),
                enableMonitoring: true,
                enableAlerts: false,
                pingInterval: 300,
                alertThreshold: 200
            },
            {
                id: 'discovered-4',
                name: 'Smart TV',
                type: 'iot',
                ipAddress: '192.168.1.25',
                macAddress: '00:AB:CD:EF:12:34',
                status: 'online',
                ping: '12ms',
                uptime: '45d 2h',
                manufacturer: 'Samsung',
                model: 'QN65Q80A',
                location: 'Living Room',
                lastSeen: new Date().toISOString(),
                discoveredAt: new Date().toISOString(),
                enableMonitoring: false,
                enableAlerts: false,
                pingInterval: 600,
                alertThreshold: 500
            },
            {
                id: 'discovered-5',
                name: 'HP Printer',
                type: 'printer',
                ipAddress: '192.168.1.30',
                macAddress: '9C:8E:99:11:22:33',
                status: 'online',
                ping: '8ms',
                uptime: '12d 18h',
                manufacturer: 'HP',
                model: 'LaserJet Pro MFP',
                location: 'Home Office',
                lastSeen: new Date().toISOString(),
                discoveredAt: new Date().toISOString(),
                enableMonitoring: true,
                enableAlerts: true,
                pingInterval: 300,
                alertThreshold: 150
            },
            {
                id: 'discovered-6',
                name: 'Security Camera 1',
                type: 'iot',
                ipAddress: '192.168.1.45',
                macAddress: '00:12:34:56:78:9A',
                status: 'warning',
                ping: '25ms',
                uptime: '67d 3h',
                manufacturer: 'Hikvision',
                model: 'DS-2CD2043G0-I',
                location: 'Front Door',
                lastSeen: new Date().toISOString(),
                discoveredAt: new Date().toISOString(),
                enableMonitoring: true,
                enableAlerts: true,
                pingInterval: 120,
                alertThreshold: 100
            },
            {
                id: 'discovered-7',
                name: 'Gaming Console',
                type: 'iot',
                ipAddress: '192.168.1.50',
                macAddress: 'AA:BB:CC:DD:EE:FF',
                status: 'offline',
                ping: 'N/A',
                uptime: 'N/A',
                manufacturer: 'Sony',
                model: 'PlayStation 5',
                location: 'Living Room',
                lastSeen: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
                discoveredAt: new Date().toISOString(),
                enableMonitoring: false,
                enableAlerts: false,
                pingInterval: 300,
                alertThreshold: 200
            }
        ];

        return networkDevices;
    }

    refreshDevices() {
        console.log('🔄 Refreshing device status...');
        
        const refreshBtn = document.getElementById('refreshDevices');
        if (refreshBtn) {
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...';
            refreshBtn.disabled = true;
        }

        // Simulate refresh delay
        setTimeout(() => {
            // Update device statuses randomly
            this.devices.forEach(device => {
                const random = Math.random();
                if (random > 0.9) {
                    device.status = 'offline';
                    device.ping = 'N/A';
                } else if (random > 0.8) {
                    device.status = 'warning';
                    device.ping = Math.floor(Math.random() * 200) + 50 + 'ms';
                } else {
                    device.status = 'online';
                    device.ping = Math.floor(Math.random() * 20) + 1 + 'ms';
                }
                device.lastSeen = new Date().toISOString();
            });

            this.saveDevicesToStorage();
            this.renderDevices();
            this.updateDeviceStats();

            if (refreshBtn) {
                refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
                refreshBtn.disabled = false;
            }

            this.showNotification('Device status updated!', 'success');
        }, 1500);
    }

    updateDeviceStats() {
        const total = this.devices.length;
        const online = this.devices.filter(d => d.status === 'online').length;
        const warning = this.devices.filter(d => d.status === 'warning').length;
        const offline = this.devices.filter(d => d.status === 'offline').length;

        const elements = {
            totalDevices: total,
            onlineDevices: online,
            warningDevices: warning,
            offlineDevices: offline
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });
    }

    editDevice(deviceId) {
        console.log('✏️ Editing device:', deviceId);
        // TODO: Implement edit functionality
        this.showNotification('Edit functionality coming soon!', 'info');
    }

    deleteDevice(deviceId) {
        const device = this.devices.find(d => d.id === deviceId);
        if (!device) return;

        if (confirm(`Are you sure you want to delete "${device.name}"?`)) {
            this.devices = this.devices.filter(d => d.id !== deviceId);
            this.saveDevicesToStorage();
            this.renderDevices();
            this.updateDeviceStats();
            this.showNotification(`Device "${device.name}" deleted successfully`, 'success');
        }
    }

    loadDevicesFromStorage() {
        try {
            const stored = localStorage.getItem('networkDevices');
            if (stored) {
                this.devices = JSON.parse(stored);
                console.log(`📱 Loaded ${this.devices.length} devices from storage`);
            } else {
                // Start with empty devices array - user needs to discover or add devices
                this.devices = [];
                console.log('📱 No devices found in storage. Use "Discover Network Devices" to scan for active devices.');
            }
        } catch (error) {
            console.error('Error loading devices:', error);
            this.devices = [];
        }
    }

    saveDevicesToStorage() {
        try {
            localStorage.setItem('networkDevices', JSON.stringify(this.devices));
            console.log('💾 Devices saved to storage');
        } catch (error) {
            console.error('Error saving devices:', error);
        }
    }

    generateSampleDevices() {
        return [
            {
                id: '1',
                name: 'Main Router',
                type: 'router',
                ipAddress: '192.168.1.1',
                macAddress: '00:1B:44:11:3A:B7',
                status: 'online',
                ping: '2ms',
                uptime: '45d 12h',
                location: 'Server Room',
                manufacturer: 'Cisco',
                model: 'ISR4321',
                createdAt: new Date().toISOString()
            },
            {
                id: '2',
                name: 'Core Switch',
                type: 'switch',
                ipAddress: '192.168.1.2',
                macAddress: '00:1B:44:11:3A:B8',
                status: 'online',
                ping: '1ms',
                uptime: '30d 8h',
                location: 'Server Room',
                manufacturer: 'HP',
                model: 'ProCurve 2920',
                createdAt: new Date().toISOString()
            }
        ];
    }

    formatTimeAgo(timestamp) {
        const now = new Date();
        const time = new Date(timestamp);
        const diffInSeconds = Math.floor((now - time) / 1000);

        if (diffInSeconds < 60) {
            return 'Just now';
        } else if (diffInSeconds < 3600) {
            const minutes = Math.floor(diffInSeconds / 60);
            return `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
        } else if (diffInSeconds < 86400) {
            const hours = Math.floor(diffInSeconds / 3600);
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else {
            const days = Math.floor(diffInSeconds / 86400);
            return `${days} day${days !== 1 ? 's' : ''} ago`;
        }
    }

    async pingDevice(deviceId) {
        const device = this.devices.find(d => d.id === deviceId);
        if (!device) return;

        console.log(`🏓 Pinging device: ${device.name} (${device.ipAddress})`);
        
        // Update button to show pinging
        const buttons = document.querySelectorAll(`[data-device-id="${deviceId}"] .device-actions button`);
        const pingButton = Array.from(buttons).find(btn => btn.innerHTML.includes('Ping'));
        
        if (pingButton) {
            pingButton.innerHTML = '<span class="loading-spinner"></span> Pinging...';
            pingButton.disabled = true;
        }

        try {
            // Simulate ping
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Generate random ping result
            const isReachable = Math.random() > 0.2;
            
            if (isReachable) {
                const newPing = Math.floor(Math.random() * 50) + 1 + 'ms';
                device.ping = newPing;
                device.status = 'online';
                device.lastSeen = new Date().toISOString();
                
                this.showNotification(`${device.name} is reachable (${newPing})`, 'success');
            } else {
                device.ping = 'N/A';
                device.status = 'offline';
                
                this.showNotification(`${device.name} is not reachable`, 'error');
            }

            // Update storage and UI
            this.saveDevicesToStorage();
            this.renderDevices();
            this.updateDeviceStats();

        } catch (error) {
            this.showNotification(`Failed to ping ${device.name}`, 'error');
        } finally {
            if (pingButton) {
                pingButton.innerHTML = '<i class="fas fa-wifi"></i> Ping';
                pingButton.disabled = false;
            }
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'times' : 'info'}"></i>
                <span>${message}</span>
            </div>
        `;

        // Add to page
        document.body.appendChild(notification);

        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 5000);
    }
}

// Traffic Monitor Class for Real-time Charts
class TrafficMonitor {
    constructor() {
        this.charts = {};
        this.trafficData = {
            labels: [],
            upload: [],
            download: [],
            total: [],
            packets: []
        };
        this.protocolData = {
            http: 0, tcp: 0, udp: 0, dns: 0, other: 0
        };
        this.isPaused = false;
        this.maxDataPoints = 100;
        this.updateInterval = null;
        
        this.init();
    }

    init() {
        console.log('📊 Initializing Traffic Monitor...');
        this.createCharts();
        this.setupEventListeners();
        this.startRealTimeUpdates();
    }

    createCharts() {
        this.createMainTrafficChart();
        this.createSpeedGauge();
        this.createTrendCharts();
        this.createProtocolChart();
    }

    createMainTrafficChart() {
        const ctx = document.getElementById('trafficChart');
        if (!ctx) return;

        this.charts.traffic = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.trafficData.labels,
                datasets: [
                    {
                        label: 'Upload',
                        data: this.trafficData.upload,
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'Download',
                        data: this.trafficData.download,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'Total',
                        data: this.trafficData.total,
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        borderColor: '#3b82f6',
                        borderWidth: 1
                    }
                },
                scales: {
                    x: {
                        display: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        display: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: { 
                            color: '#94a3b8',
                            callback: function(value) {
                                return value + ' Mbps';
                            }
                        },
                        beginAtZero: true
                    }
                },
                interaction: {
                    mode: 'nearest',
                    axis: 'x',
                    intersect: false
                },
                animation: {
                    duration: 750,
                    easing: 'easeInOutQuart'
                }
            }
        });
    }

    createSpeedGauge() {
        const ctx = document.getElementById('speedGauge');
        if (!ctx) return;

        this.charts.speedGauge = new Chart(ctx, {
            type: 'doughnut',
            data: {
                datasets: [{
                    data: [0, 100],
                    backgroundColor: ['#3b82f6', 'rgba(255, 255, 255, 0.1)'],
                    borderWidth: 0,
                    circumference: 180,
                    rotation: 270
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                },
                cutout: '75%'
            }
        });
    }

    createTrendCharts() {
        // Upload trend
        const uploadCtx = document.getElementById('uploadTrend');
        if (uploadCtx) {
            this.charts.uploadTrend = new Chart(uploadCtx, {
                type: 'line',
                data: {
                    labels: Array(20).fill(''),
                    datasets: [{
                        data: Array(20).fill(0),
                        borderColor: '#22c55e',
                        backgroundColor: 'rgba(34, 197, 94, 0.2)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { display: false },
                        y: { display: false }
                    },
                    animation: { duration: 0 }
                }
            });
        }

        // Download trend
        const downloadCtx = document.getElementById('downloadTrend');
        if (downloadCtx) {
            this.charts.downloadTrend = new Chart(downloadCtx, {
                type: 'line',
                data: {
                    labels: Array(20).fill(''),
                    datasets: [{
                        data: Array(20).fill(0),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.2)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        pointRadius: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: {
                        x: { display: false },
                        y: { display: false }
                    },
                    animation: { duration: 0 }
                }
            });
        }
    }

    createProtocolChart() {
        const ctx = document.getElementById('protocolChart');
        if (!ctx) return;

        this.charts.protocol = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['HTTP/HTTPS', 'TCP', 'UDP', 'DNS', 'Other'],
                datasets: [{
                    data: [0, 0, 0, 0, 0],
                    backgroundColor: ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#64748b'],
                    borderWidth: 2,
                    borderColor: 'rgba(255, 255, 255, 0.1)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: '#fff',
                        bodyColor: '#fff',
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                return `${label}: ${value.toFixed(1)}%`;
                            }
                        }
                    }
                },
                cutout: '60%'
            }
        });
    }

    setupEventListeners() {
        // Pause/Resume button
        const pauseBtn = document.getElementById('pauseTraffic');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => {
                this.togglePause();
            });
        }

        // Export button
        const exportBtn = document.getElementById('exportTraffic');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => {
                this.exportData();
            });
        }

        // Time range selector
        const timeRangeSelect = document.getElementById('trafficTimeRange');
        if (timeRangeSelect) {
            timeRangeSelect.addEventListener('change', (e) => {
                this.changeTimeRange(e.target.value);
            });
        }
    }

    startRealTimeUpdates() {
        this.updateInterval = setInterval(() => {
            if (!this.isPaused) {
                this.generateTrafficData();
                this.updateCharts();
                this.updateMetrics();
            }
        }, 2000); // Update every 2 seconds
    }

    generateTrafficData() {
        const now = new Date();
        const timeStr = now.toLocaleTimeString();

        // Generate realistic traffic data with some randomness
        const baseUpload = 25 + Math.sin(Date.now() / 10000) * 15;
        const baseDownload = 85 + Math.sin(Date.now() / 8000) * 25;
        
        const upload = Math.max(0, baseUpload + (Math.random() - 0.5) * 20);
        const download = Math.max(0, baseDownload + (Math.random() - 0.5) * 40);
        const total = upload + download;
        const packets = Math.floor(total * 1000 + Math.random() * 500);

        // Add to data arrays
        this.trafficData.labels.push(timeStr);
        this.trafficData.upload.push(upload.toFixed(1));
        this.trafficData.download.push(download.toFixed(1));
        this.trafficData.total.push(total.toFixed(1));
        this.trafficData.packets.push(packets);

        // Keep only last N data points
        if (this.trafficData.labels.length > this.maxDataPoints) {
            this.trafficData.labels.shift();
            this.trafficData.upload.shift();
            this.trafficData.download.shift();
            this.trafficData.total.shift();
            this.trafficData.packets.shift();
        }

        // Update protocol distribution
        this.updateProtocolData(total);
    }

    updateProtocolData(totalSpeed) {
        // Simulate protocol distribution
        const distributions = {
            http: 0.45 + Math.random() * 0.1,
            tcp: 0.25 + Math.random() * 0.1,
            udp: 0.15 + Math.random() * 0.05,
            dns: 0.08 + Math.random() * 0.02,
            other: 0.07 + Math.random() * 0.03
        };

        // Normalize to 100%
        const sum = Object.values(distributions).reduce((a, b) => a + b, 0);
        Object.keys(distributions).forEach(key => {
            distributions[key] = (distributions[key] / sum) * 100;
            this.protocolData[key] = distributions[key];
        });
    }

    updateCharts() {
        // Update main traffic chart
        if (this.charts.traffic) {
            this.charts.traffic.update('none');
        }

        // Update speed gauge
        if (this.charts.speedGauge) {
            const currentSpeed = parseFloat(this.trafficData.total[this.trafficData.total.length - 1] || 0);
            const maxSpeed = 1000; // 1 Gbps max
            const percentage = (currentSpeed / maxSpeed) * 100;
            
            this.charts.speedGauge.data.datasets[0].data = [percentage, 100 - percentage];
            this.charts.speedGauge.update('none');
        }

        // Update trend charts
        if (this.charts.uploadTrend) {
            const recentUpload = this.trafficData.upload.slice(-20);
            this.charts.uploadTrend.data.datasets[0].data = recentUpload;
            this.charts.uploadTrend.update('none');
        }

        if (this.charts.downloadTrend) {
            const recentDownload = this.trafficData.download.slice(-20);
            this.charts.downloadTrend.data.datasets[0].data = recentDownload;
            this.charts.downloadTrend.update('none');
        }

        // Update protocol chart
        if (this.charts.protocol) {
            this.charts.protocol.data.datasets[0].data = [
                this.protocolData.http,
                this.protocolData.tcp,
                this.protocolData.udp,
                this.protocolData.dns,
                this.protocolData.other
            ];
            this.charts.protocol.update('none');
        }
    }

    updateMetrics() {
        const latest = this.trafficData;
        const currentUpload = latest.upload[latest.upload.length - 1] || 0;
        const currentDownload = latest.download[latest.download.length - 1] || 0;
        const currentTotal = latest.total[latest.total.length - 1] || 0;
        const currentPackets = latest.packets[latest.packets.length - 1] || 0;

        // Update legend values
        const elements = {
            currentUpload: `${currentUpload} Mbps`,
            currentDownload: `${currentDownload} Mbps`,
            currentTotal: `${currentTotal} Mbps`,
            currentSpeed: `${currentTotal} Mbps`,
            uploadRate: `${currentUpload} Mbps`,
            downloadRate: `${currentDownload} Mbps`,
            packetsPerSec: currentPackets.toLocaleString()
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value;
        });

        // Update packets bar
        const packetsBar = document.getElementById('packetsBar');
        if (packetsBar) {
            const maxPackets = 150000;
            const percentage = (currentPackets / maxPackets) * 100;
            packetsBar.style.width = `${Math.min(percentage, 100)}%`;
        }

        // Update protocol percentages
        Object.entries(this.protocolData).forEach(([protocol, percent]) => {
            const percentElement = document.getElementById(`${protocol}Percent`);
            const speedElement = document.getElementById(`${protocol}Speed`);
            
            if (percentElement) {
                percentElement.textContent = `${percent.toFixed(1)}%`;
            }
            if (speedElement) {
                const speed = (parseFloat(currentTotal) * percent / 100).toFixed(1);
                speedElement.textContent = `${speed} Mbps`;
            }
        });
    }

    togglePause() {
        this.isPaused = !this.isPaused;
        const btn = document.getElementById('pauseTraffic');
        if (btn) {
            if (this.isPaused) {
                btn.innerHTML = '<i class="fas fa-play"></i> Resume';
                btn.classList.add('btn-primary');
                btn.classList.remove('btn-secondary');
            } else {
                btn.innerHTML = '<i class="fas fa-pause"></i> Pause';
                btn.classList.add('btn-secondary');
                btn.classList.remove('btn-primary');
            }
        }
    }

    exportData() {
        const csvData = this.generateCSV();
        const blob = new Blob([csvData], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `traffic-data-${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        window.URL.revokeObjectURL(url);
    }

    generateCSV() {
        let csv = 'Time,Upload (Mbps),Download (Mbps),Total (Mbps),Packets/sec\n';
        
        for (let i = 0; i < this.trafficData.labels.length; i++) {
            csv += `${this.trafficData.labels[i]},${this.trafficData.upload[i]},${this.trafficData.download[i]},${this.trafficData.total[i]},${this.trafficData.packets[i]}\n`;
        }
        
        return csv;
    }

    changeTimeRange(range) {
        // Adjust max data points based on time range
        const ranges = {
            '1m': 30,   // 30 data points for 1 minute
            '5m': 150,  // 150 data points for 5 minutes
            '15m': 450, // 450 data points for 15 minutes
            '1h': 1800  // 1800 data points for 1 hour
        };
        
        this.maxDataPoints = ranges[range] || 150;
        console.log(`📊 Changed time range to ${range}, max data points: ${this.maxDataPoints}`);
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
        
        Object.values(this.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
    }
}

// Global reference for device manager (needed for onclick handlers)
let deviceManager;

// Backup function to manually trigger discovery
function manualDiscovery() {
    console.log('🔧 Manual discovery triggered');
    if (window.deviceManager && window.deviceManager.discoverNetworkDevices) {
        window.deviceManager.discoverNetworkDevices();
    } else if (deviceManager && deviceManager.discoverNetworkDevices) {
        deviceManager.discoverNetworkDevices();
    } else {
        console.error('❌ No device manager found!');
        // Force create one
        deviceManager = new DeviceManager();
        window.deviceManager = deviceManager;
        deviceManager.discoverNetworkDevices();
    }
}

// Initialize Network Dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.networkDashboard = new NetworkDashboard();
    
    // Add some global keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey || e.metaKey) {
            switch(e.key) {
                case 'k':
                    e.preventDefault();
                    document.querySelector('.search-box input').focus();
                    break;
                case 'r':
                    e.preventDefault();
                    window.networkDashboard.refreshDashboard();
                    break;
                case 'b':
                    e.preventDefault();
                    document.querySelector('.menu-toggle').click();
                    break;
            }
        }
    });
    
    console.log('Network Monitoring Dashboard initialized successfully!');
}); 