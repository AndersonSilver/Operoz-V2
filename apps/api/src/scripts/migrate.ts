import { AppDataSource } from "../config/data-source.js";

const direction = process.argv[2];

async function main() {
  await AppDataSource.initialize();

  if (direction === "revert") {
    await AppDataSource.undoLastMigration();
    console.log("Última migration revertida.");
  } else {
    const applied = await AppDataSource.runMigrations();
    console.log(`${applied.length} migration(s) aplicada(s).`);
    for (const m of applied) console.log(` - ${m.name}`);
  }

  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
