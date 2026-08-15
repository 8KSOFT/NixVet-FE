// Injected into the esbuild bundle (see bundle.mjs's `inject` option) so any
// bare `process` reference resolves instead of throwing ReferenceError.
// esbuild's `inject` treats a top-level export as the implicit provider for
// that identifier wherever it appears as an unresolved global — no `define`
// needed alongside it (the same mechanism webpack's ProvidePlugin uses).
//
// Needed because the synthesized entry pulls in Next.js client internals
// (next/link, next/image, next/navigation, …) transitively, and those read
// process.env.__NEXT_*, process.platform, process.nextTick, etc. — none of
// which exist in a plain esbuild browser IIFE.
export let process = {
  env: {},
  platform: 'browser',
  browser: true,
  version: '',
  versions: {},
  nextTick: (fn, ...args) => Promise.resolve().then(() => fn(...args)),
};
