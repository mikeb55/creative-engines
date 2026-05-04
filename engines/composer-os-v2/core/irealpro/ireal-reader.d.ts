/** Minimal typings for CommonJS `ireal-reader` (no `@types/ireal-reader` on npm). */
declare module 'ireal-reader' {
  const parse: (data: string) => any;
  export default parse;
}

declare module 'ireal-reader/unscramble' {
  export function ireal(s: string): string;
}
