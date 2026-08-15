// Compiles src/app/globals.css (Tailwind v4 CSS-first config) into a static
// stylesheet with real utility classes, since design-sync's converter only
// bundles CSS statically and cannot run Tailwind's JIT scanner itself.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import postcss from 'postcss';
import tailwindcss from '@tailwindcss/postcss';

const root = process.cwd();
const input = path.join(root, 'src/app/globals.css');
const outDir = path.join(root, '.design-sync/build');
const outFile = path.join(outDir, 'tailwind.css');

const css = await readFile(input, 'utf8');
const result = await postcss([tailwindcss({ base: root })]).process(css, {
  from: input,
  to: outFile,
});

// globals.css defines --font-sans/--font-heading as SELF-REFERENTIAL
// (`--font-sans: var(--font-sans), "Inter", ...`) — in the real app this is
// legitimately fine because next/font's inline style on <html> overrides
// --font-sans with a real value before this :root declaration is ever read,
// breaking the cycle. Outside that runtime (this static export, and any
// design-agent preview), the self-reference makes the custom property
// guaranteed-invalid per spec, so every `var(--font-sans)` use resolves to
// nothing and font-family falls back to the browser default — not even the
// literal "Inter" fallback text is reached. Resolve the cycle statically so
// previews actually render the brand fonts (see .design-sync/build/brand-fonts.css
// for the matching @font-face rules).
// The @font-face src is a Next.js public/-root-relative URL ("/fonts/...").
// That resolves fine in the real app (served from the site root) but design-sync's
// font scraper resolves url()s relative to the CSS file's own directory, so a
// leading "/" doesn't reach public/fonts/. Rewrite it to a real relative path
// so the scraper can find and copy the file (see [FONT_DANGLING] in the
// design-sync validate output — the un-rewritten version left a dangling rule).
let out = result.css
  .replace(
    'url("/fonts/inter-black/Inter-VariableFont_opsz,wght.ttf")',
    'url("../../public/fonts/inter-black/Inter-VariableFont_opsz,wght.ttf")',
  )
  .replace(
    '--font-sans: var(--font-sans), "Inter", system-ui, sans-serif;',
    '--font-sans: "Inter", system-ui, sans-serif;',
  )
  .replace(
    '--font-heading: var(--font-heading), "Poppins", var(--font-sans), system-ui, sans-serif;',
    '--font-heading: "Poppins", "Inter", system-ui, sans-serif;',
  );

await mkdir(outDir, { recursive: true });
await writeFile(outFile, out, 'utf8');
console.log(`wrote ${outFile} (${out.length} bytes)`);
