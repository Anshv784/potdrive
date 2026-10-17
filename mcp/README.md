# PotDrive MCP server

Give AI agents (Claude, Cursor, any MCP client) storage on Portaldot. They can read verified files, save notes, store files and deploy static sites.

```json
{
  "mcpServers": {
    "potdrive": {
      "command": "bun",
      "args": ["/path/to/potdrive/mcp/server.ts"],
      "env": { "POTDRIVE_SEED": "twelve words …", "POTDRIVE_MCP_MAX_BYTES": "1048576" }
    }
  }
}
```

| Tool | Does | Needs a key |
|---|---|:-:|
| `potdrive_read` | Fetch a file or a path inside a stored folder. Every block is verified. Returns text or saves to disk. Opens private files with their key. | |
| `potdrive_info` | Every block of a file, the `(block, index)` holding it, and its expiry | |
| `potdrive_network` | What TransactionStorage holds right now, plus recent storage proofs | |
| `potdrive_store` | Store a local file or inline text, optionally private. Returns the CID and link. | ✓ |
| `potdrive_deploy` | Store a local folder as a site and return its URL | ✓ |

Write tools refuse anything over `POTDRIVE_MCP_MAX_BYTES` per call, so an agent can't run up a bill. Docs: [potdrive.anshverma.tech/docs/mcp](https://potdrive.anshverma.tech/docs/mcp).
