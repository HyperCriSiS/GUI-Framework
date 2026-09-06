import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(root, relativePath), "utf8"));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const run = (command, args, options = {}) => {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? root,
    encoding: "utf8",
    env: { ...process.env, ...(options.env ?? {}) },
  });
  if (result.status !== 0) throw new Error(`${command} ${args.join(" ")} failed\n${result.stdout ?? ""}\n${result.stderr ?? ""}`);
  return result.stdout ?? "";
};
const xml = (value) => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
const packaging = readJson("distribution/packaging.json");
const distribution = readJson("distribution/artifacts.json");
assert(distribution.publicationLock?.state === "locked", "Maven staging requires locked publication");
const stageRoot = path.join(root, packaging.stagingRoot, "maven");
fs.rmSync(stageRoot, { recursive: true, force: true });
fs.mkdirSync(stageRoot, { recursive: true });
const localGroup = "gui.framework.local";
const version = packaging.developmentVersion;
const kotlinVersion = process.env.KOTLIN_VERSION ?? "2.4.10";
const composeVersion = process.env.COMPOSE_MULTIPLATFORM_VERSION ?? "1.10.3";

const repositoriesXml = `
    <repositories>
      <repository><id>google</id><url>https://dl.google.com/dl/android/maven2/</url></repository>
      <repository><id>jetbrains-compose</id><url>https://maven.pkg.jetbrains.space/public/p/compose/dev</url></repository>
    </repositories>`;
const licenseXml = `
    <licenses>
      <license><name>GNU Affero General Public License v3.0 or later</name><url>https://www.gnu.org/licenses/agpl-3.0.html</url><distribution>repo</distribution></license>
    </licenses>`;
const kotlinPlugin = (sourceDirs, { compose = false } = {}) => `
            <plugin>
                <groupId>org.jetbrains.kotlin</groupId>
                <artifactId>kotlin-maven-plugin</artifactId>
                <version>\${kotlin.version}</version>${compose ? `
                <configuration><compilerPlugins><plugin>compose</plugin></compilerPlugins></configuration>
                <dependencies><dependency><groupId>org.jetbrains.kotlin</groupId><artifactId>kotlin-maven-compiler-plugin</artifactId><version>\${kotlin.version}</version></dependency></dependencies>` : ""}
                <executions><execution><id>compile</id><phase>compile</phase><goals><goal>compile</goal></goals><configuration>
                  <jvmTarget>17</jvmTarget><sourceDirs>${sourceDirs.map((dir) => `<source>\${dir}</source>`).join("")}</sourceDirs>
                </configuration></execution></executions>
            </plugin>`;
const composeDeps = `
        <dependency><groupId>org.jetbrains.compose.runtime</groupId><artifactId>runtime-desktop</artifactId><version>\${compose.version}</version></dependency>
        <dependency><groupId>org.jetbrains.compose.foundation</groupId><artifactId>foundation-desktop</artifactId><version>\${compose.version}</version></dependency>
        <dependency><groupId>org.jetbrains.compose.ui</groupId><artifactId>ui-desktop</artifactId><version>\${compose.version}</version></dependency>
        <dependency><groupId>org.jetbrains.compose.ui</groupId><artifactId>ui-text-desktop</artifactId><version>\${compose.version}</version></dependency>
        <dependency><groupId>org.jetbrains.compose.ui</groupId><artifactId>ui-graphics-desktop</artifactId><version>\${compose.version}</version></dependency>`;

const generated = path.join(root, "build/generated/compose");
for (const required of ["GuiGeneratedContracts.kt", "GuiGeneratedTokens.kt", "GuiGeneratedVisuals.kt", "GuiGeneratedAssets.kt"]) {
  assert(fs.existsSync(path.join(generated, required)), `Missing generated Compose input: ${required}`);
}

const contracts = [
  {
    id: "compose-adapter-jvm", name: "GUI Framework Compose Adapter", sourceDirs: [
      "${project.basedir}/../../../build/generated/compose",
      "${project.basedir}/../../../packages/adapter-compose/src/main/kotlin",
    ], compose: true, dependencies: composeDeps,
  },
  {
    id: "desktop-integration-jvm", name: "GUI Framework Desktop Integration", sourceDirs: ["${project.basedir}/../../../packages/integration-desktop/src/main/kotlin"], compose: true,
    dependencies: `${composeDeps}\n        <dependency><groupId>${localGroup}</groupId><artifactId>gui-framework-compose-adapter</artifactId><version>${version}</version></dependency>`,
  },
  {
    id: "android-integration-jvm", name: "GUI Framework Android Integration", sourceDirs: ["${project.basedir}/../../../packages/integration-android/src/main/kotlin"], compose: true,
    dependencies: `${composeDeps}\n        <dependency><groupId>${localGroup}</groupId><artifactId>gui-framework-compose-adapter</artifactId><version>${version}</version></dependency>`,
  },
  {
    id: "host-context-jvm", name: "GUI Framework Host Context", sourceDirs: ["${project.basedir}/../../../packages/integration-host-context/kotlin"], compose: false,
    dependencies: "",
  },
];

function pomFor(artifact, contract) {
  const resourceXml = artifact.id === "compose-adapter-jvm" ? `
        <resources><resource><directory>\${project.basedir}/../../../</directory><includes><include>LICENSE</include></includes><targetPath>META-INF</targetPath></resource></resources>` : `
        <resources><resource><directory>\${project.basedir}/../../../</directory><includes><include>LICENSE</include></includes><targetPath>META-INF</targetPath></resource></resources>`;
  const dependencies = contract.dependencies ?? "";
  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>${localGroup}</groupId>
    <artifactId>${xml(artifact.logicalName)}</artifactId>
    <version>${version}</version>
    <packaging>jar</packaging>
    <name>${contract.name}</name>${licenseXml}
    <properties>
        <kotlin.version>${kotlinVersion}</kotlin.version>
        <compose.version>${composeVersion}</compose.version>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <project.build.outputTimestamp>1980-01-01T00:00:00Z</project.build.outputTimestamp>
    </properties>${repositoriesXml}
    <dependencies>
        <dependency><groupId>org.jetbrains.kotlin</groupId><artifactId>kotlin-stdlib</artifactId><version>\${kotlin.version}</version></dependency>${dependencies}
    </dependencies>
    <build>${resourceXml}
        <plugins>${kotlinPlugin(contract.sourceDirs, { compose: contract.compose })}
        </plugins>
    </build>
</project>
`;
}

const artifactsById = new Map(distribution.artifacts.map((artifact) => [artifact.id, artifact]));
const isolatedRepo = path.join(stageRoot, "repository");
fs.mkdirSync(isolatedRepo, { recursive: true });
for (const contract of contracts) {
  const artifact = artifactsById.get(contract.id);
  assert(artifact && artifact.ecosystem === "maven-central", `Missing Maven artifact contract: ${contract.id}`);
  assert(packaging.artifacts[contract.id]?.strategy === "maven", `Missing Maven packaging strategy: ${contract.id}`);
  assert(artifact.registryName === null, `${contract.id} registryName must remain unbound`);
  const dir = path.join(stageRoot, contract.id);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "pom.xml"), pomFor(artifact, contract));
  run("mvn", ["-q", `-Dmaven.repo.local=${isolatedRepo}`, "package", "install"], { cwd: dir });
  const jar = path.join(dir, "target", `${artifact.logicalName}-${version}.jar`);
  assert(fs.existsSync(jar), `Staged Maven JAR missing: ${jar}`);
  const listing = run("jar", ["tf", jar]);
  assert(listing.split(/\r?\n/).includes("META-INF/LICENSE"), `${contract.id} JAR is missing META-INF/LICENSE`);
}

const consumer = path.join(stageRoot, "consumer");
fs.mkdirSync(path.join(consumer, "src/main/kotlin"), { recursive: true });
fs.writeFileSync(path.join(consumer, "src/main/kotlin/Consumer.kt"), `package gui.framework.artifactconsumer

import gui.framework.compose.GuiButtonVariant
import gui.framework.integration.desktop.GuiDesktopSurface
import gui.framework.integration.android.GuiAndroidSurface
import gui.framework.integration.host.GuiHostContextPreset

fun smoke(): String = listOf(
    GuiButtonVariant.Primary.name,
    GuiDesktopSurface.APPLICATION.wireValue,
    GuiAndroidSurface.APPLICATION.wireValue,
    GuiHostContextPreset.PORTABLE.wireValue,
).joinToString(":")
`);
fs.writeFileSync(path.join(consumer, "pom.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion><groupId>gui.framework.local.consumer</groupId>
    <artifactId>artifact-consumer</artifactId>
    <version>0.0.0</version>
    <properties><kotlin.version>${kotlinVersion}</kotlin.version><project.build.sourceEncoding>UTF-8</project.build.sourceEncoding></properties>
    ${repositoriesXml}
    <dependencies>
        <dependency><groupId>${localGroup}</groupId><artifactId>gui-framework-compose-adapter</artifactId><version>${version}</version></dependency>
        <dependency><groupId>${localGroup}</groupId><artifactId>gui-framework-desktop-integration</artifactId><version>${version}</version></dependency>
        <dependency><groupId>${localGroup}</groupId><artifactId>gui-framework-android-integration</artifactId><version>${version}</version></dependency>
        <dependency><groupId>${localGroup}</groupId><artifactId>gui-framework-host-context</artifactId><version>${version}</version></dependency>
    </dependencies>
    <build><plugins>${kotlinPlugin(["${project.basedir}/src/main/kotlin"])}</plugins></build>
</project>
`);
run("mvn", ["-q", `-Dmaven.repo.local=${isolatedRepo}`, "compile"], { cwd: consumer });
console.log("Staged 4 Maven development artifacts and compiled an isolated local consumer.");
