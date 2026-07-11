# Authentication & Role Gate Documentation

## 1. Overview
The `Authentication & Role Gate` is the entry point of the mobile application. It verifies user credentials against the backend API, stores session tokens securely, and dynamically routes the user to their appropriate interface group based on their primary operational role.

---

## 2. Router & Routing Layout
- **Layout Route**: `app/(auth)/_layout.tsx`
- **Login Screen Route**: `app/(auth)/login/index.tsx`
- **Redirect Router Controller**: `app/_layout.tsx`

### Persona Route Groups
- **`Administrator`** → `/(admin)`
- **`Asisten` / `Manager`** → `/(asisten)`
- **`Krani Timbang`** → `/(krani)`
- **`Mandor`** → `/(mandor)`
- **`Pekerja` (Pemanen / Harvester)** → `/(pemanen)`

---

## 3. Tech Stack & State Management

### A. State Management Store (`useAuthStore`)
- **Library**: `Zustand`
- **Session Security**: Matches token key `auth_token` inside **`expo-secure-store`** for device-level encryption.
- **Attributes**:
  - `user`: Object containing user account parameters.
  - `token`: Encrypted session authentication token.
  - `roles`: Assigned roles array (e.g., `[ { id: "...", nama: "mandor" } ]`).
  - `permissions`: Active permission items.
  - `isAuthenticated`: Boolean logging session validity.
  - `isLoading`: Screen block loader state while restoring credentials.

### B. REST API Endpoints
All authentication calls hit the auth service layer:
- `POST /auth/login` (Returns user credentials, session token, roles, and modular permissions).
- `POST /auth/logout` (Invalidates session token on the server side).
- `GET /auth/profile` (Refreshes user profile and active permissions array during app restore).

### C. Granular Access Control Helper (`hasPermission`)
- **Usage**: `hasPermission(moduleId: string, action: 'read' | 'create' | 'update' | 'delete' | 'approve')`
- **Superuser Override**: If the user's role list contains `administrator`, the helper automatically returns `true`.
- **Permission Matrix**: For other roles, it finds the matching module in `permissions` and returns the boolean value of the requested action.

---

## 4. Visual Navigation & Flow (Mermaid Diagram)

```mermaid
graph TD
    A[Launch Mobile App] --> B{Token present in SecureStore?}
    B -->|Yes| C[Call restoreToken & GET /auth/profile]
    B -->|No| D[Redirect to login/index.tsx]
    C -->|Success| E{isAuthenticated?}
    C -->|Failure/Expired| D
    E -->|Yes| F[Read primary role: roles[0]]
    E -->|No| D
    D -->|User Enters Credentials| G[POST /auth/login]
    G -->|Success| F
    G -->|Failed| D
    F -->|Admin| H[Replace Route to /admin]
    F -->|Asisten| I[Replace Route to /asisten]
    F -->|Krani Timbang| J[Replace Route to /krani]
    F -->|Mandor| K[Replace Route to /mandor]
    F -->|Pemanen| L[Replace Route to /pemanen]
```

---

## 5. Component Hierarchy

```plaintext
RootLayout (Global context initialization)
 └── QueryProvider (TanStack React Query setup)
      └── RootLayoutNav (Dynamic Router Gate controller)
           ├── Stack (Expo Stack Navigation Router)
           │    ├── Stack.Screen (Name: "(auth)")
           │    ├── Stack.Screen (Name: "(pemanen)")
           │    ├── Stack.Screen (Name: "(mandor)")
           │    ├── Stack.Screen (Name: "(krani)")
           │    ├── Stack.Screen (Name: "(asisten)")
           │    └── Stack.Screen (Name: "(admin)")
           └── useSyncProcessor (Hooks running in background to process offline queue logs)
```
