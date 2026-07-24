// MCP tool files are bundled by @lovable.dev/mcp-js into a Deno edge function.
// This ambient declaration keeps the Vite/TS typechecker happy for `process.env`
// reads that only run in the emitted Deno runtime.
declare const process: { env: Record<string, string | undefined> };
