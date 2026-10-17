import { describe, expect, test } from "bun:test";
import { buildDirectory, decodeNode } from "../src/dag";
import { DAG_PB } from "../src/cid";

const enc = (s: string) => new TextEncoder().encode(s);
const site = [
  { path: "index.html", bytes: enc("<h1>hi</h1>") },
  { path: "assets/app.js", bytes: enc("console.log(1)") },
  { path: "assets/logo.svg", bytes: enc("<svg/>") },
];

describe("UnixFS directories", () => {
  test("root is a dag-pb directory with sorted links", () => {
    const dir = buildDirectory(site, 1024);
    expect(dir.root.code).toBe(DAG_PB);
    const root = dir.blocks.find((b) => b.cid.equals(dir.root))!;
    const node = decodeNode(root.bytes);
    expect(node.kind).toBe("directory");
    expect(node.links.map((l) => l.name)).toEqual(["assets", "index.html"]);
    expect(dir.files.map((f) => f.path).sort()).toEqual(["assets/app.js", "assets/logo.svg", "index.html"]);
  });

  test("same folder, any input order, same CID", () => {
    expect(buildDirectory(site, 1024).root.toString()).toBe(buildDirectory([...site].reverse(), 1024).root.toString());
  });

  test("subdirectory links resolve to its files", () => {
    const dir = buildDirectory(site, 1024);
    const root = decodeNode(dir.blocks.find((b) => b.cid.equals(dir.root))!.bytes);
    const assets = root.links.find((l) => l.name === "assets")!;
    const sub = decodeNode(dir.blocks.find((b) => b.cid.equals(assets.cid))!.bytes);
    expect(sub.links.map((l) => l.name)).toEqual(["app.js", "logo.svg"]);
  });

  test("rejects path traversal", () => {
    expect(() => buildDirectory([{ path: "../etc/passwd", bytes: enc("x") }], 1024)).toThrow();
  });

  test("duplicate files share blocks", () => {
    const dir = buildDirectory([
      { path: "a.txt", bytes: enc("same") },
      { path: "b.txt", bytes: enc("same") },
    ]);
    // one leaf + one directory node
    expect(dir.blocks.length).toBe(2);
  });
});
