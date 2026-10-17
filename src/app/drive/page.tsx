import { Suspense } from "react";
import type { Metadata } from "next";
import { Nav } from "@/components/nav";
import { Drive } from "@/components/drive/drive";

export const metadata: Metadata = { title: "Drive" };

export default function DrivePage() {
  return (
    <>
      <Nav wide />
      <main>
        <Suspense>
          <Drive />
        </Suspense>
      </main>
    </>
  );
}
