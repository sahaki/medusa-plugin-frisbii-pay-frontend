# Contributing Guide

## Welcome!

Thank you for considering contributing to the Frisbii Payment Frontend Plugin! This guide will help you get started.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Workflow](#development-workflow)
- [Coding Standards](#coding-standards)
- [Pull Request Process](#pull-request-process)
- [Reporting Issues](#reporting-issues)

---

## Code of Conduct

### Our Pledge

We are committed to providing a welcoming and inspiring community for all.

### Expected Behavior

- Be respectful and inclusive
- Welcome newcomers and help them learn
- Focus on what is best for the community
- Show empathy towards other community members

### Unacceptable Behavior

- Trolling, insulting, or derogatory comments
- Public or private harassment
- Publishing others' private information
- Any conduct that could be considered inappropriate in a professional setting

---

## Getting Started

### Prerequisites

- Node.js v18 or higher
- npm v9 or higher
- Git
- TypeScript knowledge
- React knowledge
- Medusa storefront experience (helpful)

### Fork and Clone

1. Fork the repository on GitHub
2. Clone your fork locally

```bash
git clone https://github.com/YOUR_USERNAME/medusa-plugin-frisbii-pay-frontend.git
cd medusa-plugin-frisbii-pay-frontend
```

3. Add upstream remote

```bash
git remote add upstream https://github.com/sahaki/medusa-plugin-frisbii-pay-frontend.git
```

### Install Dependencies

```bash
npm install
```

### Build the Project

```bash
npm run build
```

### Link for Testing

```bash
npm link

# In your test storefront
cd /path/to/storefront
npm link @montaekung/medusa-plugin-frisbii-pay-frontend
```

---

## Development Workflow

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or modifications

### 2. Make Changes

Edit files in `src/` directory:

```
src/
├── components/    # React components
├── hooks/        # Custom hooks
├── lib/          # Utilities
└── types/        # TypeScript types
```

### 3. Run in Watch Mode

```bash
npm run dev
```

This rebuilds on file changes.

### 4. Type Check

```bash
npm run type-check
```

Fix any TypeScript errors.

### 5. Lint Code

```bash
npm run lint
npm run lint:fix  # Auto-fix issues
```

### 6. Format Code

```bash
npm run format
```

### 7. Test Changes

Test in a linked storefront (see [NPM Link Testing](./NPM_LINK_TESTING.md)).

### 8. Commit Changes

Write clear, descriptive commit messages:

```bash
git add .
git commit -m "feat: add custom error handling to FrisbiiPaymentButton"
```

**Commit Message Format**:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types**:
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation
- `style`: Code style (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding tests
- `chore`: Maintenance tasks

**Examples**:

```
feat(components): add loading state to FrisbiiPaymentButton

Added isLoading state and spinner to improve UX while
payment is processing.

Closes #123
```

```
fix(hooks): prevent duplicate SDK script tags

useFrisbiiCheckout now checks for existing script before
creating a new one.

Fixes #456
```

### 9. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 10. Create Pull Request

Go to GitHub and create a pull request from your fork to the main repository.

---

## Coding Standards

### TypeScript

- Use TypeScript for all new code
- Avoid `any` type - use proper types
- Export types that consumers might need
- Document complex types with JSDoc comments

**Example**:

```typescript
/**
 * Configuration for Frisbii payment checkout
 */
export interface FrisbiiPublicConfig {
  /** Whether Frisbii payment is enabled */
  enabled: boolean
  /** Display mode for checkout */
  display_type: FrisbiiDisplayType
  // ...
}
```

### React Components

- Use functional components with hooks
- Add prop types interface
- Use descriptive prop names
- Add JSDoc comments for exported components

**Example**:

```typescript
/**
 * Frisbii Payment Button
 * Pre-built button component with integrated payment flow
 * 
 * @example
 * ```tsx
 * <FrisbiiPaymentButton
 *   cart={cart}
 *   onOrderPlaced={placeOrder}
 * />
 * ```
 */
export function FrisbiiPaymentButton({
  cart,
  onOrderPlaced,
}: FrisbiiPaymentButtonProps) {
  // ...
}
```

### File Naming

- Components: `PascalCase.tsx` (e.g., `FrisbiiPayment.tsx`)
- Hooks: `camelCase.ts` (e.g., `useFrisbiiCheckout.ts`)
- Utilities: `camelCase.ts` (e.g., `config.ts`)
- Types: `index.ts` in `types/` directory

### Code Style

- Use 2 spaces for indentation
- Use semicolons
- Use double quotes for strings
- Add trailing commas
- Max line length: 80 characters (flexible)

**.prettierrc**:
```json
{
  "semi": false,
  "trailingComma": "es5",
  "singleQuote": false,
  "printWidth": 80,
  "tabWidth": 2
}
```

### Error Handling

Always handle errors gracefully:

```typescript
try {
  await someAsyncOperation()
} catch (error) {
  console.error("[Frisbii] Error:", error)
  // Handle error appropriately
}
```

### Logging

Use prefixed console logs:

```typescript
console.log("[Frisbii] SDK loaded successfully")
console.error("[Frisbii] Failed to load SDK:", error)
console.warn("[Frisbii] Invalid config:", config)
```

---

## Pull Request Process

### Before Submitting

Checklist:

- [ ] Code follows style guidelines
- [ ] TypeScript compiles without errors
- [ ] ESLint passes
- [ ] Code is formatted with Prettier
- [ ] Changes tested in linked storefront
- [ ] Documentation updated (if needed)
- [ ] Commit messages follow convention
- [ ] No console.log statements (except for intentional logging)

### PR Description Template

```markdown
## Description

Brief description of what this PR does.

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue)
- [ ] New feature (non-breaking change which adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Related Issue

Closes #(issue number)

## Changes Made

- Change 1
- Change 2
- Change 3

## Testing

Describe how you tested these changes:

1. Step one
2. Step two
3. Step three

## Screenshots (if applicable)

Add screenshots to help explain your changes.

## Checklist

- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Commented code (particularly hard-to-understand areas)
- [ ] Documentation updated
- [ ] No new warnings generated
- [ ] Changes tested locally
```

### Review Process

1. Maintainer reviews your PR
2. Feedback addressed (if any)
3. Approve and merge or request changes
4. Your changes are merged! 🎉

---

## Reporting Issues

### Bug Reports

Use the bug report template:

```markdown
**Describe the bug**
A clear description of what the bug is.

**To Reproduce**
Steps to reproduce:
1. Go to '...'
2. Click on '....'
3. See error

**Expected behavior**
What you expected to happen.

**Screenshots**
If applicable, add screenshots.

**Environment:**
- Package version: [e.g., 0.1.0-beta.1]
- Next.js version: [e.g., 15.3.9]
- React version: [e.g., 19.0.4]
- Browser: [e.g., Chrome 120]
- OS: [e.g., Windows 11]

**Additional context**
Any other relevant information.
```

### Feature Requests

Use the feature request template:

```markdown
**Is your feature request related to a problem?**
A clear description of the problem.

**Describe the solution you'd like**
What you want to happen.

**Describe alternatives you've considered**
Alternative solutions or features.

**Additional context**
Any other information or screenshots.
```

---

## Documentation

### Updating Documentation

If your changes affect the API or usage:

1. Update relevant docs in `docs/` folder
2. Update README.md if needed
3. Update examples in `examples/` folder
4. Add JSDoc comments to new functions/components

### Documentation Style

- Use clear, concise language
- Provide code examples
- Include expected output when helpful
- Link between related docs

---

## Testing

### Manual Testing

1. Link package to test storefront
2. Test all affected functionality
3. Test different display modes (embedded, overlay, redirect)
4. Test error scenarios
5. Test on different browsers
6. Test on mobile devices

### Automated Tests (Future)

We plan to add automated tests with:
- Jest for unit tests
- React Testing Library for component tests
- Playwright for E2E tests

Contributions to testing are welcome!

---

## Release Process

### Versioning

We follow [Semantic Versioning](https://semver.org/):

- **MAJOR** version for breaking changes (1.0.0 → 2.0.0)
- **MINOR** version for new features (0.1.0 → 0.2.0)
- **PATCH** version for bug fixes (0.1.0 → 0.1.1)

### Beta Releases

Pre-release versions use `-beta.N` suffix:
- `0.1.0-beta.1`
- `0.1.0-beta.2`
- `0.1.0` (stable release)

---

## Questions?

- 📖 Check the [documentation](../README.md)
- 💬 Open a [discussion](https://github.com/sahaki/medusa-plugin-frisbii-pay-frontend/discussions)
- 🐛 Report an [issue](https://github.com/sahaki/medusa-plugin-frisbii-pay-frontend/issues)
- ✉️ Contact maintainers

---

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

## Thank You!

Your contributions make this project better for everyone! 🙏
