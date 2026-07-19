/** Adapter: Track A synthetic corpus profile -> Track B EvidenceBundle. */
import type { SyntheticProfile } from "../track-a/corpus-schema";
import type { EvidenceBundle } from "../../lib/intel/evidence";

export function profileToBundle(p: SyntheticProfile): EvidenceBundle {
  return {
    founder: {
      id: p.profileId,
      name: p.founder.name,
      context: p.founder.context,
    },
    signals: p.signals.map((s) => ({
      id: s.signalId,
      source: s.source,
      sourceUrl: s.sourceUrl,
      rawContent: s.rawContent,
      occurredAt: new Date(s.occurredAt),
      meta: s.meta,
    })),
    claims: p.signals.flatMap((s) =>
      s.referenceClaims.map((c, i) => ({
        id: `${s.signalId}-clm-${i + 1}`,
        signalId: s.signalId,
        text: c.text,
        category: c.category,
        sourceLocation: c.sourceLocation,
        specificity: c.specificity,
        verificationStatus: "UNVERIFIED",
      }))
    ),
  };
}
