import { defineConfig } from 'tsdown'

export default defineConfig({
    entry: ['./src/index.ts','./src/test.ts','./src/main.ts'],
    format: 'esm',
    clean: true,
})
