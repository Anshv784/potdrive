import { Footer, Nav } from "@/components/nav";
import { SearchButton, Sidebar, Toc } from "@/components/docs/chrome";

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Nav />
      <div className="mx-auto grid max-w-[1240px] gap-10 px-5 py-10 lg:grid-cols-[14rem_minmax(0,1fr)] xl:grid-cols-[14rem_minmax(0,1fr)_13rem]">
        <aside className="hidden lg:block">
          <div className="sticky top-20 max-h-[calc(100dvh-6rem)] space-y-6 overflow-y-auto pb-10">
            <SearchButton />
            <Sidebar />
          </div>
        </aside>
        <main className="min-w-0 max-w-[760px]">
          <div className="mb-8 space-y-3 lg:hidden">
            <SearchButton />
            <details className="rounded-xl bg-bg-2 px-4 py-3">
              <summary className="cursor-pointer text-[15px] font-medium">Browse documentation</summary>
              <div className="mt-4">
                <Sidebar />
              </div>
            </details>
          </div>
          {children}
        </main>
        <aside className="hidden xl:block">
          <div className="sticky top-20">
            <Toc />
          </div>
        </aside>
      </div>
      <Footer />
    </>
  );
}
