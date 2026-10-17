import type { Metadata } from "next";
import { Code } from "@/components/docs/code";
import { Callout, Doc, DocHeader, H2 } from "@/components/docs/prose";

export const metadata: Metadata = { title: "Share with a wallet" };

export default function Page() {
  return (
    <Doc href="/docs/sharing">
      <DocHeader
        eyebrow="Guides"
        title="Share with a wallet"
        summary="Give one specific address access to a private file, with no link to leak. The key is sealed to their inbox and only their browser can open it."
      />

      <H2 id="inbox">Inbox keys</H2>
      <p>
        Polkadot wallets sign but don&apos;t decrypt, and sr25519 keys can&apos;t be used for key agreement from a browser extension. So each
        PotDrive user creates an <strong>X25519 inbox key</strong> on their device. The public half goes into the registry with{" "}
        <code>setInboxKey</code>. The private half stays in that browser. In the Drive this is <strong>Receive shared files</strong> under
        Shared with me.
      </p>

      <H2 id="seal">Sealing</H2>
      <Code
        title="sdk/src/share.ts"
        code={`eph     = x25519.randomPrivateKey()
shared  = x25519(eph, recipientInboxPublicKey)
key     = HKDF-SHA256(shared, salt = "PotDrive share v1", info = root, 32 bytes)
sealed  = 0x01 ‖ x25519.pub(eph) ‖ iv ‖ AES-256-GCM(key, iv, fileKey, aad = root)`}
      />
      <p>
        The owner calls <code>share(root, to, sealed)</code>. The contract checks ownership and emits <code>Shared(root, from, to, sealedKey)</code>.
        The recipient&apos;s Drive reads <code>Shared</code> logs addressed to their mapped H160, opens each with their inbox key, and lists the
        files under Shared with me. Binding the root as AAD means a sealed key can&apos;t be replayed onto another file.
      </p>
      <Callout kind="important" title="Know the trade-offs">
        The inbox private key lives in one browser. Lose it and you lose access to files shared with you, though not to files you uploaded. A
        share is permanent: the sealed key stays in the event log. Sealing to an inbox key is also not revocable, the same as handing over the
        link.
      </Callout>
    </Doc>
  );
}
