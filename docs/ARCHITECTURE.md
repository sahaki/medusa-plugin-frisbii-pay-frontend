# Architecture Guide

## System Overview

The Frisbii Payment Frontend Plugin provides React components and hooks that integrate with the Medusa storefront to enable Reepay payment processing. It follows React best practices with clear component hierarchy and state management.

```
┌─────────────────────────────────────────────────────────┐
│         Medusa Next.js Storefront (Frontend)            │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │  Checkout Components (Your Storefront)            │  │
│  │  - Payment Method Selector                        │  │
│  │  - Payment Button Handler                         │  │
│  │  - Cart & Order Management                        │  │
│  └─────────────────┬─────────────────────────────────┘  │
│                    │                                     │
│                    ▼                                     │
│  ┌───────────────────────────────────────────────────┐  │
│  │  @montaekung/medusa-plugin-frisbii-pay-frontend  │  │
│  │                                                   │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │  Components Layer                           │ │  │
│  │  │  - FrisbiiPayment (Orchestrator)           │ │  │
│  │  │  - FrisbiiEmbedded (Embedded Mode)         │ │  │
│  │  │  - FrisbiiOverlay (Modal Mode)             │ │  │
│  │  │  - FrisbiiRedirect (Redirect Mode)         │ │  │
│  │  │  - FrisbiiPaymentButton (Pre-built)        │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  │                                                   │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │  Hooks Layer                                │ │  │
│  │  │  - useFrisbiiCheckout (SDK Loading)        │ │  │
│  │  │  - useFrisbiiConfig (Config Fetching)      │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  │                                                   │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │  Utilities & Constants                      │ │  │
│  │  │  - getFrisbiiConfig()                       │ │  │
│  │  │  - isFrisbii()                              │ │  │
│  │  │  - Provider ID constants                    │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  │                                                   │  │
│  │  ┌─────────────────────────────────────────────┐ │  │
│  │  │  TypeScript Types                           │ │  │
│  │  │  - Component prop types                     │ │  │
│  │  │  - Config types                             │ │  │
│  │  │  - Reepay SDK types                         │ │  │
│  │  └─────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────┘  │
│                    │                                     │
│                    ▼                                     │
│         ┌──────────────────────┐                        │
│         │  Reepay SDK (CDN)    │                        │
│         │  checkout.reepay.com │                        │
│         └──────────────────────┘                        │
└─────────────────────────────────────────────────────────┘
                     │
                     ▼
         ┌────────────────────────┐
         │   Medusa Backend API   │
         │  (Payment Sessions)    │
         └────────────────────────┘
                     │
                     ▼
         ┌────────────────────────┐
         │    Reepay Server       │
         │  (Payment Processing)  │
         └────────────────────────┘
```

## Core Architecture Principles

### 1. **Separation of Concerns**
- **Components**: UI rendering and user interaction
- **Hooks**: State management and side effects
- **Utilities**: Business logic and helper functions
- **Types**: Type safety and IntelliSense

### 2. **Display Mode Pattern**
- Single entry point (`FrisbiiPayment`)
- Mode-specific implementations (Embedded, Overlay, Redirect)
- Runtime routing based on configuration

### 3. **Dynamic SDK Loading**
- Load Reepay SDK only when needed
- Prevent duplicate script tags
- Handle loading states gracefully

### 4. **Type Safety**
- Full TypeScript coverage
- Exported type definitions
- Runtime type validation

---

## Component Architecture

### Component Hierarchy

```
FrisbiiPaymentButton (Pre-built)
  └─ FrisbiiPayment (Orchestrator)
      ├─ FrisbiiEmbedded (Display Mode)
      ├─ FrisbiiOverlay (Display Mode)
      └─ FrisbiiRedirect (Display Mode)
```

### 1. FrisbiiPayment (Orchestrator)

**Purpose**: Routes to appropriate display mode based on configuration

**File**: `src/components/FrisbiiPayment.tsx`

**Flow**:
```typescript
interface FrisbiiPaymentProps {
  sessionId: string
  config: FrisbiiPublicConfig
  onComplete?: () => void
  onCancel?: () => void
}

function FrisbiiPayment({ sessionId, config, onComplete, onCancel }) {
  switch (config.display_type) {
    case "embedded": return <FrisbiiEmbedded />
    case "overlay": return <FrisbiiOverlay />
    case "redirect": return <FrisbiiRedirect />
    default: return <FrisbiiOverlay /> // Fallback
  }
}
```

**Key Features**:
- ✅ Single API surface
- ✅ Mode abstraction
- ✅ Fallback handling

---

### 2. Display Mode Components

#### FrisbiiEmbedded

**Purpose**: Embed Reepay checkout form in page

**Implementation**:
```typescript
function FrisbiiEmbedded({ sessionId, onComplete, onCancel }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const { loaded } = useFrisbiiCheckout(sessionId)

  useEffect(() => {
    const rp = new window.Reepay.EmbeddedCheckout(sessionId, {
      html_element: containerRef.current,
    })
    rp.addEventHandler(window.Reepay.Event.Accept, onComplete)
    rp.addEventHandler(window.Reepay.Event.Cancel, onCancel)
    return () => rp.destroy?.()
  }, [loaded, sessionId])

  return <div ref={containerRef} className="w-full min-h-[400px]" />
}
```

**Lifecycle**:
1. SDK loads via `useFrisbiiCheckout`
2. Create `EmbeddedCheckout` instance
3. Attach event handlers
4. Render form in container
5. Cleanup on unmount

---

#### FrisbiiOverlay

**Purpose**: Open Reepay checkout in modal

**Implementation**:
```typescript
function FrisbiiOverlay({ sessionId, onComplete, onCancel }) {
  const { loaded } = useFrisbiiCheckout(sessionId)

  useEffect(() => {
    const rp = new window.Reepay.ModalCheckout(sessionId)
    rp.addEventHandler(window.Reepay.Event.Accept, onComplete)
    rp.addEventHandler(window.Reepay.Event.Cancel, onCancel)
    return () => rp.destroy?.()
  }, [loaded, sessionId])

  return <div>Opening payment window...</div>
}
```

**Lifecycle**:
1. SDK loads
2. Create `ModalCheckout` instance (auto-opens modal)
3. Attach event handlers
4. User interacts in modal
5. Cleanup on unmount

---

#### FrisbiiRedirect

**Purpose**: Redirect to Reepay hosted page

**Implementation**:
```typescript
function FrisbiiRedirect({ sessionId }) {
  useEffect(() => {
    window.location.href = `https://checkout.reepay.com/#/${sessionId}`
  }, [sessionId])

  return <div>Redirecting to payment...</div>
}
```

**Lifecycle**:
1. Component mounts
2. Browser redirects to Reepay
3. User completes payment
4. Reepay redirects back via accept_url

---

### 3. FrisbiiPaymentButton (Pre-built Component)

**Purpose**: Complete payment button with integrated flow

**File**: `src/components/FrisbiiPaymentButton.tsx`

**State Management**:
```typescript
const [showCheckout, setShowCheckout] = useState(false)
const [submitting, setSubmitting] = useState(false)
const [error, setError] = useState<string | null>(null)
```

**Flow**:
```
User clicks "Place order"
  ↓
setShowCheckout(true)
  ↓
Render FrisbiiPayment component
  ↓
User completes payment
  ↓
onComplete() → placeOrder()
  ↓
Order created
  ↓
Redirect to confirmation
```

---

## Hook Architecture

### 1. useFrisbiiCheckout

**Purpose**: Dynamic SDK loading with loading state

**File**: `src/hooks/useFrisbiiCheckout.ts`

**Implementation Strategy**:
```typescript
function useFrisbiiCheckout(sessionId: string | null) {
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!sessionId) return

    // Check if script already loaded
    const existing = document.getElementById("reepay-checkout-sdk")
    if (existing) {
      setLoaded(true)
      return
    }

    // Create and append script
    const script = document.createElement("script")
    script.id = "reepay-checkout-sdk"
    script.src = "https://checkout.reepay.com/checkout.js"
    script.async = true
    script.onload = () => setLoaded(true)
    document.head.appendChild(script)
  }, [sessionId])

  return { loaded }
}
```

**Key Features**:
- ✅ Prevents duplicate script tags
- ✅ Tracks loading state
- ✅ Triggers only when sessionId provided

---

### 2. useFrisbiiConfig

**Purpose**: Fetch configuration from backend

**File**: `src/hooks/useFrisbiiConfig.ts`

**Implementation**:
```typescript
function useFrisbiiConfig(backendUrl: string) {
  const [config, setConfig] = useState<FrisbiiPublicConfig | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getFrisbiiConfig(backendUrl)
      .then(setConfig)
      .finally(() => setLoading(false))
  }, [backendUrl])

  return { config, loading }
}
```

---

## Utility Architecture

### 1. Provider ID Detection

```typescript
// Check if provider is Frisbii
export function isFrisbii(providerId?: string): boolean {
  return providerId?.startsWith("pp_frisbii") ?? false
}
```

### 2. Config Fetching

```typescript
// Fetch public config from backend
export async function getFrisbiiConfig(
  backendUrl: string
): Promise<FrisbiiPublicConfig | null> {
  const res = await fetch(`${backendUrl}/store/frisbii/config`)
  const data = await res.json()
  return data.config || null
}
```

---

## Data Flow

### Payment Session Creation Flow

```
1. User selects "Frisbii Pay"
   ↓
2. Frontend calls initiatePaymentSession()
   ↓
3. Backend creates Reepay session
   ↓
4. Backend returns session_id + display_type
   ↓
5. Frontend stores in payment session
   ↓
6. User continues to review
```

### Payment Execution Flow

```
1. User clicks "Place order"
   ↓
2. FrisbiiPaymentButton extracts session_id
   ↓
3. Render FrisbiiPayment component
   ↓
4. useFrisbiiCheckout loads SDK
   ↓
5. Display mode component initializes
   ↓
6. User enters payment details
   ↓
7. Reepay processes payment
   ↓
8. SDK fires "Accept" event
   ↓
9. onComplete() calls placeOrder()
   ↓
10. Backend creates order
   ↓
11. Redirect to confirmation
```

---

## State Management

### Component-Level State

Components use React hooks for local state:

```typescript
// Loading state
const [loaded, setLoaded] = useState(false)

// UI state
const [showCheckout, setShowCheckout] = useState(false)
const [submitting, setSubmitting] = useState(false)

// Error state
const [error, setError] = useState<string | null>(null)
```

### No Global State Required

The package is **stateless** and doesn't require:
- ❌ Redux
- ❌ Context API
- ❌ External state management

All state is ephemeral and component-scoped.

---

## Build Configuration

### Dual Module Format

The package is built in both ESM and CommonJS:

```typescript
// tsup.config.ts
export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],  // Dual build
  dts: true,               // Generate .d.ts
  sourcemap: true,
  clean: true,
  external: ["react", "react-dom"],
})
```

### Module Exports

```json
{
  "main": "dist/index.js",        // CommonJS
  "module": "dist/index.mjs",     // ESM
  "types": "dist/index.d.ts",     // TypeScript
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  }
}
```

---

## Performance Considerations

### 1. Lazy Loading
- SDK loaded only when Frisbii selected
- Components rendered conditionally

### 2. Tree Shaking
- ES modules support tree shaking
- Import only what you need

### 3. Bundle Size
- No heavy dependencies
- React/React-DOM as peer dependencies
- ~15KB gzipped

---

## Security Architecture

### 1. No Sensitive Data in Frontend
- No API keys in package
- No card data touches frontend
- Session IDs are ephemeral

### 2. HTTPS Required
- Reepay SDK requires HTTPS in production
- Works with localhost in development

### 3. Provider ID Validation
- Helper functions prevent typos
- Type-safe interfaces

---

## Extension Points

### Custom Button Component

```typescript
<FrisbiiPaymentButton
  ButtonComponent={MyCustomButton}
  // ...
/>
```

### Custom Error Handling

```typescript
<FrisbiiPaymentButton
  onOrderPlaced={async (cartId) => {
    try {
      await placeOrder(cartId)
    } catch (error) {
      // Custom error handling
    }
  }}
/>
```

---

## Related Documentation

- [API Reference](./API_REFERENCE.md) - Component props and types
- [Integration Guide](./INTEGRATION_GUIDE.md) - Step-by-step integration
- [Testing](./TESTING.md) - Testing strategies
- [Troubleshooting](./TROUBLESHOOTING.md) - Common issues

---

## Architecture Decisions

### Why Component-Based?
- ✅ Reusability
- ✅ Testability
- ✅ Clear API surface
- ✅ Easy to customize

### Why Hooks?
- ✅ Modern React patterns
- ✅ Easy to test
- ✅ Composable logic
- ✅ No class components

### Why TypeScript?
- ✅ Type safety
- ✅ Better DX (IntelliSense)
- ✅ Catch errors at compile time
- ✅ Self-documenting code

### Why Separate Display Modes?
- ✅ Different UX requirements
- ✅ Easy to maintain
- ✅ Runtime flexibility
- ✅ Clear separation of concerns
