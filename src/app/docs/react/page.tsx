import type { Metadata } from "next";
import { Code } from "@/components/docs/code";
import { Api, Doc, DocHeader, H2 } from "@/components/docs/prose";

export const metadata: Metadata = { title: "React" };

export default function Page() {
  return (
    <Doc href="/docs/react">
      <DocHeader eyebrow="Reference" title="React" summary="Show files stored on Portaldot in any React app, verified in the user's browser." />

      <H2 id="install">Install</H2>
      <Code lang="bash" title="Terminal" code={`npm install @potdrive/sdk`} />
      <p>
        The package ships ESM with type declarations. React is an optional peer dependency, and the bindings live at{" "}
        <code>@potdrive/sdk/react</code>.
      </p>

      <H2 id="components">Components</H2>
      <Code
        lang="tsx"
        title="Profile.tsx"
        code={`import { PotImage, PotVideo, usePotFile } from "@potdrive/sdk/react";

export function Profile() {
  return (
    <>
      <PotImage cid="bafk2bzace…" alt="Avatar" className="rounded-full" fallback={<Spinner />} />
      <PotVideo cid="bafykbzace…" controls />
    </>
  );
}`}
      />
      <Api id="usePotFile" signature="usePotFile(cid, opts?: { secret?, mime?, rpc? }): PotFile" returns="{ url, bytes, status, verified, total, mime }">
        Fetches every block from a Portaldot node, re-hashes it, and returns an object URL. <code>status</code> is <code>loading</code>,{" "}
        <code>ready</code>, <code>missing</code>, <code>corrupt</code> or <code>error</code>. <code>verified</code> and <code>total</code> drive a
        progress UI. Pass <code>secret</code> (a private link&apos;s <code>#k=</code>) to decrypt locally.
      </Api>
      <Api id="PotImage" signature="<PotImage cid secret? fallback? ...imgProps />">
        An <code>&lt;img&gt;</code> fed from <code>usePotFile</code>.
      </Api>
      <Api id="PotVideo" signature="<PotVideo cid gateway? ...videoProps />">
        Streams through the gateway so the browser can seek with Range requests.
      </Api>
    </Doc>
  );
}
