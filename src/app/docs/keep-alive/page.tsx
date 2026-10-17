import type { Metadata } from "next";
import { Code } from "@/components/docs/code";
import { Callout, Doc, DocHeader, H2 } from "@/components/docs/prose";

export const metadata: Metadata = { title: "Keep-alive" };

export default function Page() {
  return (
    <Doc href="/docs/keep-alive">
      <DocHeader eyebrow="Guides" title="Keep-alive" summary="Prepay renewals once. The keeper renews your file before Portaldot drops it, and can only take what each renewal costs." />

      <H2 id="why">Why</H2>
      <p>
        Portaldot keeps data for 100,800 blocks after it was stored or renewed. Someone has to call <code>renew</code> for every
        block of a file before that runs out. Anyone can, but nobody remembers to.
      </p>

      <H2 id="prepay">Prepay</H2>
      <p>
        Choose 5 or 13 weeks in the Drive, or pass <code>--keep &lt;weeks&gt;</code> to the CLI. The extra value goes into the
        registry with <code>register</code> as <code>msg.value</code>, held per file. Anyone can top up a file with{" "}
        <code>fund(root)</code>, so a community can keep a file alive. The owner can <code>withdraw(root)</code> the remainder at any
        time.
      </p>

      <H2 id="keeper">The keeper</H2>
      <p>A Vercel cron calls <code>/api/keeper</code> once a day, authenticated with <code>CRON_SECRET</code>. For each registry file with a balance:</p>
      <ol>
        <li>Walk the file&apos;s DAG and locate every block in <code>TransactionStorage.Transactions</code>.</li>
        <li>Skip it if the earliest expiry is more than 36 hours away. A daily run leaves a full missed run of slack.</li>
        <li>Price every <code>renew(block, index)</code> with <code>paymentInfo</code>. Skip if the balance can&apos;t cover it.</li>
        <li>Send the renewals, then call <code>renewed(root, newExpiry, cost)</code> to be reimbursed exactly that amount.</li>
      </ol>
      <Code
        title="PotDriveRegistry.sol"
        code={`function renewed(bytes32 root, uint32 expiresAt, uint256 cost) external {
    if (msg.sender != keeper) revert NotKeeper();
    File storage f = _files[root];
    if (cost > f.keepAlive) revert InsufficientKeepAlive();   // capped per file
    f.keepAlive -= uint128(cost);
    if (expiresAt > f.expiresAt) f.expiresAt = expiresAt;
    emit Renewed(root, f.expiresAt, cost, msg.sender);
    _send(msg.sender, cost);
}`}
      />
      <Callout kind="important" title="What the keeper is trusted with">
        The contract cannot see native-side renewals, so it trusts the keeper to report the right cost and to have actually
        renewed. The worst a dishonest keeper can do is take one file&apos;s prepaid balance. Every <code>Renewed</code> event is
        public, and the renewals it claims can be checked in <code>TransactionStorage</code>. A trust-minimized version would verify
        the renewal through a storage proof inside the contract. That is on the roadmap.
      </Callout>

      <H2 id="dry-run">Dry run</H2>
      <p>
        <code>GET /api/keeper?dry</code> runs the whole pass without sending anything and returns what it would do for each file:{" "}
        <code>healthy</code>, <code>renewed</code>, <code>underfunded</code> or <code>expired</code>.
      </p>
    </Doc>
  );
}
