import { AppDataSource } from "../config/data-source.js";
import { exportService } from "../modules/exports/export.service.js";

async function main() {
  await AppDataSource.initialize();
  const count = await exportService.cleanupExpiredExports();
  console.log(`${count} export(s) expirado(s) removido(s) do disco.`);
  await AppDataSource.destroy();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
