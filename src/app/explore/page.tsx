import type { Metadata } from "next";
import { Footer, Nav } from "@/components/nav";
import { Explore } from "@/components/explore/explore";

export const metadata: Metadata = { title: "Explore" };

export default function ExplorePage() {
  return (
    <>
      <Nav />
      <main>
        <Explore />
      </main>
      <Footer />
    </>
  );
}
