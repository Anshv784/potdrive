import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { DeployConsole } from "@/components/deploy-console";

export const metadata: Metadata = { title: "Deploy", robots: { index: false, follow: false } };

// Deploys the contracts from a browser wallet (no recovery phrase in a terminal). Unlinked.
export default function Page() {
  return (
    <>
      <Nav />
      <main className="px-5 py-16">
        <h1 className="headline text-center text-[36px]">Deploy the contracts</h1>
        <p className="mx-auto mb-10 mt-3 max-w-md text-center text-[15px] text-label-2">
          Your wallet signs the deploy. Nothing else is needed: no recovery phrase, no terminal.
        </p>
        <DeployConsole />
      </main>
    </>
  );
}
