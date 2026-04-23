# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.0-beta.2] - 2026-04-23

### Fixed

#### Redirect Mode — Accept Page (Storefront Integration)

- **Accept page must NOT call `removeCartId()` directly** — Next.js throws a runtime error when `cookies().set()` / `cookies().delete()` is called inside a Server Component render. Updated required storefront pattern: pass `{ skipCookieClear: true }` to `completeOrder()` in the accept page, and use a dedicated `ClearCartOnLoad` client component + `clearCartAction` Server Action on the order confirmed page instead.
- **`completeOrder()` now accepts an optional `options` parameter** — added `skipCookieClear?: boolean` flag so the accept page (a Server Component) can skip cookie operations that are disallowed during SSR render; cart cookie is cleared from the confirmed page via a Server Action instead.
- **Accept page no longer uses the "fast path" as primary** — the old direct `completeOrder()` attempt as the first action caused crashes when Reepay's REST API had not yet marked the charge as "authorized". The new pattern tries `completeOrder()` with retries first, then falls back to polling the `GET /store/frisbii/order-by-cart` backend endpoint.

#### Backend Dependency — `order-by-cart` Endpoint

- **`GET /store/frisbii/order-by-cart` now queries the correct table** — the endpoint previously attempted to query a `cart_id` column directly on the `order` table (which does not exist in Medusa v2). It now queries the Medusa v2 `order_cart` JOIN table (`SELECT order_id FROM order_cart WHERE cart_id = ?`) to look up the order created by the Reepay webhook.

### Added

#### Storefront Integration — Cart Clearing on Confirmed Page

- **`ClearCartOnLoad` client component** — a `"use client"` component placed inside the confirmed page that calls `clearCartAction()` on mount, ensuring the `_medusa_cart_id` cookie is deleted after a successful Frisbii checkout. Required because cookie modification is only allowed in Server Actions, not during Server Component renders.
- **`clearCartAction` Server Action** — a `"use server"` action in `app/[countryCode]/(main)/order/[id]/confirmed/actions.ts` that calls `removeCartId()`. Called by `ClearCartOnLoad` component after order confirmation.

### Changed

- Updated required storefront files list in INSTALLATION.md to include the new confirmed page files.
- Updated ARCHITECTURE.md accept flow diagram to reflect the two-path (fast + slow) completion strategy.

---

## [0.1.0-beta.1] - 2026-01-XX

### Added

#### Components
- **FrisbiiPayment**: Main orchestrator component that routes between display modes
- **FrisbiiEmbedded**: Embedded checkout implementation with inline payment form
- **FrisbiiOverlay**: Modal overlay implementation with backdrop and close functionality
- **FrisbiiRedirect**: Full page redirect implementation for payment checkout
- **FrisbiiPaymentButton**: Pre-built payment button with integrated flow and loading states

#### Hooks
- **useFrisbiiCheckout**: Custom hook for dynamic Reepay SDK loading and initialization
- **useFrisbiiConfig**: Hook for fetching Frisbii configuration from backend API

#### Utilities
- **getFrisbiiConfig**: Async function to fetch Frisbii configuration from store API
- **isFrisbii**: Helper function to check if payment provider is Frisbii
- **Constants**: Provider ID and API endpoint constants

#### Types
- Complete TypeScript type definitions for all components, hooks, and utilities
- `FrisbiiPublicConfig`: Backend configuration structure
- `FrisbiiPaymentProps`: Main payment component props
- `FrisbiiPaymentButtonProps`: Payment button props
- `FrisbiiCheckoutHook`: SDK hook return type
- `FrisbiiConfigHook`: Config hook return type
- Display mode types: `FrisbiiDisplayType`

#### Build Configuration
- `tsup` configuration for dual ESM/CommonJS builds
- TypeScript configuration with React and JSX support
- ESLint setup with React and TypeScript rules
- Prettier configuration for consistent code formatting
- Git ignore patterns for build artifacts and dependencies

#### Documentation
- Comprehensive README.md with quickstart and API reference
- **INSTALLATION.md**: Step-by-step installation guide
- **ARCHITECTURE.md**: System architecture and design patterns
- **API_REFERENCE.md**: Complete API documentation for all exports
- **CONFIGURATION.md**: Configuration options and customization guide
- **TROUBLESHOOTING.md**: Common issues and solutions
- **NPM_LINK_TESTING.md**: Local development and testing workflow
- **CONTRIBUTING.md**: Contribution guidelines and development workflow

#### Examples
- **integration-guide.md**: Step-by-step integration examples
- **custom-styling.md**: Styling and customization examples
- **error-handling.md**: Error handling patterns and best practices

### Features

- **Multiple Display Modes**: Support for embedded, overlay, and redirect payment flows
- **Dynamic SDK Loading**: Automatic loading and initialization of Reepay Checkout SDK
- **Configurable Styling**: Support for custom button styles, modal styles, and SDK styles
- **Error Handling**: Comprehensive error handling with callbacks and logging
- **TypeScript Support**: Full TypeScript support with exported type definitions
- **Event Callbacks**: Callbacks for accept, cancel, and error events
- **Loading States**: Built-in loading indicators for better UX
- **Order Integration**: Seamless integration with Medusa order placement flow

### Developer Experience

- **Hot Reload Support**: Watch mode for development
- **npm Link Testing**: Easy local testing workflow
- **Clear API Surface**: Intuitive component props and hook interfaces
- **Extensive Documentation**: Comprehensive guides and API references
- **Code Quality Tools**: ESLint and Prettier for consistent code
- **Type Safety**: Full TypeScript coverage with strict mode

### Package Configuration

- **Dual Build Output**: ESM and CommonJS for maximum compatibility
- **Peer Dependencies**: React and React-DOM as peer dependencies
- **Tree Shakeable**: ES modules for optimal bundling
- **Type Declarations**: Auto-generated TypeScript declarations
- **Public Access**: NPM package published under `@montaekung` scope

### Compatibility

- **Next.js**: 15.3.9 and compatible versions
- **React**: 19.0.4 and compatible versions
- **Node.js**: v18+ required
- **TypeScript**: 5.4.0+ recommended
- **Medusa**: v2.x storefront compatible

### Known Issues

- No automated tests yet (manual testing required)
- HTTPS required in production for payment security
- npm link may have peer dependency warnings (can be ignored)

---

## [0.1.0-beta.0] - Internal

Initial development version (not published)

---

## Release Notes

### Version 0.1.0-beta.1

This is the first public beta release of the Frisbii Payment Frontend Plugin for Medusa storefronts.

**What's Included:**
- ✅ Core payment components for all display modes
- ✅ React hooks for SDK and config management
- ✅ Complete TypeScript types
- ✅ Comprehensive documentation
- ✅ Example integration guides
- ✅ Build tooling and code quality setup

**What's Coming:**
- 🔜 Automated test suite (Jest + React Testing Library)
- 🔜 Storybook for component documentation
- 🔜 Additional styling customization options
- 🔜 More example implementations
- 🔜 Accessibility improvements
- 🔜 Internationalization support

**Breaking Changes from v0.0.x:**
- Initial beta release - no breaking changes

**Migration Guide:**
- N/A - First public release

---

## How to Update

### From Source

```bash
# Update your dependencies
npm update @montaekung/medusa-plugin-frisbii-pay-frontend
```

### Check Current Version

```bash
npm list @montaekung/medusa-plugin-frisbii-pay-frontend
```

### View Changelog

```bash
npm view @montaekung/medusa-plugin-frisbii-pay-frontend versions
```

---

## Links

- [Documentation](./docs/)
- [GitHub Repository](https://github.com/sahaki/medusa-plugin-frisbii-pay-frontend)
- [NPM Package](https://www.npmjs.com/package/@montaekung/medusa-plugin-frisbii-pay-frontend)
- [Issue Tracker](https://github.com/sahaki/medusa-plugin-frisbii-pay-frontend/issues)
- [Contributing Guide](./docs/CONTRIBUTING.md)

---

## Support

For questions or issues:
- 📖 Check the [documentation](./README.md)
- 🐛 Report bugs on [GitHub Issues](https://github.com/sahaki/medusa-plugin-frisbii-pay-frontend/issues)
- 💬 Start a [discussion](https://github.com/sahaki/medusa-plugin-frisbii-pay-frontend/discussions)

---

[Unreleased]: https://github.com/sahaki/medusa-plugin-frisbii-pay-frontend/compare/v0.1.0-beta.1...HEAD
[0.1.0-beta.1]: https://github.com/sahaki/medusa-plugin-frisbii-pay-frontend/releases/tag/v0.1.0-beta.1
