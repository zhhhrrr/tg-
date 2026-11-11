globalThis.global = globalThis;
export default new Proxy({}, { get: (t, k) => (typeof k === "string" && k !== "then" ? () => "" : undefined) });
export const Socket = class {};
