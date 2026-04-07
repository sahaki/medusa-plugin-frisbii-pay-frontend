# NPM Link Testing Guide

## Overview

This guide explains how to test the Frisbii Payment Frontend plugin locally using `npm link` before publishing to NPM registry.

## Why Use npm link?

- ✅ Test changes without publishing
- ✅ Faster development cycle
- ✅ Debug issues locally
- ✅ Verify integration before release

---

## Prerequisites

-Local plugin directory: `D:\my_cource\medusa\001\medusa-plugin-frisbii-pay-frontend`
- Target storefront: `D:\my_cource\medusa\002\medusa-store-storefront`
- Node.js v18+
- npm v9+

---

## Setup Process

### Step 1: Build the Plugin

Navigate to plugin directory and build:

```bash
cd D:\my_cource\medusa\001\medusa-plugin-frisbii-pay-frontend

# Install dependencies
npm install

# Build the plugin
npm run build
```

**Verify build output**:
```bash
ls dist/
```

Should see:
```
index.js
index.mjs
index.d.ts
```

---

### Step 2: Create Global Link

In the plugin directory:

```bash
npm link
```

**Expected output**:
```
added 1 package, and audited 2 packages in 1s

found 0 vulnerabilities
```

**Verify link created**:
```bash
npm list -g --depth=0 | grep frisbii
```

Should show:
```
@montaekung/medusa-plugin-frisbii-pay-frontend@0.1.0-beta.1 -> D:\...\medusa-plugin-frisbii-pay-frontend
```

---

### Step 3: Link in Storefront

Navigate to your storefront and link:

```bash
cd D:\my_cource\medusa\002\medusa-store-storefront

npm link @montaekung/medusa-plugin-frisbii-pay-frontend
```

**Expected output**:
```
D:\...\node_modules\@montaekung\medusa-plugin-frisbii-pay-frontend -> 
  C:\Users\...\AppData\Roaming\npm\node_modules\@montaekung\medusa-plugin-frisbii-pay-frontend -> 
  D:\...\medusa-plugin-frisbii-pay-frontend
```

--- ### Step 4: Verify Link

Check if link works:

```bash
# Check symlink
ls -l node_modules/@montaekung/medusa-plugin-frisbii-pay-frontend

# Or on Windows PowerShell
Get-Item node_modules/@montaekung/medusa-plugin-frisbii-pay-frontend | Select-Object Target
```

Should show symlink to plugin directory.

---

## Testing Workflow

### 1. Make Changes in Plugin

```bash
cd D:\my_cource\medusa\001\medusa-plugin-frisbii-pay-frontend

# Edit source files
# src/components/FrisbiiPayment.tsx

# Rebuild
npm run build
```

---

### 2. Test in Storefront

```bash
cd D:\my_cource\medusa\002\medusa-store-storefront

# Restart dev server
npm run dev
```

Changes should be reflected immediately (may need browser refresh).

---

### 3. Watch Mode (Recommended)

For faster development, run build in watch mode:

```bash
# Terminal 1: Plugin directory (watch mode)
cd D:\my_cource\medusa\001\medusa-plugin-frisbii-pay-frontend
npm run dev

# Terminal 2: Storefront (dev server)
cd D:\my_cource\medusa\002\medusa-store-storefront
npm run dev
```

Now changes rebuild automatically!

---

## Troubleshooting npm link

### Issue: Changes Not Reflected

**Symptoms**:
- Modified code doesn't appear in storefront
- Old version still running

**Solutions**:

#### 1. Clear Next.js Cache

```bash
# In storefront
rm -rf .next
npm run dev
```

---

#### 2. Rebuild Plugin

```bash
# In plugin
npm run build
```

---

#### 3. Check Symlink

```bash
# In storefront
ls -l node_modules/@montaekung/medusa-plugin-frisbii-pay-frontend
```

Should point to your local plugin directory.

---

### Issue: "Cannot find module" Error

**Error**:
```
Module not found: Can't resolve '@montaekung/medusa-plugin-frisbii-pay-frontend'
```

**Solutions**:

#### 1. Re-link

```bash
# Unlink first
cd D:\my_cource\medusa\002\medusa-store-storefront
npm unlink @montaekung/medusa-plugin-frisbii-pay-frontend

# Link again
npm link @montaekung/medusa-plugin-frisbii-pay-frontend
```

---

#### 2. Check Global Link Exists

```bash
npm list -g --depth=0 | grep frisbii
```

If missing, recreate global link:

```bash
cd D:\my_cource\medusa\001\medusa-plugin-frisbii-pay-frontend
npm link
```

---

### Issue: TypeScript Errors

**Error**:
```
Cannot find type definitions for '@montaekung/medusa-plugin-frisbii-pay-frontend'
```

**Solution**: Rebuild plugin to generate `.d.ts` files:

```bash
cd D:\my_cource\medusa\001\medusa-plugin-frisbii-pay-frontend
npm run build
```

---

### Issue: Peer Dependency Warnings

**Warning**:
```
npm WARN @montaekung/medusa-plugin-frisbii-pay-frontend@0.1.0 requires a peer of react@^18.0.0
```

**Solution**: This is normal with `npm link`. The storefront should have React installed. Ignore the warning if everything works.

---

## Known Build Issues

This section documents build issues you may encounter and their solutions.

### Issue: DTS Build Error - `--incremental` Option

**Error**:
```
error TS5074: Option '--incremental' can only be specified using tsconfig, 
emitting to single file or when option '--tsBuildInfoFile' is specified.
Error: error occurred in dts build
```

**Cause**: `tsconfig.json` has `"incremental": true` which conflicts with tsup's DTS generation.

**Solution**: Remove `"incremental": true` from `tsconfig.json`:

```diff
{
  "compilerOptions": {
    "composite": false,
-   "incremental": true,
    "strict": true,
    // ...
  }
}
```

---

### Issue: TS7030 - Not All Code Paths Return a Value

**Error**:
```
src/components/FrisbiiEmbedded.tsx(27,13): error TS7030: Not all code paths return a value.
```

**Cause**: `useEffect` callback has a try/catch where not all paths return a cleanup function.

**Solution**: Add `return undefined` in the catch block:

```tsx
useEffect(() => {
  if (!loaded || !containerRef.current || !sessionId) return

  try {
    const rp = new window.Reepay.EmbeddedCheckout(sessionId, {
      html_element: containerRef.current,
    })
    // ... handlers
    return () => rp.destroy?.()
  } catch (error) {
    console.error("[Frisbii] Error:", error)
    return undefined  // ✅ Add this line
  }
}, [loaded, sessionId])
```

This applies to both `FrisbiiEmbedded.tsx` and `FrisbiiOverlay.tsx`.

---

### Issue: package.json exports "types" Warning

**Warning**:
```
▲ [WARNING] The condition "types" here will never be used as it comes 
after both "import" and "require"
```

**Cause**: The `types` field in `exports` comes after `import` and `require`.

**Solution**: This warning is harmless and doesn't affect functionality. The types are still exported correctly via the top-level `"types"` field in package.json.

---

## Unlinking

### Unlink from Storefront

```bash
cd D:\my_cource\medusa\002\medusa-store-storefront
npm unlink @montaekung/medusa-plugin-frisbii-pay-frontend

# Install from registry instead
npm install @montaekung/medusa-plugin-frisbii-pay-frontend
```

---

### Remove Global Link

```bash
cd D:\my_cource\medusa\001\medusa-plugin-frisbii-pay-frontend
npm unlink
```

Or globally:

```bash
npm unlink -g @montaekung/medusa-plugin-frisbii-pay-frontend
```

---

## Best Practices

### 1. Use Watch Mode

Always develop with watch mode:

```bash
# Plugin terminal
npm run dev
```

---

### 2. Keep Dependencies Synced

Ensure storefront and plugin use compatible versions:

```bash
# Check React version in both
# Plugin
cd D:\my_cource\medusa\001\medusa-plugin-frisbii-pay-frontend
npm list react

# Storefront
cd D:\my_cource\medusa\002\medusa-store-storefront
npm list react
```

---

### 3. Clear Caches Regularly

```bash
# Storefront
rm -rf .next
rm -rf node_modules/.cache
```

---

### 4. Commit Before Testing

Always commit your changes before linking:

```bash
git add .
git commit -m "WIP: Testing feature X"
```

This makes it easy to rollback if needed.

---

## Testing Checklist

Before unlinking and publishing, verify:

### Functionality
- [ ] All components render correctly
- [ ] Hooks work as expected
- [ ] TypeScript types are correct
- [ ] No console errors
- [ ] Payment flow works end-to-end

### Build
- [ ] `npm run build` succeeds
- [ ] Dist files generated
- [ ] Type definitions (.d.ts) present
- [ ] No build warnings

### Integration
- [ ] Imports work correctly
- [ ] Props are type-safe
- [ ] Custom components work
- [ ] Error handling works

### Performance
- [ ] No memory leaks
- [ ] SDK loads efficiently
- [ ] No unnecessary re-renders

---

## Alternative: Local File Path

If `npm link` causes issues, use local file path:

```json
// storefront/package.json
{
  "dependencies": {
    "@montaekung/medusa-plugin-frisbii-pay-frontend": "file:../medusa-plugin-frisbii-pay-frontend"
  }
}
```

Then:

```bash
npm install
```

**Note**: This copies files instead of symlinking, so you need to run `npm install` after each change.

---

## Publishing After Testing

Once testing is complete:

### 1. Bump Version

```bash
cd D:\my_cource\medusa\001\medusa-plugin-frisbii-pay-frontend

# Update version
npm version patch  # 0.1.0-beta.1 -> 0.1.0-beta.2
# or
npm version minor  # 0.1.0 -> 0.2.0
```

---

### 2. Build for Production

```bash
npm run build
```

---

### 3. Test Build

```bash
# Dry run (doesn't actually publish)
npm publish --dry-run
```

---

### 4. Publish

```bash
npm login
npm publish --access public
```

---

### 5. Update Storefront

```bash
cd D:\my_cource\medusa\002\medusa-store-storefront

# Unlink
npm unlink @montaekung/medusa-plugin-frisbii-pay-frontend

# Install published version
npm install @montaekung/medusa-plugin-frisbii-pay-frontend@latest
```

---

## Debugging npm link Issues

### Check Symlink Chain

```bash
# Windows PowerShell
$link = Get-Item "node_modules\@montaekung\medusa-plugin-frisbii-pay-frontend"
$link.Target

# Should output: D:\my_cource\medusa\001\medusa-plugin-frisbii-pay-frontend
```

---

### Verify Package Resolution

```bash
# In storefront
node -e "console.log(require.resolve('@montaekung/medusa-plugin-frisbii-pay-frontend'))"
```

Should output path to your local plugin.

---

### Check Build Output

```bash
# In plugin
ls -la dist/

# Should see:
# index.js
# index.mjs
# index.d.ts
# (and other component files)
```

---

## Related Documentation

- [Installation Guide](./INSTALLATION.md) - Production installation
- [Contributing Guide](./CONTRIBUTING.md) - Development workflow
- [Testing Guide](./TESTING.md) - Automated testing
