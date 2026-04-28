## macao-rewards-tracker：Google OAuth Login（方案 A）實作計畫

> 註解：方案 A = 「Google 登入後，用 `email` 當系統 `username`」。  
> 註解：你目前架構是 Spring Boot 後端發 JWT、前端把 token 存在 `sessionStorage`（見 `frontend/src/api/client.ts`），所以 Google 登入會沿用同一套 `TokenResponse` / `AuthContext` 流程，改動最小。

---

### 目標（註解）
- **前端（Vercel）**：使用者點「Google 登入」→ 彈窗登入成功 → 取得 Google `id_token`（credential）。
- **後端（Render / Spring Boot）**：收到 `id_token` → 驗證簽章與 `aud` → 找/建使用者（`username=email`）→ 回傳你系統的 **JWT**（沿用既有 `TokenResponse`）。

資料流（註解）：
- `frontend` → Google：Popup 取得 `id_token`
- `frontend` → `backend`：`POST /api/auth/google { idToken }`
- `backend` → `frontend`：`{ token, username }`（與既有登入一致）

---

### 已知環境（註解）
- **前端網址**：`https://macao-rewards-tracker.vercel.app`
- **後端網址**：`https://macao-rewards-tracker.onrender.com`
- **Google OAuth Client ID**：`398853431747-1v7n3u5qdua77oadcamh9s9mstlrht1h.apps.googleusercontent.com`

---

### 1) Google Cloud Console 設定（必做）（註解）
#### 1.1 OAuth consent screen
- **Authorized domains**（填根網域，不是整條網址）：
  - `vercel.app`
  - `onrender.com`

> 註解：若 consent screen 未完成或 domains 未填齊，正式網域可能會在登入時被阻擋或在發佈/驗證階段卡住。

#### 1.2 Credentials → OAuth 2.0 Client（Web application）
- **Authorized JavaScript origins**（不帶路徑）：
  - `https://macao-rewards-tracker.vercel.app`
  - （建議加開發用）`http://localhost:5173`
- **Authorized redirect URIs**
  - 註解：本方案用「前端 popup 取 `id_token`」，一般**不必**填 redirect URI。
  - 註解：若將來改成「後端 code flow」，才需要新增類似：
    - `https://macao-rewards-tracker.onrender.com/api/auth/google/callback`（需後端實作對應 endpoint）

---

### 2) 後端（Spring Boot / Render）改造（註解）
目標：新增 `POST /api/auth/google`，驗證 `id_token` 後回你現有 `TokenResponse`。

#### 2.1 新增設定：Google Client ID（後端用來驗 aud）（註解）
新增設定項（擇一）：
- **方式 A（推薦）**：用環境變數
  - Render Env：`APP_GOOGLE_CLIENT_ID=398853431747-...apps.googleusercontent.com`
- **方式 B**：寫進 `application.yml`（不推薦硬編）
  - `app.google.client-id: 398853431747-...apps.googleusercontent.com`

> 註解：後端一定要驗 `aud`，避免別的 Google 專案簽發的 token 也能登入你的系統。

#### 2.2 CORS（你是前後端不同網域）（註解）
Render Env：
- `APP_CORS_ALLOWED_ORIGINS=https://macao-rewards-tracker.vercel.app`

> 註解：你的 `SecurityConfig` 會在 prod 用 `app.cors.allowed-origins` 精準放行；若沒設，前端會被瀏覽器 CORS 擋住。

#### 2.3 安裝後端依賴：驗證 Google `id_token`（註解）
在 `backend/pom.xml` 增加「Google ID token 驗證」相關 dependency（常見做法）：
- `com.google.api-client:google-api-client`
- `com.google.oauth-client:google-oauth-client`

> 註解：用途是「抓 Google 公鑰、驗簽、驗 `iss/aud/exp`、取出 `email/sub`」。不需要整套 OAuth code flow。

#### 2.4 新增 DTO（註解）
新增：
- `backend/src/main/java/com/macaorewards/api/dto/GoogleLoginRequest.java`
  - 欄位：`idToken`

#### 2.5 新增 API：`POST /api/auth/google`（註解）
在 `backend/src/main/java/com/macaorewards/api/AuthController.java` 新增：
- `POST /api/auth/google`
- Request：`GoogleLoginRequest`
- Response：沿用 `TokenResponse`

端點內邏輯（註解）：
- 驗證 `id_token`：
  - 簽章有效
  - `aud == APP_GOOGLE_CLIENT_ID`
  - `iss` 正確、`exp` 未過期
  - （建議）`email_verified == true`
- 取出 `email`，並以 `email` 作為系統 `username`
- `UserRepository.findByUsername(email)` 找使用者
  - 找不到：建立新使用者
- 回傳：`TokenResponse(jwtService.createToken(email), email)`

#### 2.6 使用者資料模型注意事項（非常重要）（註解）
你目前 `User.username` 是 `length = 64`（見 `backend/src/main/java/com/macaorewards/domain/User.java`）。
- **風險**：少數 email 可能 > 64 字元，會造成註冊/登入失敗。
- 建議（擇一）：
  - 把 `username` length 調大（例如 254），或
  - 新增 `email` 欄位（長度 254）並調整登入/查找策略

`passwordHash` 的處理（註解）：
- Google 登入使用者不會用帳密登入，但你目前 `passwordHash` 是 `nullable=false`。
- 建議方案（擇一）：
  - 建立 Google 使用者時給一個「高熵隨機字串」當 `passwordHash`（不可逆、不可猜），避免帳密登入被誤用
  - 或改 DB/Entity 允許 `passwordHash` 為 null，並調整帳密登入流程（改動較大）

---

### 3) 前端（React/Vite / Vercel）改造（註解）
目標：在 `LoginPage` 加 Google 登入按鈕（popup），取得 `id_token` 後呼叫後端換你系統 JWT。

#### 3.1 前端環境變數（註解）
Vercel Env（或本機 `.env.*`）新增：
- `VITE_GOOGLE_CLIENT_ID=398853431747-...apps.googleusercontent.com`

> 註解：Client ID 不是 secret，可以放前端；**Client Secret 不可放前端**。

#### 3.2 安裝套件（註解）
新增前端依賴：
- `@react-oauth/google`

#### 3.3 在入口包 Provider（註解）
在 `frontend/src/main.tsx`（或 `App.tsx` 外層）包：
- `GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}`

#### 3.4 新增前端 API 呼叫（註解）
在 `frontend/src/api/authApi.ts` 增加：
- `loginWithGoogle(idToken: string)`
  - `POST /api/auth/google`
  - 收到 `{ token, username }` 後呼叫 `setSession(token, username)`（沿用現有習慣）

#### 3.5 LoginPage 加 Google 登入按鈕（popup）（註解）
在 `frontend/src/pages/LoginPage.tsx`：
- 加一顆「Google 登入」按鈕/元件
- popup 成功後會拿到 `credential`（即 `id_token`）
- 呼叫 `authApi.loginWithGoogle(credential)`，成功後 `navigate('/')`

---

### 4) 部署與驗收（註解）
#### 4.1 Render（後端）
- 確認 env 都設好：
  - `APP_CORS_ALLOWED_ORIGINS=https://macao-rewards-tracker.vercel.app`
  - `APP_GOOGLE_CLIENT_ID=398853431747-...`
- 確認後端 log 無 CORS/啟動錯誤

#### 4.2 Vercel（前端）
- 設定：
  - `VITE_GOOGLE_CLIENT_ID=398853431747-...`
- 重新部署

#### 4.3 E2E 驗收（註解）
- 在 `https://macao-rewards-tracker.vercel.app` 點「Google 登入」能正常彈窗
- 登入成功後前端會呼叫：
  - `https://macao-rewards-tracker.onrender.com/api/auth/google`
- 後端回 `{ token, username }` 後：
  - `sessionStorage` 出現 `macao_rewards_token`、`macao_rewards_username`
  - 進入需要授權的頁面/API 不會被 401

---

### 常見問題排查（註解）
- **彈窗打不開/直接失敗**：檢查 Google Console 的 `Authorized JavaScript origins` 是否包含 `https://macao-rewards-tracker.vercel.app`
- **前端報 CORS**：檢查 Render 的 `APP_CORS_ALLOWED_ORIGINS` 是否精準等於前端網域（不要帶路徑）
- **後端回 401/400**：通常是 `aud` 驗證沒過（`APP_GOOGLE_CLIENT_ID` 不對）或 `id_token` 不是給這個 client_id 簽發
- **資料庫寫入失敗**：檢查 `username` 欄位長度（email 可能太長）

