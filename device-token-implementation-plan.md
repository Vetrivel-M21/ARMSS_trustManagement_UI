# Implementation Plan: Desktop-Only Access via Device Token

## Goal
Restrict the Stationery Management web application so it is only functional when accessed through the companion desktop application. Direct browser access should load static assets but fail all API calls with a `403 Forbidden`.

## Why this approach
A public URL cannot distinguish who is requesting it. The only reliable way to gate access is to have the desktop app **prove** its identity to the backend on every request, using a short-lived signed token that a browser cannot obtain on its own. Query params or referrer checks are trivially bypassed; this token-based approach is the only one that holds up under inspection of the desktop app's own network traffic.

## Architecture

```
Desktop App                     Go Backend                    Frontend (React)
    |                                |                              |
    |--1. Device auth request------>|                              |
    |<-2. Device token (signed)-----|                              |
    |                                |                              |
    |--3. Load webview with token-------------------------------->|
    |                                |<--4. API calls + token-------|
    |                                |--5. Validate on every call-->|
```

Two independent tokens exist:
- **Device token** — proves the request originates from the desktop app's webview. Required on every `/api/v1/*` route.
- **User JWT** — your existing auth, proves which logged-in user (branch requester, approver, agency, admin, monitor) is acting. Required on protected routes, layered on top of the device token.

---

## Phase 1 — Backend: Device Registration & Token Issuance

### 1.1 New table: `device_clients`
```sql
CREATE TABLE device_clients (
    id VARCHAR(36) PRIMARY KEY,
    client_secret_hash VARCHAR(255) NOT NULL,
    name VARCHAR(100) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP NULL
);
```
Holds one (or a few) pre-registered client identities for the desktop app itself — not individual end users.

### 1.2 Generate client credentials once
```bash
openssl rand -hex 32
```
- Store the **hash** (bcrypt or sha256) of this secret in `device_clients.client_secret_hash`.
- Embed the **plaintext secret** into the desktop app's build config. Treat it like an API key — do not commit to a public repo.

### 1.3 New endpoint: `POST /api/v1/device/auth`
```go
type DeviceAuthRequest struct {
    ClientID     string `json:"client_id" binding:"required"`
    ClientSecret string `json:"client_secret" binding:"required"`
}

func (h *DeviceAuthHandler) Authenticate(c *gin.Context) {
    var req DeviceAuthRequest
    if err := c.ShouldBindJSON(&req); err != nil {
        c.JSON(http.StatusBadRequest, gin.H{
            "error_code": "INVALID_REQUEST",
            "message":    "client_id and client_secret are required",
        })
        return
    }

    device, err := h.deviceSvc.ValidateClient(req.ClientID, req.ClientSecret)
    if err != nil {
        logger.Warn(fmt.Sprintf("device auth failed for client_id=%s: %v", req.ClientID, err))
        c.JSON(http.StatusUnauthorized, gin.H{
            "error_code": "DEVICE_AUTH_FAILED",
            "message":    "invalid device credentials",
        })
        return
    }

    token, expiresAt, err := h.deviceSvc.IssueDeviceToken(device.ID)
    if err != nil {
        c.JSON(http.StatusInternalServerError, gin.H{
            "error_code": "TOKEN_ISSUE_FAILED",
            "message":    "unable to issue device token",
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "device_token": token,
        "expires_at":   expiresAt,
    })
}
```

### 1.4 Token issuance logic (short-lived signed JWT)
```go
const DeviceTokenTTL = 15 * time.Minute

func (s *DeviceService) IssueDeviceToken(deviceID string) (string, time.Time, error) {
    expiresAt := time.Now().Add(DeviceTokenTTL)

    claims := jwt.MapClaims{
        "device_id": deviceID,
        "type":      "device",
        "exp":       expiresAt.Unix(),
        "iat":       time.Now().Unix(),
    }

    token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
    signed, err := token.SignedString([]byte(s.cfg.DeviceJWTSecret))
    if err != nil {
        return "", time.Time{}, fmt.Errorf("sign device token: %w", err)
    }

    return signed, expiresAt, nil
}
```

> Use a **separate JWT secret** (`DEVICE_JWT_SECRET` in `.env`) from the user-auth JWT secret, so the two token systems are fully isolated.

---

## Phase 2 — Backend: Enforce Device Token on All API Routes

### 2.1 Middleware: `RequireDeviceToken`
```go
func RequireDeviceToken(cfg *config.Config) gin.HandlerFunc {
    return func(c *gin.Context) {
        tokenStr := c.GetHeader("X-Device-Token")
        if tokenStr == "" {
            c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
                "error_code": "DEVICE_TOKEN_MISSING",
                "message":    "this application must be accessed through the desktop client",
            })
            return
        }

        token, err := jwt.Parse(tokenStr, func(t *jwt.Token) (interface{}, error) {
            return []byte(cfg.DeviceJWTSecret), nil
        })
        if err != nil || !token.Valid {
            c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
                "error_code": "DEVICE_TOKEN_INVALID",
                "message":    "invalid or expired device token",
            })
            return
        }

        claims, ok := token.Claims.(jwt.MapClaims)
        if !ok || claims["type"] != "device" {
            c.AbortWithStatusJSON(http.StatusForbidden, gin.H{
                "error_code": "DEVICE_TOKEN_INVALID",
                "message":    "invalid device token type",
            })
            return
        }

        c.Set("device_id", claims["device_id"])
        c.Next()
    }
}
```

### 2.2 Apply globally, ahead of existing user auth
```go
api := r.Group("/api/v1")
api.Use(middleware.RequireDeviceToken(cfg)) // NEW — every API route requires this first
{
    auth := api.Group("/auth")
    {
        auth.POST("/login", authHandler.Login) // needs device token, not yet a user JWT
    }

    protected := api.Group("")
    protected.Use(middleware.JWTAuth(cfg)) // existing user auth, layered on top
    {
        // ... all existing routes unchanged
    }
}
```

**Result:** every API call now requires a valid device token (proves desktop origin) and, for protected routes, a valid user JWT (proves which user). A browser typing the URL directly still loads static HTML/JS, but every API call returns `403`, making the app non-functional outside the desktop client.

---

## Phase 3 — Frontend: Attach Device Token on Every Request

### 3.1 Token source
The desktop app injects the token into the webview on load, via one of:
- A value read once from a custom URL scheme/query param, then held in memory
- `window.__DEVICE_TOKEN__` set before the React app boots (preferred — framework-dependent, see Phase 4)

### 3.2 Axios interceptor
```js
// src/api/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const deviceToken = window.__DEVICE_TOKEN__ || sessionStorage.getItem('device_token');
  if (deviceToken) {
    config.headers['X-Device-Token'] = deviceToken;
  }
  const userToken = sessionStorage.getItem('user_token');
  if (userToken) {
    config.headers['Authorization'] = `Bearer ${userToken}`;
  }
  return config;
});

export default api;
```

### 3.3 Token refresh
Device tokens expire every 15 minutes. Add a background refresh triggered by the **desktop app** (not the web frontend) that re-authenticates and updates `window.__DEVICE_TOKEN__` periodically, or reactively on a `403` response with `error_code: DEVICE_TOKEN_INVALID`.

---

## Phase 4 — Desktop App Integration

The exact injection mechanism depends on the desktop framework:

| Framework | Mechanism |
|---|---|
| **Electron** | `preload.js` with `contextBridge.exposeInMainWorld`, injected before the page loads; main process performs the initial `/device/auth` call before creating the `BrowserWindow`. |
| **Tauri** | Rust backend performs the auth call, then injects the token via `window.eval()` or Tauri's IPC bridge before navigation. |
| **.NET WebView2** | `CoreWebView2.AddScriptToExecuteOnDocumentCreatedAsync` injects the token before the React app's JS executes. |

> Confirm which framework is in use before implementing this phase — the code differs meaningfully between them.

---

## Testing Checklist

- [ ] Create `device_clients` table, generate one client ID/secret pair
- [ ] Add `DEVICE_JWT_SECRET` to backend `.env`
- [ ] Build `POST /api/v1/device/auth` endpoint
- [ ] Build `RequireDeviceToken` middleware, apply globally to `/api/v1`
- [ ] Update frontend Axios to attach `X-Device-Token` header
- [ ] Update desktop app to authenticate on startup and inject token into webview
- [ ] Add token refresh logic (device token expires every 15 min)
- [ ] Test: browser direct access to the domain — static page loads, all API calls return `403`
- [ ] Test: desktop app — full functionality works normally end-to-end
- [ ] Test: expired device token — desktop app refreshes and recovers without user disruption
