/** Remove stale Next dev route types before production build (avoids TS errors after route moves). */
import { rmSync } from "node:fs";

try {
  rmSync(".next/dev", { recursive: true, force: true });
} catch {
  /* ignore */
}
