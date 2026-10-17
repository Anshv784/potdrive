import type { Metadata } from "next";
import { Code } from "@/components/docs/code";
import { Callout, Doc, DocHeader, H2 } from "@/components/docs/prose";

export const metadata: Metadata = { title: "Host a website" };

export default function Page() {
  return (
    <Doc href="/docs/websites">
      <DocHeader
        eyebrow="Guides"
        title="Host a website on Portaldot"
        summary="Build a static site, store the output folder as a UnixFS directory, and serve it from the chain."
      />

      <H2 id="deploy">Deploy</H2>
      <Code
        lang="bash"
        title="Terminal (illustrative output)"
        code={`npm run build                          # any static output: Vite, Astro, Next export, plain HTML
bun cli/potdrive.ts deploy ./dist

  prepared   23 files · 412.6 KiB → 25 unique blocks
  estimate   47.902 tPOT at most
  stored     ████████████████████ 25/25 blocks
  site       https://potdrive.anshverma.tech/ipfs/bafykbzace…/`}
      />
      <p>
        Or use <strong>Folder</strong> in the Drive. PotDrive builds a UnixFS directory: same input, same root CID, with shared
        files stored once. Redeploying an edited site only stores the blocks that changed.
      </p>

      <H2 id="serving">How it is served</H2>
      <ul>
        <li>
          <code>/ipfs/&lt;root&gt;</code> redirects to <code>/ipfs/&lt;root&gt;/</code> so relative URLs resolve.
        </li>
        <li>A directory with <code>index.html</code> serves it. Without one, you get a directory listing.</li>
        <li>
          <code>/ipfs/&lt;root&gt;/assets/app.js</code> walks the tree one verified block at a time, then serves the file with a
          type taken from its extension.
        </li>
        <li>Files are immutable by CID, so responses carry <code>Cache-Control: immutable</code>.</li>
      </ul>

      <H2 id="sandbox">The sandbox</H2>
      <p>
        Stored HTML, SVG and JavaScript run under <code>Content-Security-Policy: sandbox allow-scripts allow-forms allow-popups
        allow-modals allow-downloads</code>, without <code>allow-same-origin</code>. The browser gives the page an opaque origin.
        It cannot read PotDrive&apos;s cookies, storage or wallet session, even though it is served from the same host.
      </p>
      <Callout kind="note" title="What this means for your site">
        The site has no <code>localStorage</code> and no cookies, and same-origin <code>fetch</code> calls count as cross-origin.
        The gateway sends <code>Access-Control-Allow-Origin: *</code>, so fetching other CIDs still works. For storage-heavy apps,
        point a custom domain at a gateway that serves sites on their own origin.
      </Callout>

      <H2 id="tips">Tips</H2>
      <ul>
        <li>Use relative asset paths (<code>base: &quot;./&quot;</code> in Vite) so the site works under <code>/ipfs/&lt;cid&gt;/</code>.</li>
        <li>Hashed asset filenames dedupe well across deploys. Unchanged bundles keep their CIDs.</li>
        <li>Keep the total under 64 MiB in the Drive. The CLI has no fixed cap, but fees are per byte.</li>
      </ul>
    </Doc>
  );
}
