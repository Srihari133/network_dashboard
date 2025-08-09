# Network Monitoring Dashboard API Documentation

## Overview
This documentation describes the REST API endpoints and WebSocket channels that the Network Monitoring Dashboard expects from the backend server.

## Base Configuration
- **Base URL**: `http://localhost:8080/api/v1`
- **WebSocket URL**: `ws://localhost:8080/ws`
- **Authentication**: Bearer token in `Authorization` header

## REST API Endpoints

### 1. System Metrics

#### GET /metrics/network
Returns overall network statistics.

**Response:**
```json
{
  "uptime": {
    "percentage": 98.7,
    "change": 0.2,
    "since": "2024-01-01T00:00:00Z"
  },
  "bandwidth": {
    "current": 847,
    "max": 1000,
    "change": -5.1,
    "unit": "Mbps"
  },
  "devices": {
    "total": 156,
    "online": 142,
    "offline": 14,
    "change": 3.2
  },
  "alerts": {
    "active": 23,
    "critical": 2,
    "warning": 15,
    "info": 6,
    "change": 15.3
  }
}
```

#### GET /metrics/bandwidth?range={timeRange}
Returns bandwidth usage data.

**Parameters:**
- `range`: Time range (1h, 24h, 7d, 30d)

**Response:**
```json
{
  "historical": {
    "upload": [35, 42, 38, 45, 40, 37, 41],
    "download": [85, 78, 82, 90, 87, 83, 88],
    "timestamps": ["2024-01-15T10:00:00Z", "2024-01-15T11:00:00Z", ...],
    "unit": "Mbps"
  },
  "current": {
    "upload": 41,
    "download": 88,
    "timestamp": "2024-01-15T15:30:00Z"
  }
}
```

#### GET /metrics/system
Returns system health metrics.

**Response:**
```json
{
  "cpu_usage": 45.2,
  "memory_usage": 67.8,
  "disk_usage": 82.1,
  "network_latency": 12.5,
  "status": "healthy",
  "last_update": "2024-01-15T15:30:00Z"
}
```

### 2. Device Management

#### GET /devices
Returns list of all network devices.

**Response:**
```json
[
  {
    "id": "device_001",
    "ip_address": "192.168.1.10",
    "hostname": "main-server",
    "mac_address": "00:1B:44:11:3A:B7",
    "device_type": "server",
    "vendor": "Dell Inc.",
    "status": "online",
    "ping_ms": 12,
    "last_seen": "2024-01-15T15:30:00Z",
    "location": "Server Room",
    "ports": [80, 443, 22]
  }
]
```

#### GET /devices/{id}
Returns detailed information about a specific device.

#### POST /devices/scan
Initiates a network scan to discover devices.

**Response:**
```json
{
  "scan_id": "scan_20240115_153000",
  "status": "completed",
  "devices_found": 156,
  "new_devices": 3,
  "scan_duration": 45.2,
  "devices": [...]
}
```

#### POST /devices/{id}/ping
Pings a specific device.

**Response:**
```json
{
  "device_id": "device_001",
  "ping_ms": 12.5,
  "status": "success",
  "timestamp": "2024-01-15T15:30:00Z",
  "packet_loss": 0
}
```

#### POST /devices/{id}/trace
Performs traceroute to a device.

**Response:**
```json
{
  "device_id": "device_001",
  "hops": 4,
  "total_time": 45.2,
  "route": [
    {"hop": 1, "ip": "192.168.1.1", "time": 1.2},
    {"hop": 2, "ip": "10.0.0.1", "time": 12.8}
  ],
  "timestamp": "2024-01-15T15:30:00Z"
}
```

### 3. Network Events

#### GET /events?limit={limit}&since={timestamp}
Returns network events.

**Parameters:**
- `limit`: Maximum number of events (default: 50)
- `since`: ISO timestamp to filter events

**Response:**
```json
[
  {
    "id": "event_001",
    "timestamp": "2024-01-15T15:30:00Z",
    "event_type": "connection",
    "device_ip": "192.168.1.45",
    "device_id": "device_045",
    "description": "New device connected",
    "severity": "info",
    "status": "active",
    "additional_data": {}
  }
]
```

#### POST /events
Creates a new network event.

**Request Body:**
```json
{
  "event_type": "security_alert",
  "device_ip": "192.168.1.100",
  "description": "Failed login attempt detected",
  "severity": "warning",
  "additional_data": {
    "attempts": 5,
    "source": "external"
  }
}
```

#### GET /events/export?format={format}&start_date={date}&end_date={date}
Exports events in specified format.

**Parameters:**
- `format`: Export format (csv, json, xml)
- `start_date`: Start date for export
- `end_date`: End date for export

**Response:** File download

### 4. Security & Alerts

#### GET /security/alerts?severity={level}
Returns security alerts.

**Parameters:**
- `severity`: Filter by severity (critical, warning, info)

**Response:**
```json
[
  {
    "id": "alert_001",
    "timestamp": "2024-01-15T15:30:00Z",
    "severity": "critical",
    "type": "intrusion_attempt",
    "source_ip": "203.0.113.42",
    "target_ip": "192.168.1.10",
    "description": "Multiple failed SSH login attempts",
    "status": "active",
    "acknowledged": false
  }
]
```

#### POST /security/alerts/{id}/acknowledge
Acknowledges a security alert.

### 5. Traffic Analytics

#### GET /traffic/realtime
Returns real-time traffic data.

**Response:**
```json
{
  "upload": 145.7,
  "download": 702.3,
  "timestamp": "2024-01-15T15:30:00Z",
  "active_connections": 1247,
  "top_protocols": [
    {"protocol": "HTTP", "percentage": 45.2},
    {"protocol": "HTTPS", "percentage": 32.1}
  ]
}
```

#### GET /traffic/historical?range={range}&interval={interval}
Returns historical traffic data.

**Parameters:**
- `range`: Time range (1h, 24h, 7d, 30d)
- `interval`: Data interval (1m, 5m, 1h, 1d)

#### GET /traffic/device/{id}?range={range}
Returns traffic data for a specific device.

### 6. Configuration

#### GET /config/dashboard
Returns dashboard configuration.

**Response:**
```json
{
  "refresh_interval": 30000,
  "max_events": 100,
  "chart_update_interval": 2000,
  "features": {
    "real_time_monitoring": true,
    "websocket_enabled": true
  }
}
```

#### PUT /config/dashboard
Updates dashboard configuration.

#### GET /config/user
Returns user preferences.

#### PUT /config/user
Updates user preferences.

## WebSocket Channels

### Connection
Connect to: `ws://localhost:8080/ws`

Send subscription message:
```json
{
  "type": "subscribe",
  "channel": "network-metrics",
  "timestamp": "2024-01-15T15:30:00Z"
}
```

### Available Channels

#### 1. network-metrics
Real-time network statistics updates.

**Message Format:**
```json
{
  "channel": "network-metrics",
  "type": "stats_update",
  "payload": {
    "uptime": {"percentage": 98.7, "change": 0.1},
    "bandwidth": {"current": 850, "change": 3},
    "timestamp": "2024-01-15T15:30:00Z"
  }
}
```

#### 2. network-events
Real-time network events.

**Message Format:**
```json
{
  "channel": "network-events",
  "type": "new_event",
  "payload": {
    "id": "event_002",
    "type": "connection",
    "device": "192.168.1.50",
    "description": "Device disconnected",
    "severity": "warning",
    "timestamp": "2024-01-15T15:30:00Z"
  }
}
```

#### 3. device-status
Device status updates.

**Message Format:**
```json
{
  "channel": "device-status",
  "type": "status_change",
  "payload": {
    "device_id": "device_001",
    "device_ip": "192.168.1.10",
    "status": "offline",
    "ping": null,
    "status_changed": true,
    "timestamp": "2024-01-15T15:30:00Z"
  }
}
```

#### 4. traffic-updates
Real-time traffic updates.

**Message Format:**
```json
{
  "channel": "traffic-updates",
  "type": "traffic_data",
  "payload": {
    "upload": 156.8,
    "download": 724.1,
    "timestamp": "2024-01-15T15:30:00Z"
  }
}
```

#### 5. security-alerts
Security alerts in real-time.

**Message Format:**
```json
{
  "channel": "security-alerts",
  "type": "new_alert",
  "payload": {
    "id": "alert_002",
    "severity": "critical",
    "source_ip": "203.0.113.42",
    "description": "Port scan detected",
    "timestamp": "2024-01-15T15:30:00Z"
  }
}
```

#### 6. system-health
Real-time system health updates.

**Message Format:**
```json
{
  "channel": "system-health",
  "type": "health_update",
  "payload": {
    "cpu_usage": 45.2,
    "cpu_change": -2.1,
    "memory_usage": 67.8,
    "memory_change": 1.5,
    "disk_usage": 82.1,
    "disk_change": 0.3,
    "network_latency": 12.5,
    "status": "healthy",
    "timestamp": "2024-01-15T15:30:00Z"
  }
}
```

## Error Responses

All endpoints return errors in this format:
```json
{
  "error": {
    "code": "DEVICE_NOT_FOUND",
    "message": "Device with ID 'device_999' not found",
    "timestamp": "2024-01-15T15:30:00Z",
    "request_id": "req_12345"
  }
}
```

## Rate Limiting
- REST API: 100 requests per minute per IP
- WebSocket: 10 subscriptions per connection

## Authentication
Include Bearer token in Authorization header:
```
Authorization: Bearer your_jwt_token_here
```

## Implementation Notes

1. **Fallback Behavior**: The dashboard gracefully handles API failures with cached/simulated data
2. **Real-time Priority**: WebSocket updates take precedence over polling
3. **Error Recovery**: Automatic retry with exponential backoff
4. **Connection Monitoring**: Dashboard detects online/offline status
5. **Data Validation**: All API responses are validated before use

This API structure provides a robust foundation for real-time network monitoring with proper error handling and fallback mechanisms. 