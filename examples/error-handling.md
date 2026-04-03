# Error Handling Guide

Learn how to handle errors gracefully in Frisbii Payment integration.

## Common Error Scenarios

1. **SDK Loading Failures**
2. **Payment Session Creation Errors**
3. **Payment Processing Errors**
4. **Order Creation Failures**
5. **Network Errors**

---

## Error Handling Patterns

### 1. SDK Loading Error

```tsx
import { useFrisbiiCheckout } from "@montaekung/medusa-plugin-frisbii-pay-frontend"
import { useState, useEffect } from "react"

const PaymentWithSDKCheck = ({ sessionId }) => {
  const { loaded } = useFrisbiiCheckout(sessionId)
  const [loadError, setLoadError] = useState(false)
  
  useEffect(() => {
    if (!sessionId) return
    
    // Check if SDK loaded after timeout
    const timeout = setTimeout(() => {
      if (!loaded) {
        setLoadError(true)
      }
    }, 10000) // 10 second timeout
    
    return () => clearTimeout(timeout)
  }, [sessionId, loaded])
  
  if (loadError) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <h3 className="text-red-800 font-semibold mb-2">
          Payment SDK Failed to Load
        </h3>
        <p className="text-red-600 text-sm mb-4">
          The payment system could not be loaded. This might be due to:
        </p>
        <ul className="text-sm text-red-600 list-disc list-inside mb-4">
          <li>Ad blockers blocking the payment SDK</li>
          <li>Slow network connection</li>
          <li>Browser security settings</li>
        </ul>
        <button
          onClick={() => window.location.reload()}
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Reload Page
        </button>
      </div>
    )
  }
  
  if (!loaded) {
    return (
      <div className="flex items-center gap-2 text-gray-600">
        <div className="animate-spin h-4 w-4 border-2 border-blue-600 rounded-full border-t-transparent" />
        <span>Loading payment system...</span>
      </div>
    )
  }
  
  return <FrisbiiPayment sessionId={sessionId} config={config} />
}
```

---

### 2. Payment Session Creation Error

```tsx
import { useState } from "react"
import { initiatePaymentSession } from "@lib/data/cart"

const PaymentMethodSelector = ({ cart, selectedMethod }) => {
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  
  const handleInitiateSession = async () => {
    setIsLoading(true)
    setError(null)
    
    try {
      const sessionData = {
        provider_id: selectedMethod,
        data: {
          extra: {
            // ... session data
          },
        },
      }
      
      await initiatePaymentSession(cart, sessionData)
      
      // Navigate to next step
      router.push("/checkout?step=review")
    } catch (err: any) {
      console.error("Failed to create payment session:", err)
      
      // Parse error message
      const errorMessage = err.response?.data?.message || err.message
      
      if (errorMessage.includes("invalid_credentials")) {
        setError("Payment provider configuration error. Please contact support.")
      } else if (errorMessage.includes("network")) {
        setError("Network error. Please check your connection and try again.")
      } else if (errorMessage.includes("provider_error")) {
        setError("Payment provider is temporarily unavailable. Please try again later.")
      } else {
        setError("Failed to initialize payment. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }
  
  return (
    <div>
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
          <button
            onClick={() => setError(null)}
            className="mt-2 text-sm text-red-700 underline hover:no-underline"
          >
            Dismiss
          </button>
        </div>
      )}
      
      <button
        onClick={handleInitiateSession}
        disabled={isLoading}
        className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg disabled:opacity-50"
      >
        {isLoading ? "Initializing..." : "Continue to Payment"}
      </button>
    </div>
  )
}
```

---

### 3. Payment Processing Error

```tsx
import { FrisbiiPayment } from "@montaekung/medusa-plugin-frisbii-pay-frontend"
import { useState } from "react"

const PaymentWithErrorHandling = ({ sessionId, config }) => {
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  
  const handlePaymentComplete = async () => {
    try {
      await placeOrder(cart.id)
    } catch (err: any) {
      console.error("Order placement failed:", err)
      
      // Check if it's a redirect error (expected)
      if (err.message?.includes("NEXT_REDIRECT")) {
        // This is expected, ignore it
        return
      }
      
      // Handle different error types
      if (err.response?.status === 409) {
        setPaymentError("This order has already been placed.")
      } else if (err.response?.status === 400) {
        setPaymentError("Order validation failed. Please review your cart.")
      } else if (err.response?.status === 500) {
        setPaymentError("Server error. Your payment was processed but order creation failed. Please contact support with your payment confirmation.")
      } else {
        setPaymentError("Failed to create order. Please contact support if you were charged.")
      }
    }
  }
  
  const handlePaymentCancel = () => {
    setPaymentError("Payment was cancelled. You can try again.")
  }
  
  const handleRetry = () => {
    setPaymentError(null)
    setRetryCount(retryCount + 1)
  }
  
  if (paymentError) {
    return (
      <div className="space-y-4">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="text-yellow-800 font-semibold mb-2">
            ⚠️ Payment Issue
          </h3>
          <p className="text-yellow-700 text-sm mb-4">{paymentError}</p>
          
          {retryCount < 3 ? (
            <button
              onClick={handleRetry}
              className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
            >
              Try Again
            </button>
          ) : (
            <div className="text-sm text-yellow-700">
              <p className="mb-2">Multiple attempts failed.</p>
              <a
                href="/support"
                className="text-yellow-800 underline hover:no-underline"
              >
                Contact Support
              </a>
            </div>
          )}
        </div>
      </div>
    )
  }
  
  return (
    <FrisbiiPayment
      key={retryCount} // Force re-render on retry
      sessionId={sessionId}
      config={config}
      onComplete={handlePaymentComplete}
      onCancel={handlePaymentCancel}
    />
  )
}
```

---

### 4. Network Error Handling

```tsx
const RobustFrisbiiPaymentButton = ({ cart, onOrderPlaced }) => {
  const [networkError, setNetworkError] = useState(false)
  
  const handleOrderPlacement = async (cartId: string) => {
    const maxRetries = 3
    let retries = 0
    
    while (retries < maxRetries) {
      try {
        await onOrderPlaced(cartId)
        return // Success
      } catch (err: any) {
        retries++
        
        // Check if it's a network error
        if (err.message?.includes("fetch") || err.code === "ECONNREFUSED") {
          if (retries < maxRetries) {
            // Wait before retrying (exponential backoff)
            await new Promise((resolve) =>
              setTimeout(resolve, Math.pow(2, retries) * 1000)
            )
            continue
          } else {
            setNetworkError(true)
            throw new Error("Network error after multiple retries")
          }
        } else {
          // Not a network error, don't retry
          throw err
        }
      }
    }
  }
  
  if (networkError) {
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <h3 className="text-orange-800 font-semibold mb-2">
          Connection Issue
        </h3>
        <p className="text-orange-700 text-sm mb-4">
          We're having trouble connecting to the server. Please check your
          internet connection.
        </p>
        <button
          onClick={() => {
            setNetworkError(false)
            window.location.reload()
          }}
          className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
        >
          Try Again
        </button>
      </div>
    )
  }
  
  return (
    <FrisbiiPaymentButton
      cart={cart}
      onOrderPlaced={handleOrderPlacement}
    />
  )
}
```

---

### 5. Comprehensive Error Boundary

```tsx
import React, { Component, ErrorInfo, ReactNode } from "react"

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

class FrisbiiErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Frisbii Payment Error:", error, errorInfo)
    
    // Log to error tracking service (e.g., Sentry)
    // Sentry.captureException(error, { extra: errorInfo })
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-red-800 font-bold text-lg mb-2">
            Payment System Error
          </h2>
          <p className="text-red-600 mb-4">
            Something went wrong with the payment system.
          </p>
          
          {process.env.NODE_ENV === "development" && this.state.error && (
            <details className="mb-4">
              <summary className="text-sm text-red-700 cursor-pointer">
                Error Details
              </summary>
              <pre className="mt-2 p-2 bg-red-100 rounded text-xs overflow-auto">
                {this.state.error.toString()}
              </pre>
            </details>
          )}
          
          <div className="space-x-2">
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Reload Page
            </button>
            <button
              onClick={() => (window.location.href = "/checkout?step=payment")}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
            >
              Back to Payment Selection
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Usage
<FrisbiiErrorBoundary>
  <FrisbiiPaymentButton cart={cart} onOrderPlaced={placeOrder} />
</FrisbiiErrorBoundary>
```

---

## Error Logging

### Log Errors to Backend

```tsx
const logPaymentError = async (error: any, context: Record<string, any>) => {
  try {
    await fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        error: {
          message: error.message,
          stack: error.stack,
        },
        context: {
          ...context,
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
        },
      }),
    })
  } catch (logError) {
    console.error("Failed to log error:", logError)
  }
}

// Usage
try {
  await placeOrder(cart.id)
} catch (error) {
  await logPaymentError(error, {
    cart_id: cart.id,
    provider: "frisbii",
    step: "order_placement",
  })
  throw error
}
```

---

## User-Friendly Error Messages

### Error Message Map

```tsx
const ERROR_MESSAGES: Record<string, string> = {
  // Backend errors
  PAYMENT_SESSION_CREATION_FAILED:
    "Unable to initialize payment. Please try again.",
  PAYMENT_PROVIDER_ERROR:
    "Payment provider is temporarily unavailable. Please try again later.",
  INVALID_CART: "Your cart is invalid. Please refresh and try again.",
  ORDER_ALREADY_PLACED: "This order has already been placed.",
  
  // Frontend errors
  SDK_LOAD_FAILED:
    "Payment system failed to load. Please disable ad blockers and try again.",
  NETWORK_ERROR: "Connection error. Please check your internet and try again.",
  PAYMENT_CANCELLED: "Payment was cancelled. You can try again when ready.",
  
  // Generic fallback
  UNKNOWN_ERROR:
    "An unexpected error occurred. Please contact support if the issue persists.",
}

const getErrorMessage = (error: any): string => {
  const errorCode = error.code || error.response?.data?.code
  return ERROR_MESSAGES[errorCode] || ERROR_MESSAGES.UNKNOWN_ERROR
}
```

---

## Testing Error Scenarios

### Mock Errors for Development

```tsx
// Create a test mode wrapper
const FrisbiiPaymentTestWrapper = ({ cart, testError, ...props }) => {
  if (process.env.NODE_ENV === "development" && testError) {
    throw new Error(`Test Error: ${testError}`)
  }
  
  return <FrisbiiPaymentButton cart={cart} {...props} />
}

// Usage
<FrisbiiPaymentTestWrapper
  cart={cart}
  testError="SDK_LOAD_FAILED" // Test different errors
  onOrderPlaced={placeOrder}
/>
```

---

## Best Practices

1. **Always catch errors** - Never let errors crash the app
2. **Provide context** - Log enough information to debug issues
3. **Be specific** - Give users actionable error messages
4. **Retry intelligently** - Use exponential backoff for network errors
5. **Fallback gracefully** - Provide alternative payment methods if Frisbii fails
6. **Monitor errors** - Use error tracking services (Sentry, LogRocket, etc.)

---

## Support

If you encounter persistent errors:

1. Check the [Integration Guide](./integration-guide.md)
2. Review [Custom Styling](./custom-styling.md)
3. Open an [Issue](https://github.com/sahaki/medusa-plugin-frisbii-pay-frontend/issues) with:
   - Error message
   - Browser console logs
   - Steps to reproduce
   - Environment (browser, OS, versions)
