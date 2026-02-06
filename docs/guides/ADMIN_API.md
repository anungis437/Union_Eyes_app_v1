# Admin Panel API Documentation

## Authentication
All admin endpoints require authentication via Clerk and admin role verification.

## Base URL
`/api/admin`

---

## Statistics Endpoints

### GET /api/admin/stats/overview
Get system-wide statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "totalMembers": 1234,
    "totalTenants": 56,
    "activeTenants": 54,
    "totalStorage": 45.2,
    "activeToday": 89
  }
}
```

### GET /api/admin/stats/activity
Get recent activity feed.

**Query Parameters:**
- `limit` (optional): Number of items to return (max 100, default 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "action": "User joined",
      "user": "user_123",
      "tenant": "Toronto Central",
      "role": "member",
      "timestamp": "2025-12-03T10:30:00Z"
    }
  ],
  "count": 10
}
```

---

## User Management Endpoints

### GET /api/admin/users
List all users with optional filtering.

**Query Parameters:**
- `search` (optional): Search by user ID or tenant name
- `tenantId` (optional): Filter by tenant ID
- `role` (optional): Filter by role (member, steward, officer, admin)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "user_123",
      "name": "User",
      "email": "user_123",
      "role": "member",
      "tenantId": "abc-123",
      "tenantName": "Toronto Central",
      "status": "active",
      "lastLogin": "2025-12-03T10:30:00Z",
      "joinedAt": "2025-11-01T08:00:00Z"
    }
  ],
  "count": 1234
}
```

### POST /api/admin/users
Add a user to a tenant.

**Request Body:**
```json
{
  "userId": "user_123",
  "tenantId": "abc-123",
  "role": "member"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tenantUserId": "xyz-789",
    "userId": "user_123",
    "tenantId": "abc-123",
    "role": "member",
    "isActive": true
  }
}
```

### GET /api/admin/users/[userId]
Get user details across all tenants.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "tenantUserId": "xyz-789",
      "userId": "user_123",
      "tenantId": "abc-123",
      "role": "member",
      "isActive": true,
      "joinedAt": "2025-11-01T08:00:00Z"
    }
  ]
}
```

### PUT /api/admin/users/[userId]
Update user role or status.

**Request Body:**
```json
{
  "tenantId": "abc-123",
  "action": "updateRole",
  "role": "steward"
}
```

Or:
```json
{
  "tenantId": "abc-123",
  "action": "toggleStatus"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User role updated"
}
```

### DELETE /api/admin/users/[userId]
Remove user from tenant.

**Query Parameters:**
- `tenantId` (required): Tenant ID

**Response:**
```json
{
  "success": true,
  "message": "User removed from tenant"
}
```

---

## Organization Management Endpoints

### GET /api/admin/organizations
List all organizations with statistics.

**Query Parameters:**
- `search` (optional): Search by name or slug

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "abc-123",
      "slug": "toronto-central",
      "name": "Toronto Central",
      "status": "active",
      "subscriptionTier": "premium",
      "totalUsers": 234,
      "activeUsers": 210,
      "storageUsed": "5.2",
      "createdAt": "2025-01-01T00:00:00Z",
      "contactEmail": "admin@toronto.ca",
      "phone": "+1-416-555-0100"
    }
  ],
  "count": 56
}
```

### POST /api/admin/organizations
Create a new organization.

**Request Body:**
```json
{
  "tenantSlug": "new-org",
  "tenantName": "New Organization",
  "contactEmail": "contact@neworg.ca",
  "phone": "+1-555-0100",
  "subscriptionTier": "basic"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "tenantId": "new-123"
  },
  "message": "Organization created successfully"
}
```

### GET /api/admin/organizations/[tenantId]
Get organization details with statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "tenant": {
      "tenantId": "abc-123",
      "tenantSlug": "toronto-central",
      "tenantName": "Toronto Central",
      "subscriptionTier": "premium",
      "status": "active",
      "contactEmail": "admin@toronto.ca",
      "createdAt": "2025-01-01T00:00:00Z"
    },
    "stats": {
      "users": {
        "total": 234,
        "active": 210,
        "byRole": {
          "admin": 5,
          "steward": 20,
          "officer": 30,
          "member": 179
        }
      },
      "usage": {
        "storageUsedGb": "5.234",
        "activeUsers": 210,
        "apiRequests": 12345
      }
    }
  }
}
```

### PUT /api/admin/organizations/[tenantId]
Update organization details.

**Request Body:**
```json
{
  "tenantName": "Updated Name",
  "contactEmail": "new@email.com",
  "phone": "+1-555-0200",
  "status": "active",
  "subscriptionTier": "premium"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Organization updated successfully"
}
```

### DELETE /api/admin/organizations/[tenantId]
Archive (soft delete) an organization.

**Response:**
```json
{
  "success": true,
  "message": "Organization archived successfully"
}
```

---

## System Management Endpoints

### GET /api/admin/system/settings
Get system configurations.

**Query Parameters:**
- `category` (optional): Filter by category

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "category": "email",
      "key": "smtp_host",
      "value": "smtp.example.com",
      "description": "SMTP server hostname"
    }
  ],
  "count": 10
}
```

### PUT /api/admin/system/settings
Update system configuration.

**Request Body:**
```json
{
  "tenantId": "abc-123",
  "category": "email",
  "key": "smtp_host",
  "value": "smtp.newserver.com"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Setting updated successfully"
}
```

### POST /api/admin/system/cache
Clear application cache.

**Response:**
```json
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

---

## Database Management Endpoints

### GET /api/admin/database/health
Get database health metrics.

**Response:**
```json
{
  "success": true,
  "data": {
    "database": {
      "size": "18.7 GB",
      "size_bytes": "20075290624"
    },
    "connections": {
      "total_connections": 50,
      "active_connections": 12,
      "idle_connections": 38
    },
    "largestTables": [
      {
        "schemaname": "public",
        "tablename": "claims",
        "size": "5.2 GB"
      }
    ]
  }
}
```

### POST /api/admin/database/optimize
Run database optimization (ANALYZE).

**Response:**
```json
{
  "success": true,
  "message": "Database optimization completed"
}
```

---

## Error Responses

All endpoints return errors in this format:

```json
{
  "error": "Error message here"
}
```

Common HTTP status codes:
- `401`: Unauthorized (not logged in)
- `403`: Forbidden (not admin)
- `404`: Not found
- `400`: Bad request (invalid parameters)
- `409`: Conflict (e.g., duplicate slug)
- `500`: Internal server error
