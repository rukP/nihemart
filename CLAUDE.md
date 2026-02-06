# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

NiheMart is a full-stack e-commerce platform frontend built with Next.js 15 and React 19. The application supports multiple user roles (admin, user, manager, rider, staff, stock_manager) with real-time features via Socket.IO and integrates with a separate Express.js backend.

## Common Commands

```bash
# Development
npm run dev              # Start development server on localhost:3000

# Building
npm run build            # Production build (Next.js standalone output)
npm run start            # Start production server

# Code Quality
npm run lint             # Run ESLint
npm run lint:fix         # Auto-fix ESLint issues
npm run format           # Format code with Prettier
npm run format:check     # Check Prettier formatting

# Admin Utilities
npm run seed:admin       # Seed admin user via API
npm run toggle:orders    # Toggle order scheduling
```

## Architecture Overview

### Framework & Routing
- **Framework**: Next.js 15 with App Router (React 19, TypeScript)
- **Build Output**: Standalone mode for cPanel/Node hosting
- **Route Groups**:
  - `(auth)/` - Authentication pages (signin, signup, forgot-password, reset-password, auth/callback)
  - `(root)/` - Public customer pages (products, cart, checkout, orders, profile, etc.)
  - `admin/` - Admin dashboard (protected)
  - `rider/` - Rider dashboard (protected)
  - `api/` - API routes (GraphQL, webhooks, email)

### State Management Architecture

**Zustand (Persistent Auth State)**:
- `src/store/auth.store.ts` - Global auth state with localStorage persistence
- Stores: `user`, `accessToken`, `refreshToken`, `loading`
- Token stored in both Zustand and cookies for middleware access
- Auto-initializes on app load, validates tokens, refreshes if expired

**React Context (Session State)**:
- `src/contexts/CartContext.tsx` - Shopping cart with localStorage sync
- `src/contexts/WishlistContext.tsx` - Wishlist management
- `src/contexts/NotificationsContext.tsx` - Real-time notification state
- `src/contexts/LanguageContext.tsx` - i18n language selection
- `src/contexts/BuyNowContext.tsx` - Quick checkout flow

### API Client Architecture

**Base Configuration** (`src/lib/api.ts`):
- `unauthorizedAPI` - Public endpoints (no token required)
- `authorizedAPI` - Protected endpoints (auto-attaches Bearer token)
- Both instances pull token from Zustand store via interceptor

**Token Refresh Flow**:
1. Request interceptor checks token expiration every 5 minutes
2. Proactively refreshes if expiring within 1 hour
3. Response interceptor catches 401 errors
4. Implements queue pattern to prevent concurrent refresh attempts
5. Retries failed requests with new token
6. Clears auth state if refresh fails

**API Modules** (`src/lib/api/*.ts`):
- Each resource has dedicated API client (products.ts, orders.ts, etc.)
- Functions use either `authorizedAPI` or `unauthorizedAPI` based on endpoint requirements
- Wrapped with `handleApiRequest()` for consistent error handling

### Authentication & Authorization

**JWT Flow**:
1. Login returns `accessToken` + `refreshToken`
2. Tokens stored in Zustand (persisted to localStorage) + cookies
3. `src/middleware.ts` checks auth cookie for route protection
4. `src/utils/auth/middleware.ts` handles redirects (signin/signup for protected routes)

**Role-Based Access Control** (`src/lib/rbac.ts`):
- Roles: `admin`, `manager`, `stock_manager`, `staff`, `rider`, `user`
- `roleAccessMap` defines section access (dashboard, transactions, users, products, etc.)
- `canAccessSection()` checks if user roles can access admin sections
- Client-side route guards in `ProtectedRoute` component

**Protected Routes**:
- Middleware enforces auth on: `/profile`, `/admin/*`, `/rider/*`, `/orders`, `/addresses`, `/wishlist`, `/notifications`
- Public routes: `/`, `/signin`, `/signup`, `/products`, `/about`, `/contact`, `/cart`, `/checkout`
- Guest checkout supported (cart/checkout accessible without auth)

### Real-time Features (Socket.IO)

**Connection Management** (`src/lib/socket.ts`):
- Auto-connects after login with JWT auth token
- Derives base URL from `NEXT_PUBLIC_API_URL` (removes `/api` suffix)
- Implements reconnection logic with max 3 attempts
- Disconnects on logout, reconnects on token refresh
- Prevents initialization if permanently failed

**Usage Pattern**:
```typescript
import { getSocket } from '@/lib/socket';

const socket = getSocket();
socket?.on('notification:new', handleNotification);
```

### UI Components

**Component Structure**:
- `src/components/ui/` - Radix UI primitives + shadcn/ui styled components
- `src/components/admin/` - Admin dashboard components
- `src/components/orders/` - Order management (data tables, dialogs)
- `src/components/checkout/` - Checkout flow components
- `src/components/payments/` - Payment method selection, KPay integration
- `src/components/riders/` - Rider management

**Data Tables**:
- Built on TanStack Table (`@tanstack/react-table`)
- Reusable table components in `src/components/data-table/`
- Patterns: column definitions, filtering, pagination, sorting
- Hook: `src/hooks/use-data-table.ts`

### Error Handling & Resilience

**Chunk Load Error Handler** (`src/lib/chunk-error-handler.ts`):
- Intercepts Next.js chunk loading failures (400, 404, network errors)
- Implements 3-stage reload: normal → hard → force (with cache clear)
- Shows persistent error UI after max retries with manual reload button
- Prevents reload loops with throttling (2s between attempts)
- Auto-clears flags after successful page load

**Error Boundaries**:
- `src/components/ErrorBoundary.tsx` - Catches React errors
- `src/components/ChunkLoadErrorHandler.tsx` - Initializes chunk error handler

### Forms & Validation

- **Library**: React Hook Form + Zod validation
- **Pattern**: Form schemas in `src/lib/validators/` (e.g., `admin-auth.ts`)
- **Components**: `src/components/ui/form.tsx` wrapper components

### Styling

- **Framework**: Tailwind CSS with `tailwindcss-animate`
- **Utilities**: `cn()` helper in `src/lib/utils.ts` (clsx + tailwind-merge)
- **Theming**: next-themes for dark mode support
- **Icons**: Lucide React

### Data Fetching

- **Library**: TanStack React Query (v5)
- **Provider**: `src/providers/react.query.provider.tsx`
- **Patterns**: Custom hooks in `src/hooks/` (useProducts, useOrders, useUsers, etc.)

### Environment Configuration

Required environment variables (`.env.local`):
```bash
NEXT_PUBLIC_API_URL=https://api.nihemart.rw/api  # Backend API base URL
```

The API base URL defaults to `https://api.nihemart.rw/api` if not set.

### Image Optimization

- **Config**: `next.config.ts` has `unoptimized: true` for cPanel compatibility
- **Remote Patterns**: Configured for `api.nihemart.rw/uploads/*` and localhost:4000

### Deployment

**Production Build**:
1. `npm run build` creates standalone output in `.next/standalone/`
2. Includes `.next/static/` and `public/` assets
3. GitHub Actions workflow deploys via FTP to cPanel
4. Custom `server.js` wraps Next.js standalone server

**cPanel Setup**:
- Application startup file: `server.js`
- Node.js version: 18 or 20
- Run `npm install` in cPanel after FTP deploy (for native modules like `sharp`)

### Key Patterns & Conventions

**Path Aliases**: `@/*` maps to `src/*` (configured in `tsconfig.json`)

**API Request Pattern**:
```typescript
import { authorizedAPI } from '@/lib/api';
import handleApiRequest from '@/lib/handleApiRequest';

const data = await handleApiRequest(() =>
  authorizedAPI.get('/endpoint')
);
```

**Auth Check Pattern**:
```typescript
import { useAuthStore } from '@/store/auth.store';

const { user, hasRole } = useAuthStore();
if (hasRole('admin')) {
  // Admin-only logic
}
```

**Socket.IO Pattern**:
```typescript
// Initialize on login (automatic via auth store)
// Listen for events
useEffect(() => {
  const socket = getSocket();
  socket?.on('event', handler);
  return () => socket?.off('event', handler);
}, []);
```

**Cart Management**:
- CartContext provides `addItem()`, `updateQuantity()`, `removeItem()`, `clearCart()`
- Items stored with unique ID: `product_id-variation_id`
- Persisted to localStorage with debounced writes
- Dispatches `cart:updated` custom event for cross-component reactivity

**Notifications**:
- NotificationsContext listens to Socket.IO `notification:new` events
- Bell icon in TopBar/RiderTopBar shows unread count
- Marks notifications as read via API

**Multi-role Layout Routing**:
- Middleware redirects based on auth state
- Role-specific layouts: `admin/layout.tsx`, `rider/layout.tsx`
- Default customer routes in `(root)/layout.tsx`

### Common Gotchas

1. **Token Refresh**: The API client automatically refreshes tokens - don't manually handle 401s in components
2. **Socket Connection**: Socket auto-initializes on login - don't manually call `initializeSocket()` in components
3. **Cart Persistence**: Cart uses debounced writes - don't manually write to localStorage
4. **Chunk Errors**: The chunk error handler runs globally - don't implement custom retry logic for chunk failures
5. **Middleware Limitations**: Middleware can't decode JWT (no access to secret) - role checks happen client-side in components
6. **Guest Checkout**: Cart and checkout are public routes - check auth state in components, not middleware
7. **Image Optimization**: Images are unoptimized (`next.config.ts`) for cPanel - use appropriately sized images

### Backend Integration

**API Base URL**: `https://api.nihemart.rw/api` (production) or `http://localhost:4000/api` (development)

**Main Endpoints**:
- `/auth/*` - Authentication (login, register, refresh, OAuth callback)
- `/users/*` - User management
- `/products/*` - Product catalog with categories, variations
- `/orders/*` - Order management and assignment
- `/payments/*` - Payment processing (KPay integration)
- `/riders/*` - Rider/delivery management
- `/notifications/*` - Real-time notifications
- `/graphql` - GraphQL endpoint (if used)

**Payment Integration**:
- KPay mobile money gateway
- Flow: initiate → poll status → finalize
- Webhook handler: `/api/webhooks/kpay`
- 
