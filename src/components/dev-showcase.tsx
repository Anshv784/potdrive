import { codeToHtml } from "shiki";
import { DevTabs, type DevItem } from "./dev-tabs";

const SDK = `import { connect, prepareFile, uploadFile } from "@potdrive/sdk";

const api = await connect();
const file = await prepareFile(bytes, { name: "deck.pdf", mime: "application/pdf" });

const { root } = await uploadFile({
  api,
  file,
  owner: { address, signer }, // any Polkadot wallet
  registry: REGISTRY,
  onEvent: (e) => console.log(e.type),
});

console.log(\`https://potdrive.anshverma.tech/ipfs/\${root}\`);`;

const CLI = `$ bun run cli put ./deck.pdf --private
  prepared   deck.pdf · 3.40 MiB → 5 blocks · sealed
  estimate   410.7 tPOT at most
  stored     ████████████████████ 5/5 blocks
  verified   root served by bitswap
  link       https://potdrive.anshverma.tech/f/bafykbzace…#k=…

$ bun run cli deploy ./dist
$ bun run cli get bafykbzace… -o deck.pdf`;

const GATEWAY = `# Any stored file, with the right Content-Type
curl https://potdrive.anshverma.tech/ipfs/<cid>

# Seek inside a video: only the blocks covering the range are read
curl -H "Range: bytes=0-1048575" https://potdrive.anshverma.tech/ipfs/<cid>

# Where every block lives, and when it expires
curl https://potdrive.anshverma.tech/api/file/<cid>`;

const REACT = `import { PotImage, PotVideo } from "@potdrive/sdk/react";

export function Gallery({ cid }: { cid: string }) {
  return <PotImage cid={cid} alt="Stored on Portaldot" />;
}`;

async function html(code: string, lang: string) {
  return codeToHtml(code, { lang, theme: "github-dark-default" });
}

// The developer section: snippets are highlighted on the server, the tabs run on the client.
export async function DevShowcase() {
  const items: DevItem[] = [
    {
      id: "sdk",
      label: "SDK",
      icon: "code",
      desc: "Chunk, hash, store and register a file from TypeScript.",
      file: "upload.ts",
      lang: "TypeScript",
      code: SDK,
      html: await html(SDK, "ts"),
    },
    {
      id: "react",
      label: "React",
      icon: "atom",
      desc: "Components that fetch from the chain and verify before they render.",
      file: "gallery.tsx",
      lang: "TSX",
      code: REACT,
      html: await html(REACT, "tsx"),
    },
    {
      id: "cli",
      label: "CLI",
      icon: "terminal",
      desc: "Upload, deploy a site or fetch a file from your terminal.",
      file: "Terminal",
      lang: "Shell · example output",
      code: CLI,
      html: await html(CLI, "shellsession"),
    },
    {
      id: "gateway",
      label: "Gateway",
      icon: "globe",
      desc: "Plain HTTP for anything stored. Works in an <img> tag.",
      file: "requests.sh",
      lang: "HTTP",
      code: GATEWAY,
      html: await html(GATEWAY, "bash"),
    },
  ];
  return <DevTabs items={items} />;
}
