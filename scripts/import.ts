// Run with: npx tsx scripts/import.ts
import { runBulkImport } from "../src/lib/scryfall/bulk-import";

runBulkImport()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((err) => {
    console.error("Import failed:", err);
    process.exit(1);
  });
