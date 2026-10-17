import type { Metadata } from "next";
import { Code } from "@/components/docs/code";
import { Doc, DocHeader, H2 } from "@/components/docs/prose";

export const metadata: Metadata = { title: "Versions" };

export default function Page() {
  return (
    <Doc href="/docs/versions">
      <DocHeader
        eyebrow="Guides"
        title="Versions"
        summary="Upload a new version of a file. It gets its own CID, links to the old one, and only pays for the blocks that changed."
      />

      <H2 id="how">How it works</H2>
      <ul>
        <li>
          In the Drive, choose <strong>New version</strong> in a file&apos;s details or its right-click menu, then pick the updated file.
        </li>
        <li>
          FastCDC keeps chunk boundaries stable across edits, so most blocks of the new version hash the same as the old one. Portaldot already holds
          them, so the upload skips them. See the <a href="/docs/content-addressing#measured">measurements</a>.
        </li>
        <li>
          The registry records <code>parent</code> in the <code>Registered</code> event. Versions form a chain you can rebuild from logs, at no
          storage deposit.
        </li>
        <li>The Drive shows only the latest version in lists, and every version under Versions in the details panel. Each one is still a separate, shareable CID.</li>
      </ul>

      <H2 id="sdk">From code</H2>
      <Code
        title="new version"
        code={`const v2 = await prepareFile(bytes, { name: "deck.pdf", parent: v1Root });
await uploadFile({ api, file: v2, owner, registry: REGISTRY });

const history = await readVersions(REGISTRY, contentHash(v2.root)); // newest first`}
      />
    </Doc>
  );
}
