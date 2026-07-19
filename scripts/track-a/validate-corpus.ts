import { loadCorpus, validateCorpus } from "./corpus-schema";

async function main() {
  const input = await loadCorpus(process.argv[2]);
  const { summary } = validateCorpus(input);
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
