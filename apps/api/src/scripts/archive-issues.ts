import { AppDataSource } from "../config/data-source.js";
import { runArchiveAndCloseJob } from "../modules/issues/archive-job.js";

async function main() {
  await AppDataSource.initialize();
  const { archived, closed } = await runArchiveAndCloseJob();
  console.log(`${archived} issue(s) arquivada(s) por archiveIn, ${closed} por closeIn.`);
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
