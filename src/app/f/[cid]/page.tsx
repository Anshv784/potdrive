import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { FileView } from "@/components/file/file-view";

type Props = { params: Promise<{ cid: string }>; searchParams: Promise<{ name?: string }> };

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { cid } = await params;
  const { name } = await searchParams;
  return {
    title: name || `${cid.slice(0, 12)}…`,
    description: "A file stored in Portaldot's TransactionStorage, verified block by block in your browser.",
  };
}

export default async function FilePage({ params, searchParams }: Props) {
  const { cid } = await params;
  const { name } = await searchParams;
  return (
    <>
      <Nav />
      <main>
        <FileView cid={cid} nameHint={name} />
      </main>
    </>
  );
}
