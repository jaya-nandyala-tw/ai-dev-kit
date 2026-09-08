// Ported from a one-off release-note SVG (a different harness's "Harness Hardening" writeup) and
// relabeled onto this kit's actual agents: that source used @groom/@doc-garden, which don't exist
// here — this kit's equivalents are @intake (classify + fetch the ticket) and @doc-sync (spec
// sync at close). Every other node/agent name below (@story, @implement, @test, @git, @verify,
// the code-review skill) already matched exactly.
export function WorkflowDiagram() {
  return (
    <svg
      viewBox="0 0 1460 270"
      role="img"
      aria-label="The story workflow: a ticket moves from Intake through Plan, a human approval gate, a per-task Implement, Test, Commit loop, Verify, Review, a second human gate, and Close — with Verify failures and Review blockers routed back into the implement loop instead of re-running duplicated logic."
      style={{ display: "block", width: "100%", height: "auto", minWidth: 900 }}
    >
      <defs>
        <marker id="wf-arrow" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
          <polygon points="0,0 10,5 0,10" fill="var(--muted-soft)" />
        </marker>
        <marker id="wf-arrow-fail" viewBox="0 0 10 10" refX={8} refY={5} markerWidth={7} markerHeight={7} orient="auto-start-reverse">
          <polygon points="0,0 10,5 0,10" fill="var(--danger)" />
        </marker>
      </defs>

      {/* Intake */}
      <rect className="wf-node" x={20} y={64} width={130} height={56} />
      <text className="wf-title" x={85} y={89} textAnchor="middle" fontSize={15}>
        Intake
      </text>
      <text className="wf-label" x={85} y={108} textAnchor="middle">
        @intake
      </text>

      <line className="wf-flow" x1={150} y1={92} x2={184} y2={92} markerEnd="url(#wf-arrow)" />

      {/* Plan */}
      <rect className="wf-node" x={190} y={64} width={130} height={56} />
      <text className="wf-title" x={255} y={89} textAnchor="middle" fontSize={15}>
        Plan
      </text>
      <text className="wf-label" x={255} y={108} textAnchor="middle">
        @story + plan-story
      </text>

      <line className="wf-flow" x1={320} y1={92} x2={354} y2={92} markerEnd="url(#wf-arrow)" />

      {/* Gate 1 */}
      <polygon className="wf-gate" points="360,92 394,58 428,92 394,126" />
      <text className="wf-title" x={394} y={89} textAnchor="middle" fontSize={13}>
        Gate
      </text>
      <text className="wf-label" x={394} y={104} textAnchor="middle">
        human
      </text>

      <line className="wf-flow" x1={428} y1={92} x2={462} y2={92} markerEnd="url(#wf-arrow)" />
      <text className="wf-label" x={445} y={80} textAnchor="middle">
        approve
      </text>

      {/* Implement loop */}
      <text className="wf-loop-title" x={648} y={46} textAnchor="middle" fontSize={13}>
        IMPLEMENT LOOP — per task, per repo
      </text>
      <rect className="wf-loop" x={468} y={58} width={360} height={68} />

      <rect className="wf-sub" x={486} y={71} width={98} height={42} />
      <text className="wf-title" x={535} y={97} textAnchor="middle" fontSize={13}>
        Implement
      </text>

      <line className="wf-flow" x1={584} y1={92} x2={608} y2={92} markerEnd="url(#wf-arrow)" />

      <rect className="wf-sub" x={612} y={71} width={74} height={42} />
      <text className="wf-title" x={649} y={97} textAnchor="middle" fontSize={13}>
        Test
      </text>

      <line className="wf-flow" x1={686} y1={92} x2={710} y2={92} markerEnd="url(#wf-arrow)" />

      <rect className="wf-sub" x={714} y={71} width={96} height={42} />
      <text className="wf-title" x={762} y={97} textAnchor="middle" fontSize={13}>
        Commit
      </text>

      <text className="wf-label" x={648} y={145} textAnchor="middle">
        @implement · @test · @git
      </text>

      <line className="wf-flow" x1={828} y1={92} x2={862} y2={92} markerEnd="url(#wf-arrow)" />

      {/* Verify */}
      <rect className="wf-node" x={868} y={64} width={120} height={56} />
      <text className="wf-title" x={928} y={89} textAnchor="middle" fontSize={15}>
        Verify
      </text>
      <text className="wf-label" x={928} y={108} textAnchor="middle">
        @verify
      </text>

      <line className="wf-flow" x1={988} y1={92} x2={1022} y2={92} markerEnd="url(#wf-arrow)" />

      {/* Review */}
      <rect className="wf-node" x={1028} y={64} width={120} height={56} />
      <text className="wf-title" x={1088} y={89} textAnchor="middle" fontSize={15}>
        Review
      </text>
      <text className="wf-label" x={1088} y={108} textAnchor="middle">
        code-review skill
      </text>

      <line className="wf-flow" x1={1148} y1={92} x2={1182} y2={92} markerEnd="url(#wf-arrow)" />

      {/* Gate 2 */}
      <polygon className="wf-gate" points="1188,92 1222,58 1256,92 1222,126" />
      <text className="wf-title" x={1222} y={89} textAnchor="middle" fontSize={13}>
        Gate
      </text>
      <text className="wf-label" x={1222} y={104} textAnchor="middle">
        human
      </text>

      <line className="wf-flow" x1={1256} y1={92} x2={1290} y2={92} markerEnd="url(#wf-arrow)" />
      <text className="wf-label" x={1273} y={80} textAnchor="middle">
        clean
      </text>

      {/* Close */}
      <rect className="wf-node" x={1296} y={64} width={130} height={56} />
      <text className="wf-title" x={1361} y={89} textAnchor="middle" fontSize={15}>
        Close
      </text>
      <text className="wf-label" x={1361} y={108} textAnchor="middle">
        @story + @doc-sync
      </text>

      {/* FAIL: Verify -> Implement loop */}
      <path className="wf-fail" d="M 928 120 L 928 190 L 560 190 L 560 132" markerEnd="url(#wf-arrow-fail)" />
      <text className="wf-fail-label" x={744} y={182} textAnchor="middle">
        FAIL
      </text>

      {/* blockers: Review -> Implement loop */}
      <path className="wf-fail" d="M 1088 120 L 1088 235 L 740 235 L 740 132" markerEnd="url(#wf-arrow-fail)" />
      <text className="wf-fail-label" x={914} y={227} textAnchor="middle">
        blockers
      </text>
    </svg>
  );
}
