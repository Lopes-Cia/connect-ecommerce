import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const envSecretPath = path.join(root, ".env.secret");
const envLocalPath = path.join(root, ".env.local");

if (!fs.existsSync(envSecretPath)) {
  process.exit(0);
}

const content = fs.readFileSync(envSecretPath, "utf8");
fs.writeFileSync(envLocalPath, content.endsWith("\n") ? content : `${content}\n`, "utf8");

