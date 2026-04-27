import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["cjs", "esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  minify: false,
  splitting: false,
  treeshake: true,
  external: ["react", "react-dom"],
  exclude: ["examples", "debug", "docs"],
  async onSuccess() {
    // Add "use client" directive to built files
    const fs = await import("fs/promises")
    const files = ["dist/index.js", "dist/index.mjs"]
    
    for (const file of files) {
      const content = await fs.readFile(file, "utf-8")
      if (!content.startsWith('"use client"')) {
        await fs.writeFile(file, `"use client";\n${content}`)
      }
    }
  },
})
