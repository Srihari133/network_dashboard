/**
 * Network Devices Management Page
 * Handles device discovery, monitoring, configuration, and bulk operations
 */

class DevicesManager {
    constructor() {
        this.currentPage = 1;
        this.itemsPerPage = 20;
        this.totalDevices = 0;
        this.selectedDevices = new Set();
        this.currentView = 'grid';
        this.currentFilters = {
            status: 'all',
            type: 'all',
            group: 'all',
            search: ''
        };
        
        // Sample device data - will be replaced by API calls
        this.devices = [
            {
                id: 'dev_001',
                name: 'Core Router 1',
                ip: '192.168.1.1',
                mac: '00:1B:44:11:3A:B7',
                type: 'router',
                manufacturer: 'Cisco',
                status: 'online',
                group: 'critical',
                ping: '2ms',
                uptime: '45d 12h',
                lastSeen: new Date(Date.now() - 300000),
                subnet: '192.168.1.0/24',
                gateway: '192.168.1.1',
                dns: '8.8.8.8, 8.8.4.4',
                ports: '22, 80, 443, 23',
                bandwidth: '850 Mbps',
                packetLoss: '0.1%',
                description: 'Main network router',
                securityStatus: 'secure',
                openPorts: ['22', '80', '443'],
                vulnerabilities: 0
            },
            {
                id: 'dev_002',
                name: 'Web Server 1',
                ip: '192.168.1.10',
                mac: '00:1B:44:11:3A:C8',
                type: 'server',
                manufacturer: 'Dell',
                status: 'online',
                group: 'production',
                ping: '5ms',
                uptime: '30d 8h',
                lastSeen: new Date(Date.now() - 150000),
                subnet: '192.168.1.0/24',
                gateway: '192.168.1.1',
                dns: '8.8.8.8',
                ports: '22, 80, 443',
                bandwidth: '450 Mbps',
                packetLoss: '0.0%',
                description: 'Primary web server',
                securityStatus: 'secure',
                openPorts: ['22', '80', '443'],
                vulnerabilities: 0
            },
            {
                id: 'dev_003',
                name: 'Printer - Floor 2',
                ip: '192.168.1.25',
                mac: '00:1B:44:11:3A:D9',
                type: 'printer',
                manufacturer: 'HP',
                status: 'warning',
                group: 'production',
                ping: '15ms',
                uptime: '15d 3h',
                lastSeen: new Date(Date.now() - 1800000),
                subnet: '192.168.1.0/24',
                gateway: '192.168.1.1',
                dns: '8.8.8.8',
                ports: '9100, 631',
                bandwidth: '100 Mbps',
                packetLoss: '2.3%',
                description: 'Office printer',
                securityStatus: 'warning',
                openPorts: ['9100', '631'],
                vulnerabilities: 1
            },
            {
                id: 'dev_004',
                name: 'Workstation-045',
                ip: '192.168.1.45',
                mac: '00:1B:44:11:3A:EA',
                type: 'workstation',
                manufacturer: 'Lenovo',
                status: 'offline',
                group: 'development',
                ping: 'N/A',
                uptime: 'N/A',
                lastSeen: new Date(Date.now() - 7200000),
                subnet: '192.168.1.0/24',
                gateway: '192.168.1.1',
                dns: '8.8.8.8',
                ports: 'N/A',
                bandwidth: 'N/A',
                packetLoss: 'N/A',
                description: 'Developer workstation',
                securityStatus: 'unknown',
                openPorts: [],
                vulnerabilities: 0
            },
            {
                id: 'dev_005',
                name: 'IoT Sensor Hub',
                ip: '192.168.1.55',
                mac: '00:1B:44:11:3A:FB',
                type: 'iot',
                manufacturer: 'Raspberry Pi',
                status: 'online',
                group: 'production',
                ping: '8ms',
                uptime: '12d 16h',
                lastSeen: new Date(Date.now() - 60000),
                subnet: '192.168.1.0/24',
                gateway: '192.168.1.1',
                dns: '8.8.8.8',
                ports: '22, 1883',
                bandwidth: '50 Mbps',
                packetLoss: '0.5%',
                description: 'IoT sensor data collector',
                securityStatus: 'secure',
                openPorts: ['22', '1883'],
                vulnerabilities: 0
            }
        ];
        
        this.filteredDevices = [...this.devices];
        this.apiService = null;
        this.wsService = null;
        
        this.init();
    }

    async init() {
        console.log('🔧 Initializing Devices Manager...');
        
        // Initialize API services if available
        if (typeof ApiService !== 'undefined') {
            this.apiService = new ApiService();
        }
        if (typeof WebSocketService !== 'undefined') {
            this.wsService = new WebSocketService();
        }
        
        this.setupEventListeners();
        this.updateDeviceStats();
        this.renderDevices();
        this.setupPagination();
        
        // Load devices from API if available
        await this.loadDevicesFromAPI();
        
        // Setup real-time updates
        this.setupRealTimeUpdates();
        
        console.log('✅ Devices Manager initialized');
    }

    setupEventListeners() {
        // Search functionality
        const searchInput = document.getElementById('deviceSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentFilters.search = e.target.value.toLowerCase();
                this.applyFilters();
            });
        }

        // Filter dropdowns
        ['statusFilter', 'typeFilter', 'groupFilter'].forEach(filterId => {
            const filter = document.getElementById(filterId);
            if (filter) {
                filter.addEventListener('change', (e) => {
                    const filterType = filterId.replace('Filter', '');
                    this.currentFilters[filterType] = e.target.value;
                    this.applyFilters();
                });
            }
        });

        // View toggle
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchView(e.target.dataset.view);
            });
        });

        // Device management buttons
        const discoverBtn = document.getElementById('discoverDevices');
        if (discoverBtn) {
            discoverBtn.addEventListener('click', () => this.discoverDevices());
        }

        const addDeviceBtn = document.getElementById('addDevice');
        if (addDeviceBtn) {
            addDeviceBtn.addEventListener('click', () => this.showAddDeviceModal());
        }

        const bulkActionsBtn = document.getElementById('bulkActions');
        if (bulkActionsBtn) {
            bulkActionsBtn.addEventListener('click', () => this.showBulkActionsModal());
        }

        // Pagination
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        
        if (prevBtn) {
            prevBtn.addEventListener('click', () => this.previousPage());
        }
        if (nextBtn) {
            nextBtn.addEventListener('click', () => this.nextPage());
        }

        // Select all checkbox
        const selectAllCheck = document.getElementById('selectAll');
        if (selectAllCheck) {
            selectAllCheck.addEventListener('change', (e) => {
                this.toggleSelectAll(e.target.checked);
            });
        }

        // Modal event listeners
        this.setupModalEventListeners();
    }

    setupModalEventListeners() {
        // Device Details Modal
        const deviceModal = document.getElementById('deviceModal');
        const closeDeviceModal = document.getElementById('closeDeviceModal');
        
        if (closeDeviceModal) {
            closeDeviceModal.addEventListener('click', () => {
                deviceModal.style.display = 'none';
            });
        }

        // Tab switching in device modal
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Add Device Modal
        const addDeviceModal = document.getElementById('addDeviceModal');
        const closeAddDeviceModal = document.getElementById('closeAddDeviceModal');
        const saveNewDevice = document.getElementById('saveNewDevice');
        const cancelAddDevice = document.getElementById('cancelAddDevice');

        if (closeAddDeviceModal) {
            closeAddDeviceModal.addEventListener('click', () => {
                addDeviceModal.style.display = 'none';
            });
        }

        if (cancelAddDevice) {
            cancelAddDevice.addEventListener('click', () => {
                addDeviceModal.style.display = 'none';
            });
        }

        if (saveNewDevice) {
            saveNewDevice.addEventListener('click', () => this.saveNewDevice());
        }

        // Bulk Actions Modal
        const bulkActionsModal = document.getElementById('bulkActionsModal');
        const closeBulkActionsModal = document.getElementById('closeBulkActionsModal');

        if (closeBulkActionsModal) {
            closeBulkActionsModal.addEventListener('click', () => {
                bulkActionsModal.style.display = 'none';
            });
        }

        // Bulk action buttons
        document.querySelectorAll('.bulk-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.currentTarget.dataset.action;
                this.executeBulkAction(action);
            });
        });

        // Device action buttons in modal
        const pingDeviceBtn = document.getElementById('pingDevice');
        const traceRouteBtn = document.getElementById('traceRoute');
        const removeDeviceBtn = document.getElementById('removeDevice');

        if (pingDeviceBtn) {
            pingDeviceBtn.addEventListener('click', () => this.pingCurrentDevice());
        }
        if (traceRouteBtn) {
            traceRouteBtn.addEventListener('click', () => this.traceRouteCurrentDevice());
        }
        if (removeDeviceBtn) {
            removeDeviceBtn.addEventListener('click', () => this.removeCurrentDevice());
        }

        // Close modals when clicking outside
        window.addEventListener('click', (e) => {
            const modals = [deviceModal, addDeviceModal, bulkActionsModal];
            modals.forEach(modal => {
                if (modal && e.target === modal) {
                    modal.style.display = 'none';
                }
            });
        });
    }

    async loadDevicesFromAPI() {
        if (!this.apiService) return;

        try {
            console.log('📡 Loading devices from API...');
            const devicesData = await this.apiService.getDevices();
            
            if (devicesData && devicesData.length > 0) {
                this.devices = devicesData;
                this.applyFilters();
                this.updateDeviceStats();
                this.renderDevices();
                console.log(`✅ Loaded ${devicesData.length} devices from API`);
            }
        } catch (error) {
            console.warn('⚠️ Failed to load devices from API, using sample data:', error);
            this.showNotification('Using sample device data - API unavailable', 'warning');
        }
    }

    setupRealTimeUpdates() {
        if (!this.wsService) return;

        // Listen for device status updates
        this.wsService.on('device-status', (data) => {
            this.handleDeviceStatusUpdate(data);
        });

        // Listen for new device discoveries
        this.wsService.on('device-discovered', (data) => {
            this.handleNewDeviceDiscovered(data);
        });

        // Listen for device removal
        this.wsService.on('device-removed', (data) => {
            this.handleDeviceRemoved(data);
        });
    }

    handleDeviceStatusUpdate(data) {
        console.log('📱 Device status update:', data);
        
        const deviceIndex = this.devices.findIndex(d => d.id === data.device_id);
        if (deviceIndex !== -1) {
            // Update device data
            Object.assign(this.devices[deviceIndex], {
                status: data.status,
                ping: data.ping || this.devices[deviceIndex].ping,
                lastSeen: new Date(data.timestamp),
                uptime: data.uptime || this.devices[deviceIndex].uptime
            });
            
            this.applyFilters();
            this.updateDeviceStats();
            this.renderDevices();
        }
    }

    handleNewDeviceDiscovered(data) {
        console.log('🔍 New device discovered:', data);
        
        // Add new device to the list
        this.devices.push({
            id: data.device_id,
            name: data.name || `Device ${data.ip}`,
            ip: data.ip,
            mac: data.mac,
            type: data.type || 'unknown',
            manufacturer: data.manufacturer || 'Unknown',
            status: data.status || 'online',
            group: 'guest', // Default group for new devices
            ping: data.ping || 'N/A',
            uptime: data.uptime || 'N/A',
            lastSeen: new Date(),
            description: 'Automatically discovered device'
        });
        
        this.applyFilters();
        this.updateDeviceStats();
        this.renderDevices();
        this.showNotification(`New device discovered: ${data.name || data.ip}`, 'success');
    }

    handleDeviceRemoved(data) {
        console.log('🗑️ Device removed:', data);
        
        this.devices = this.devices.filter(d => d.id !== data.device_id);
        this.selectedDevices.delete(data.device_id);
        
        this.applyFilters();
        this.updateDeviceStats();
        this.renderDevices();
        this.showNotification(`Device removed: ${data.name || data.device_id}`, 'info');
    }

    applyFilters() {
        this.filteredDevices = this.devices.filter(device => {
            // Status filter
            if (this.currentFilters.status !== 'all' && device.status !== this.currentFilters.status) {
                return false;
            }
            
            // Type filter
            if (this.currentFilters.type !== 'all' && device.type !== this.currentFilters.type) {
                return false;
            }
            
            // Group filter
            if (this.currentFilters.group !== 'all' && device.group !== this.currentFilters.group) {
                return false;
            }
            
            // Search filter
            if (this.currentFilters.search) {
                const searchTerm = this.currentFilters.search;
                return device.name.toLowerCase().includes(searchTerm) ||
                       device.ip.includes(searchTerm) ||
                       device.type.toLowerCase().includes(searchTerm) ||
                       device.manufacturer.toLowerCase().includes(searchTerm);
            }
            
            return true;
        });
        
        this.totalDevices = this.filteredDevices.length;
        this.currentPage = 1; // Reset to first page when filters change
        this.updatePagination();
        this.renderDevices();
    }

    updateDeviceStats() {
        const stats = {
            total: this.devices.length,
            online: this.devices.filter(d => d.status === 'online').length,
            warning: this.devices.filter(d => d.status === 'warning').length,
            offline: this.devices.filter(d => d.status === 'offline').length
        };
        
        // Update stat cards
        const totalEl = document.getElementById('totalDevices');
        const onlineEl = document.getElementById('onlineDevices');
        const warningEl = document.getElementById('warningDevices');
        const offlineEl = document.getElementById('offlineDevices');
        
        if (totalEl) totalEl.textContent = stats.total;
        if (onlineEl) onlineEl.textContent = stats.online;
        if (warningEl) warningEl.textContent = stats.warning;
        if (offlineEl) offlineEl.textContent = stats.offline;
        
        // Update online percentage
        const onlinePercentage = ((stats.online / stats.total) * 100).toFixed(1);
        const onlineChange = onlineEl?.parentElement.querySelector('.stat-change');
        if (onlineChange) {
            onlineChange.textContent = `${onlinePercentage}%`;
        }
    }

    renderDevices() {
        if (this.currentView === 'grid') {
            this.renderDeviceGrid();
        } else {
            this.renderDeviceList();
        }
        this.updatePagination();
    }

    renderDeviceGrid() {
        const container = document.getElementById('devicesGrid');
        if (!container) return;
        
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const devicesToShow = this.filteredDevices.slice(startIndex, endIndex);
        
        container.innerHTML = devicesToShow.map(device => this.createDeviceCard(device)).join('');
        
        // Add click listeners to device cards
        container.querySelectorAll('.device-card').forEach((card, index) => {
            card.addEventListener('click', () => {
                const device = devicesToShow[index];
                this.showDeviceDetails(device);
            });
        });
    }

    renderDeviceList() {
        const container = document.getElementById('devicesListBody');
        if (!container) return;
        
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const devicesToShow = this.filteredDevices.slice(startIndex, endIndex);
        
        container.innerHTML = devicesToShow.map(device => this.createDeviceListItem(device)).join('');
        
        // Add event listeners
        container.querySelectorAll('.device-list-item').forEach((item, index) => {
            const checkbox = item.querySelector('input[type="checkbox"]');
            const device = devicesToShow[index];
            
            if (checkbox) {
                checkbox.checked = this.selectedDevices.has(device.id);
                checkbox.addEventListener('change', (e) => {
                    this.toggleDeviceSelection(device.id, e.target.checked);
                });
            }
            
            // Add click listener to device name for details
            const deviceName = item.querySelector('.device-name');
            if (deviceName) {
                deviceName.addEventListener('click', () => {
                    this.showDeviceDetails(device);
                });
                deviceName.style.cursor = 'pointer';
                deviceName.style.color = 'var(--primary-blue)';
            }
            
            // Add action button listeners
            const actionBtns = item.querySelectorAll('.list-action-btn');
            actionBtns.forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const action = btn.dataset.action;
                    this.handleDeviceAction(device, action);
                });
            });
        });
    }

    createDeviceCard(device) {
        const statusClass = device.status;
        const statusIcon = this.getStatusIcon(device.status);
        const typeIcon = this.getTypeIcon(device.type);
        const lastSeenText = this.formatLastSeen(device.lastSeen);
        
        return `
            <div class="device-card ${statusClass}" data-device-id="${device.id}">
                <div class="device-header">
                    <div class="device-info">
                        <h3>${device.name}</h3>
                        <span class="device-type">${device.type}</span>
                    </div>
                    <div class="device-status ${statusClass}">
                        ${statusIcon}
                        ${device.status}
                    </div>
                </div>
                
                <div class="device-details">
                    <div class="device-detail">
                        <label>IP Address:</label>
                        <span>${device.ip}</span>
                    </div>
                    <div class="device-detail">
                        <label>Manufacturer:</label>
                        <span>${device.manufacturer}</span>
                    </div>
                    <div class="device-detail">
                        <label>Ping:</label>
                        <span>${device.ping}</span>
                    </div>
                    <div class="device-detail">
                        <label>Uptime:</label>
                        <span>${device.uptime}</span>
                    </div>
                    <div class="device-detail">
                        <label>Last Seen:</label>
                        <span>${lastSeenText}</span>
                    </div>
                </div>
                
                <div class="device-actions">
                    <button class="device-action-btn" data-action="ping">
                        <i class="fas fa-satellite-dish"></i>
                    </button>
                    <button class="device-action-btn" data-action="configure">
                        <i class="fas fa-cog"></i>
                    </button>
                    <button class="device-action-btn" data-action="monitor">
                        <i class="fas fa-chart-line"></i>
                    </button>
                </div>
            </div>
        `;
    }

    createDeviceListItem(device) {
        const statusClass = device.status;
        const statusIcon = this.getStatusIcon(device.status);
        const lastSeenText = this.formatLastSeen(device.lastSeen);
        
        return `
            <div class="device-list-item">
                <div class="device-list-controls">
                    <label class="checkbox-container">
                        <input type="checkbox" data-device-id="${device.id}">
                        <span class="checkmark"></span>
                    </label>
                </div>
                <div class="device-list-data">
                    <div class="device-name">
                        <div>
                            <strong>${device.name}</strong>
                            <br>
                            <small style="color: var(--text-secondary);">${device.manufacturer}</small>
                        </div>
                    </div>
                    <div class="status-badge ${statusClass}">
                        ${statusIcon} ${device.status}
                    </div>
                    <div>${device.type}</div>
                    <div>${device.ip}</div>
                    <div>${device.ping}</div>
                    <div>${device.uptime}</div>
                    <div class="device-list-actions">
                        <button class="list-action-btn" data-action="details" title="View Details">
                            <i class="fas fa-info-circle"></i>
                        </button>
                        <button class="list-action-btn" data-action="ping" title="Ping">
                            <i class="fas fa-satellite-dish"></i>
                        </button>
                        <button class="list-action-btn" data-action="configure" title="Configure">
                            <i class="fas fa-cog"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    getStatusIcon(status) {
        const icons = {
            online: '<i class="fas fa-circle" style="color: #22c55e;"></i>',
            warning: '<i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i>',
            offline: '<i class="fas fa-times-circle" style="color: #ef4444;"></i>'
        };
        return icons[status] || '<i class="fas fa-question-circle"></i>';
    }

    getTypeIcon(type) {
        const icons = {
            router: '<i class="fas fa-route"></i>',
            switch: '<i class="fas fa-network-wired"></i>',
            server: '<i class="fas fa-server"></i>',
            workstation: '<i class="fas fa-desktop"></i>',
            printer: '<i class="fas fa-print"></i>',
            iot: '<i class="fas fa-microchip"></i>'
        };
        return icons[type] || '<i class="fas fa-question"></i>';
    }

    formatLastSeen(date) {
        if (!date) return 'Never';
        
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
        return `${Math.floor(diffMins / 1440)}d ago`;
    }

    switchView(view) {
        this.currentView = view;
        
        // Update view buttons
        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });
        
        // Show/hide containers
        const gridContainer = document.getElementById('devicesGrid');
        const listContainer = document.getElementById('devicesList');
        
        if (view === 'grid') {
            gridContainer?.classList.remove('hidden');
            listContainer?.classList.add('hidden');
        } else {
            gridContainer?.classList.add('hidden');
            listContainer?.classList.remove('hidden');
        }
        
        this.renderDevices();
    }

    // Pagination methods
    setupPagination() {
        this.updatePagination();
    }

    updatePagination() {
        const totalPages = Math.ceil(this.totalDevices / this.itemsPerPage);
        
        // Update pagination info
        const start = (this.currentPage - 1) * this.itemsPerPage + 1;
        const end = Math.min(this.currentPage * this.itemsPerPage, this.totalDevices);
        
        const showingStart = document.getElementById('showingStart');
        const showingEnd = document.getElementById('showingEnd');
        const totalItems = document.getElementById('totalItems');
        
        if (showingStart) showingStart.textContent = start;
        if (showingEnd) showingEnd.textContent = end;
        if (totalItems) totalItems.textContent = this.totalDevices;
        
        // Update navigation buttons
        const prevBtn = document.getElementById('prevPage');
        const nextBtn = document.getElementById('nextPage');
        
        if (prevBtn) prevBtn.disabled = this.currentPage <= 1;
        if (nextBtn) nextBtn.disabled = this.currentPage >= totalPages;
        
        // Generate page numbers
        this.generatePageNumbers(totalPages);
    }

    generatePageNumbers(totalPages) {
        const container = document.getElementById('pageNumbers');
        if (!container) return;
        
        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
        
        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }
        
        let html = '';
        for (let i = startPage; i <= endPage; i++) {
            html += `
                <button class="page-number ${i === this.currentPage ? 'active' : ''}" 
                        data-page="${i}">${i}</button>
            `;
        }
        
        container.innerHTML = html;
        
        // Add click listeners
        container.querySelectorAll('.page-number').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const page = parseInt(e.target.dataset.page);
                this.goToPage(page);
            });
        });
    }

    previousPage() {
        if (this.currentPage > 1) {
            this.currentPage--;
            this.renderDevices();
        }
    }

    nextPage() {
        const totalPages = Math.ceil(this.totalDevices / this.itemsPerPage);
        if (this.currentPage < totalPages) {
            this.currentPage++;
            this.renderDevices();
        }
    }

    goToPage(page) {
        const totalPages = Math.ceil(this.totalDevices / this.itemsPerPage);
        if (page >= 1 && page <= totalPages) {
            this.currentPage = page;
            this.renderDevices();
        }
    }

    // Device selection methods
    toggleDeviceSelection(deviceId, selected) {
        if (selected) {
            this.selectedDevices.add(deviceId);
        } else {
            this.selectedDevices.delete(deviceId);
        }
        
        this.updateSelectedCount();
        this.updateSelectAllCheckbox();
    }

    toggleSelectAll(selectAll) {
        const currentPageDevices = this.getCurrentPageDevices();
        
        if (selectAll) {
            currentPageDevices.forEach(device => {
                this.selectedDevices.add(device.id);
            });
        } else {
            currentPageDevices.forEach(device => {
                this.selectedDevices.delete(device.id);
            });
        }
        
        // Update checkboxes in list view
        document.querySelectorAll('.device-list-item input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = selectAll;
        });
        
        this.updateSelectedCount();
    }

    getCurrentPageDevices() {
        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        return this.filteredDevices.slice(startIndex, endIndex);
    }

    updateSelectAllCheckbox() {
        const selectAllCheck = document.getElementById('selectAll');
        if (!selectAllCheck) return;
        
        const currentPageDevices = this.getCurrentPageDevices();
        const selectedOnPage = currentPageDevices.filter(device => 
            this.selectedDevices.has(device.id)
        ).length;
        
        selectAllCheck.checked = selectedOnPage === currentPageDevices.length && currentPageDevices.length > 0;
        selectAllCheck.indeterminate = selectedOnPage > 0 && selectedOnPage < currentPageDevices.length;
    }

    updateSelectedCount() {
        const countEl = document.getElementById('selectedCount');
        if (countEl) {
            countEl.textContent = this.selectedDevices.size;
        }
    }

    // Device Actions
    handleDeviceAction(device, action) {
        switch (action) {
            case 'details':
                this.showDeviceDetails(device);
                break;
            case 'ping':
                this.pingDevice(device);
                break;
            case 'configure':
                this.showDeviceDetails(device, 'configuration');
                break;
            case 'monitor':
                this.showDeviceDetails(device, 'performance');
                break;
        }
    }

    async pingDevice(device) {
        console.log(`🏓 Pinging device: ${device.name}`);
        this.showNotification(`Pinging ${device.name}...`, 'info');
        
        try {
            if (this.apiService) {
                const result = await this.apiService.pingDevice(device.id);
                const message = `${device.name}: ${result.ping}ms (${result.status})`;
                this.showNotification(message, result.status === 'success' ? 'success' : 'warning');
            } else {
                // Simulate ping
                const randomPing = Math.floor(Math.random() * 50) + 1;
                const message = `${device.name}: ${randomPing}ms (simulated)`;
                this.showNotification(message, 'success');
            }
        } catch (error) {
            this.showNotification(`Failed to ping ${device.name}`, 'error');
        }
    }

    // Device Discovery
    async discoverDevices() {
        console.log('🔍 Starting device discovery...');
        this.showNotification('Starting device discovery...', 'info');
        
        const discoverBtn = document.getElementById('discoverDevices');
        if (discoverBtn) {
            discoverBtn.disabled = true;
            discoverBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Discovering...';
        }
        
        try {
            if (this.apiService) {
                const result = await this.apiService.discoverDevices();
                this.showNotification(`Discovery complete. Found ${result.newDevices} new devices.`, 'success');
                await this.loadDevicesFromAPI();
            } else {
                // Simulate discovery
                setTimeout(() => {
                    this.simulateDeviceDiscovery();
                }, 2000);
            }
        } catch (error) {
            this.showNotification('Device discovery failed', 'error');
        } finally {
            if (discoverBtn) {
                discoverBtn.disabled = false;
                discoverBtn.innerHTML = '<i class="fas fa-search"></i> Discover Devices';
            }
        }
    }

    simulateDeviceDiscovery() {
        const newDevice = {
            id: `dev_${Date.now()}`,
            name: `New Device ${this.devices.length + 1}`,
            ip: `192.168.1.${100 + this.devices.length}`,
            mac: this.generateRandomMAC(),
            type: 'unknown',
            manufacturer: 'Unknown',
            status: 'online',
            group: 'guest',
            ping: `${Math.floor(Math.random() * 20) + 5}ms`,
            uptime: 'N/A',
            lastSeen: new Date(),
            description: 'Discovered device'
        };
        
        this.devices.push(newDevice);
        this.applyFilters();
        this.updateDeviceStats();
        this.renderDevices();
        this.showNotification(`New device discovered: ${newDevice.name}`, 'success');
    }

    generateRandomMAC() {
        const hexChars = '0123456789ABCDEF';
        let mac = '';
        for (let i = 0; i < 6; i++) {
            if (i > 0) mac += ':';
            mac += hexChars[Math.floor(Math.random() * 16)];
            mac += hexChars[Math.floor(Math.random() * 16)];
        }
        return mac;
    }

    // Modal Management
    showDeviceDetails(device, activeTab = 'overview') {
        console.log('📋 Showing device details:', device.name);
        
        this.currentDevice = device;
        this.populateDeviceModal(device);
        this.switchTab(activeTab);
        
        const modal = document.getElementById('deviceModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    populateDeviceModal(device) {
        // Update modal title
        const title = document.getElementById('deviceModalTitle');
        if (title) {
            title.textContent = `${device.name} Details`;
        }
        
        // Populate overview tab
        this.populateOverviewTab(device);
        this.populatePerformanceTab(device);
        this.populateConfigurationTab(device);
        this.populateSecurityTab(device);
    }

    populateOverviewTab(device) {
        const fields = {
            'deviceName': device.name,
            'deviceIP': device.ip,
            'deviceMAC': device.mac,
            'deviceType': device.type,
            'deviceManufacturer': device.manufacturer,
            'deviceStatus': device.status,
            'deviceSubnet': device.subnet || 'N/A',
            'deviceGateway': device.gateway || 'N/A',
            'deviceDNS': device.dns || 'N/A',
            'devicePorts': device.ports || 'N/A',
            'deviceLastSeen': this.formatLastSeen(device.lastSeen),
            'deviceUptime': device.uptime || 'N/A'
        };
        
        Object.entries(fields).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                if (id === 'deviceStatus') {
                    element.textContent = value;
                    element.className = `status-badge ${value}`;
                } else {
                    element.textContent = value;
                }
            }
        });
    }

    populatePerformanceTab(device) {
        const pingEl = document.getElementById('devicePing');
        const bandwidthEl = document.getElementById('deviceBandwidth');
        const packetLossEl = document.getElementById('devicePacketLoss');
        
        if (pingEl) pingEl.textContent = device.ping || 'N/A';
        if (bandwidthEl) bandwidthEl.textContent = device.bandwidth || 'N/A';
        if (packetLossEl) packetLossEl.textContent = device.packetLoss || 'N/A';
    }

    populateConfigurationTab(device) {
        const nameInput = document.getElementById('configDeviceName');
        const groupSelect = document.getElementById('configDeviceGroup');
        
        if (nameInput) nameInput.value = device.name;
        if (groupSelect) groupSelect.value = device.group;
    }

    populateSecurityTab(device) {
        const statusEl = document.getElementById('securityStatus');
        const portsEl = document.getElementById('openPorts');
        const vulnEl = document.getElementById('vulnerabilities');
        
        if (statusEl) {
            statusEl.textContent = device.securityStatus || 'Unknown';
            statusEl.className = `security-status ${device.securityStatus}`;
        }
        if (portsEl) portsEl.textContent = device.openPorts?.join(', ') || 'None';
        if (vulnEl) vulnEl.textContent = device.vulnerabilities ? `${device.vulnerabilities} found` : 'None detected';
    }

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        // Update tab content
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabName}Tab`);
        });
    }

    showAddDeviceModal() {
        const modal = document.getElementById('addDeviceModal');
        if (modal) {
            // Reset form
            const form = document.getElementById('addDeviceForm');
            if (form) form.reset();
            
            modal.style.display = 'flex';
        }
    }

    async saveNewDevice() {
        const form = document.getElementById('addDeviceForm');
        if (!form || !form.checkValidity()) {
            this.showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        const newDevice = {
            id: `dev_${Date.now()}`,
            name: document.getElementById('newDeviceName').value,
            ip: document.getElementById('newDeviceIP').value,
            type: document.getElementById('newDeviceType').value,
            group: document.getElementById('newDeviceGroup').value,
            description: document.getElementById('newDeviceDescription').value,
            mac: this.generateRandomMAC(),
            manufacturer: 'Unknown',
            status: 'online',
            ping: 'N/A',
            uptime: 'N/A',
            lastSeen: new Date()
        };
        
        try {
            if (this.apiService) {
                await this.apiService.addDevice(newDevice);
            }
            
            this.devices.push(newDevice);
            this.applyFilters();
            this.updateDeviceStats();
            this.renderDevices();
            
            const modal = document.getElementById('addDeviceModal');
            if (modal) modal.style.display = 'none';
            
            this.showNotification(`Device ${newDevice.name} added successfully`, 'success');
        } catch (error) {
            this.showNotification('Failed to add device', 'error');
        }
    }

    showBulkActionsModal() {
        if (this.selectedDevices.size === 0) {
            this.showNotification('Please select devices first', 'warning');
            return;
        }
        
        this.updateSelectedCount();
        const modal = document.getElementById('bulkActionsModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    async executeBulkAction(action) {
        const selectedIds = Array.from(this.selectedDevices);
        console.log(`🔨 Executing bulk action: ${action} on ${selectedIds.length} devices`);
        
        switch (action) {
            case 'ping':
                await this.bulkPingDevices(selectedIds);
                break;
            case 'group':
                this.bulkChangeGroup(selectedIds);
                break;
            case 'monitor':
                this.bulkToggleMonitoring(selectedIds);
                break;
            case 'remove':
                this.bulkRemoveDevices(selectedIds);
                break;
        }
        
        const modal = document.getElementById('bulkActionsModal');
        if (modal) modal.style.display = 'none';
    }

    async bulkPingDevices(deviceIds) {
        this.showNotification(`Pinging ${deviceIds.length} devices...`, 'info');
        
        for (const deviceId of deviceIds) {
            const device = this.devices.find(d => d.id === deviceId);
            if (device) {
                await this.pingDevice(device);
                await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
            }
        }
    }

    bulkChangeGroup(deviceIds) {
        const newGroup = prompt('Enter new group name:', 'production');
        if (!newGroup) return;
        
        deviceIds.forEach(deviceId => {
            const device = this.devices.find(d => d.id === deviceId);
            if (device) {
                device.group = newGroup;
            }
        });
        
        this.renderDevices();
        this.showNotification(`Updated group for ${deviceIds.length} devices`, 'success');
    }

    bulkToggleMonitoring(deviceIds) {
        this.showNotification(`Monitoring toggled for ${deviceIds.length} devices`, 'success');
    }

    bulkRemoveDevices(deviceIds) {
        if (!confirm(`Are you sure you want to remove ${deviceIds.length} devices?`)) {
            return;
        }
        
        this.devices = this.devices.filter(device => !deviceIds.includes(device.id));
        deviceIds.forEach(id => this.selectedDevices.delete(id));
        
        this.applyFilters();
        this.updateDeviceStats();
        this.renderDevices();
        this.showNotification(`Removed ${deviceIds.length} devices`, 'success');
    }

    // Device Modal Actions
    async pingCurrentDevice() {
        if (this.currentDevice) {
            await this.pingDevice(this.currentDevice);
        }
    }

    async traceRouteCurrentDevice() {
        if (!this.currentDevice) return;
        
        console.log(`🛤️ Tracing route to: ${this.currentDevice.name}`);
        this.showNotification(`Tracing route to ${this.currentDevice.name}...`, 'info');
        
        // Simulate traceroute
        setTimeout(() => {
            this.showNotification(`Traceroute complete to ${this.currentDevice.name}`, 'success');
        }, 2000);
    }

    removeCurrentDevice() {
        if (!this.currentDevice) return;
        
        if (confirm(`Are you sure you want to remove ${this.currentDevice.name}?`)) {
            this.devices = this.devices.filter(d => d.id !== this.currentDevice.id);
            this.selectedDevices.delete(this.currentDevice.id);
            
            this.applyFilters();
            this.updateDeviceStats();
            this.renderDevices();
            
            const modal = document.getElementById('deviceModal');
            if (modal) modal.style.display = 'none';
            
            this.showNotification(`Device ${this.currentDevice.name} removed`, 'success');
        }
    }

    // Utility Methods
    showNotification(message, type = 'info') {
        console.log(`📢 ${type.toUpperCase()}: ${message}`);
        
        // Create notification element (you can enhance this)
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        // Add to page temporarily
        document.body.appendChild(notification);
        
        // Remove after delay
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.devicesManager = new DevicesManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DevicesManager;
} 