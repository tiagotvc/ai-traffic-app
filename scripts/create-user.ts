import "dotenv/config";
import { registerUser } from "../src/lib/register-user";

const email = process.argv[2];
const password = process.argv[3];
const name = process.argv[4];

if (!email || !password) {
  console.error("Uso: tsx scripts/create-user.ts <email> <senha> [nome]");
  process.exit(1);
}

registerUser({ email, password, name })
  .then((result) => {
    if (!result.ok) {
      console.error("Falha:", result.error);
      process.exit(1);
    }
    console.log("OK userId:", result.userId);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
