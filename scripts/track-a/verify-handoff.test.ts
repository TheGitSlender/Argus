import assert from "node:assert/strict";
import { test } from "node:test";
import { loadCorpus, validateCorpus } from "./corpus-schema";
import { DEMO_PROFILE_IDS, requiredDemoProfiles } from "./verify-handoff";

test("selects stable profiles for every Gate 5 demonstration", async () => {
  const { profiles } = validateCorpus(await loadCorpus());
  const demos = requiredDemoProfiles(profiles);
  assert.equal(demos.hiddenGem.profileId, DEMO_PROFILE_IDS.hiddenGem);
  assert.equal(demos.coldStart.profileId, DEMO_PROFILE_IDS.coldStart);
  assert.equal(demos.contradiction.profileId, DEMO_PROFILE_IDS.contradiction);
  assert.equal(demos.persistentIdentity.profileId, DEMO_PROFILE_IDS.persistentIdentity);
});

test("rejects a missing required demonstration profile", async () => {
  const { profiles } = validateCorpus(await loadCorpus());
  assert.throws(
    () => requiredDemoProfiles(profiles.filter((profile) => profile.profileId !== DEMO_PROFILE_IDS.coldStart)),
    /Missing Gate 5 demo profile/,
  );
});
