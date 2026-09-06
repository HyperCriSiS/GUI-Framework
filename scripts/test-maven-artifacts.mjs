import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const stagingRoot = path.join(root, "build/release-staging/maven");
const stagedManifestPath = path.join(stagingRoot, "staged-packages.json");
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    env: { ...process.env, ...(options.env ?? {}) },
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed\n${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  }
  return result.stdout ?? "";
};

assert(fs.existsSync(stagedManifestPath), "Maven staging manifest is missing; stage Maven artifacts first");
const staged = JSON.parse(fs.readFileSync(stagedManifestPath, "utf8"));
assert(staged.schemaVersion === 1, "Unsupported Maven staging manifest");
assert(staged.localGroup === "gui.framework.local", "Maven dry-run must use the local-only group ID");
assert(staged.packages.length === 4, `Expected 4 Maven artifacts, got ${staged.packages.length}`);

const localRepository = path.join(stagingRoot, "repository");
fs.rmSync(localRepository, { recursive: true, force: true });
fs.mkdirSync(localRepository, { recursive: true });
const repoArg = `-Dmaven.repo.local=${localRepository}`;

const buildOrder = [
  "compose-adapter-jvm",
  "host-context-jvm",
  "desktop-integration-jvm",
  "android-integration-jvm",
];
const expectedClasses = new Map([
  ["compose-adapter-jvm", "gui/framework/compose/GuiThemeKt.class"],
  ["host-context-jvm", "gui/framework/integration/hostcontext/GuiHostContextPreset.class"],
  ["desktop-integration-jvm", "gui/framework/integration/desktop/GuiDesktopSurface.class"],
  ["android-integration-jvm", "gui/framework/integration/android/GuiAndroidSurface.class"],
]);

for (const id of buildOrder) {
  const pkg = staged.packages.find((entry) => entry.id === id);
  assert(pkg, `Missing staged Maven package ${id}`);
  const projectDir = path.join(stagingRoot, id);
  run("mvn", ["-q", repoArg, "-f", path.join(projectDir, "pom.xml"), "clean", "install"]);
  const jarPath = path.join(projectDir, "target", `${pkg.artifactId}-${staged.version}.jar`);
  assert(fs.existsSync(jarPath), `${id} JAR was not produced`);
  const entries = run("jar", ["tf", jarPath]);
  assert(entries.includes("META-INF/LICENSE"), `${id} JAR does not contain META-INF/LICENSE`);
  assert(entries.includes(expectedClasses.get(id)), `${id} JAR does not contain expected public class ${expectedClasses.get(id)}`);
}

const consumerPom = path.join(stagingRoot, "consumer", "pom.xml");
run("mvn", ["-q", repoArg, "-f", consumerPom, "clean", "package"]);
assert(
  fs.existsSync(path.join(stagingRoot, "consumer", "target", "classes", "gui/framework/artifactsmoke/ArtifactConsumerKt.class")),
  "Clean Maven consumer did not compile against the four locally installed artifacts",
);

const localGroupPath = path.join(localRepository, ...staged.localGroup.split("."));
for (const pkg of staged.packages) {
  const installed = path.join(localGroupPath, pkg.artifactId, staged.version, `${pkg.artifactId}-${staged.version}.jar`);
  assert(fs.existsSync(installed), `${pkg.id} was not installed into the isolated local Maven repository`);
}

console.log(`Maven artifact smoke OK: ${staged.packages.length} local development JARs installed and consumed from an isolated repository.`);
