import type { Metadata } from "next";
import { Code } from "@/components/docs/code";
import { Doc, DocHeader, H2 } from "@/components/docs/prose";

export const metadata: Metadata = { title: "MCP server" };

export default function Page() {
  return (
    <Doc href="/docs/mcp">
      <DocHeader eyebrow="Reference" title="MCP server" summary="Give AI agents (Claude, Cursor, any MCP client) storage on Portaldot: read verified files, store notes, deploy sites." />

      <H2 id="setup">Set up</H2>
      <Code
        lang="json"
        title=".mcp.json"
        code={`{
  "mcpServers": {
    "potdrive": {
      "command": "bun",
      "args": ["/path/to/potdrive/mcp/server.ts"],
      "env": {
        "POTDRIVE_SEED": "twelve words …",
        "POTDRIVE_MCP_MAX_BYTES": "1048576"
      }
    }
  }
}`}
      />
      <p>
        Read tools need nothing. Write tools sign with <code>POTDRIVE_SEED</code> and refuse anything over <code>POTDRIVE_MCP_MAX_BYTES</code> per call,
        so an agent can&apos;t run up a bill.
      </p>

      <H2 id="tools">Tools</H2>
      <table>
        <tbody>
          <tr><td><code>potdrive_read</code></td><td>Fetch a file or a path inside a stored folder by CID. Every block is verified. Returns text or saves to disk. Opens private files with a key.</td></tr>
          <tr><td><code>potdrive_info</code></td><td>Every block, where it&apos;s held, and when it expires.</td></tr>
          <tr><td><code>potdrive_network</code></td><td>What TransactionStorage holds right now, and recent storage proofs.</td></tr>
          <tr><td><code>potdrive_store</code></td><td>Store a local file or inline text, optionally private. Returns CID and link.</td></tr>
          <tr><td><code>potdrive_deploy</code></td><td>Store a local folder as a site and return its URL.</td></tr>
        </tbody>
      </table>

      <H2 id="example">Example</H2>
      <Code
        lang="text"
        title="An agent session (illustrative)"
        code={`> Save these meeting notes to Portaldot privately and give me the link.
  → potdrive_store { content: "…", name: "notes-oct-17.md", private: true }
  Stored notes-oct-17.md (2,114 bytes, 0.24 tPOT at most).
  Link: https://potdrive.anshverma.tech/f/bafk2bzace…#k=…`}
      />
    </Doc>
  );
}
