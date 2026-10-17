import type { Metadata } from "next";
import { Code } from "@/components/docs/code";
import { Callout, Doc, DocHeader, H2 } from "@/components/docs/prose";

export const metadata: Metadata = { title: "Private files" };

export default function Page() {
  return (
    <Doc href="/docs/private-files">
      <DocHeader
        eyebrow="Guides"
        title="Private files"
        summary="Encrypted on your device with AES-256-GCM. Portaldot stores ciphertext, and the key only ever lives in the share link."
      />

      <H2 id="how">How it works</H2>
      <ol>
        <li>PotDrive generates a random 256-bit key and a 96-bit IV with <code>crypto.getRandomValues</code>.</li>
        <li>It builds a plaintext of a 4-byte header length, a JSON header with the real name and type, then the file.</li>
        <li>It encrypts with AES-256-GCM through WebCrypto. The 128-bit tag authenticates the whole envelope.</li>
        <li>The envelope is chunked and stored like any file. The registry records the name as empty and the type as <code>application/octet-stream</code>.</li>
        <li>The key is base64url-encoded into the link fragment: <code>/f/&lt;cid&gt;#k=&lt;key&gt;</code>.</li>
      </ol>

      <H2 id="format">Envelope format</H2>
      <table>
        <thead>
          <tr>
            <th>Bytes</th>
            <th>Field</th>
          </tr>
        </thead>
        <tbody>
          <tr><td><code>0–3</code></td><td>Magic <code>PDE1</code></td></tr>
          <tr><td><code>4–15</code></td><td>IV, 12 bytes</td></tr>
          <tr><td><code>16–…</code></td><td>AES-256-GCM ciphertext and 16-byte tag over: <code>u32be(len) ‖ JSON{`{name, mime}`} ‖ data</code></td></tr>
        </tbody>
      </table>
      <Code
        title="seal and open"
        code={`import { sealFile, openFile } from "@potdrive/sdk";

const { bytes, key } = await sealFile(data, { name: "plan.pdf", mime: "application/pdf" });
const { data: plain, meta } = await openFile(bytes, key);   // throws "Wrong key for this file"`}
      />

      <H2 id="fragment">Why the fragment</H2>
      <p>
        Browsers never send the part of a URL after <code>#</code> to a server. Opening a private link loads the page, then the
        page fetches the ciphertext from Portaldot and decrypts it locally. The PotDrive server, the gateway and the RPC node never
        see the key or the plaintext.
      </p>
      <Callout kind="important" title="Treat the link as the secret">
        Anyone with the full link can read the file, and links get pasted into chats and indexed by previews. The ciphertext on
        Portaldot is public and held until it expires, so a leaked key cannot be revoked. Share private links only where you would
        share the file itself.
      </Callout>

      <H2 id="leaks">What still leaks</H2>
      <ul>
        <li>The ciphertext size, within the chunk size.</li>
        <li>That your account stored something, and when.</li>
        <li>Nothing else: name, type and content are inside the envelope.</li>
      </ul>
    </Doc>
  );
}
