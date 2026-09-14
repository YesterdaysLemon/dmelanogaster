import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
const pkg = JSON.parse(await readFile("package.json", "utf8"));
let sha = process.env.BUILD_SHA;
if (!sha) {
  try {
    sha = execFileSync("git", ["rev-parse", "HEAD"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    sha = "development";
  }
}
if (sha !== "development" && !/^[a-f0-9]{40}$/.test(sha))
  throw new Error("Invalid build SHA");
await writeFile(
  "dist/build.json",
  JSON.stringify(
    {
      name: pkg.name,
      version: pkg.version,
      sha,
      builtAt: new Date().toISOString(),
    },
    null,
    2,
  ) + "\n",
);
