/** An unpredictable seed. `crypto` is global on Node and in the browser. The seed never leaves the server. */
export function generateSeed(): number {
  return crypto.getRandomValues(new Uint32Array(1))[0];
}
