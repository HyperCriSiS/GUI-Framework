import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const readJson = (p) => JSON.parse(read(p));
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const ensureDir = (dir) => fs.mkdirSync(dir, { recursive: true });

const distribution = readJson("distribution/artifacts.json");
const packaging = readJson("distribution/packaging.json");
assert(distribution.publicationLock?.state === "locked", "Maven staging must not unlock publication");

const harness = read("packages/adapter-compose/pom.xml");
const kotlinVersion = harness.match(/<kotlin\.version>([^<]+)<\/kotlin\.version>/)?.[1];
const composeVersion = harness.match(/<compose\.version>([^<]+)<\/compose\.version>/)?.[1];
assert(kotlinVersion, "Unable to resolve Kotlin version from Compose compile harness");
assert(composeVersion, "Unable to resolve Compose version from Compose compile harness");

const version = packaging.developmentVersion;
const localGroup = "gui.framework.local";
const stagingRoot = path.join(root, packaging.stagingRoot, "maven");
fs.rmSync(stagingRoot, { recursive: true, force: true });
ensureDir(stagingRoot);

const repositoriesXml = `
    <repositories>
        <repository><id>google</id><url>https://dl.google.com/dl/android/maven2/</url></repository>
        <repository><id>jetbrains-compose</id><url>https://maven.pkg.jetbrains.space/public/p/compose/dev</url></repository>
        <repository><id>central</id><url>https://repo.maven.apache.org/maven2</url></repository>
    </repositories>`;

const licenseXml = `
    <licenses>
        <license>
            <name>GNU Affero General Public License v3.0 or later</name>
            <url>https://www.gnu.org/licenses/agpl-3.0.html</url>
            <distribution>repo</distribution>
        </license>
    </licenses>`;

const resourceXml = `
        <resources>
            <resource>
                <directory>\${project.basedir}/../../../..</directory>
                <includes><include>LICENSE</include></includes>
                <targetPath>META-INF</targetPath>
            </resource>
        </resources>`;

function kotlinPlugin(sourceDirs, { compose = false } = {}) {
  const sources = sourceDirs.map((source) => `                                <sourceDir>${source}</sourceDir>`).join("\n");
  const pluginDependency = compose ? `
                <dependencies>
                    <dependency>
                        <groupId>org.jetbrains.kotlin</groupId>
                        <artifactId>kotlin-compose-compiler-plugin-embeddable</artifactId>
                        <version>\${kotlin.version}</version>
                    </dependency>
                </dependencies>` : "";
  const pluginArg = compose ? `
                            <args>
                                <arg>-Xplugin=\${settings.localRepository}/org/jetbrains/kotlin/kotlin-compose-compiler-plugin-embeddable/\${kotlin.version}/kotlin-compose-compiler-plugin-embeddable-\${kotlin.version}.jar</arg>
                            </args>` : "";
  return `
            <plugin>
                <groupId>org.jetbrains.kotlin</groupId>
                <artifactId>kotlin-maven-plugin</artifactId>
                <version>\${kotlin.version}</version>${pluginDependency}
                <executions>
                    <execution>
                        <id>compile-kotlin</id>
                        <phase>compile</phase>
                        <goals><goal>compile</goal></goals>
                        <configuration>
                            <jvmTarget>17</jvmTarget>${pluginArg}
                            <sourceDirs>
${sources}
                            </sourceDirs>
                        </configuration>
                    </execution>
                </executions>
            </plugin>`;
}

function pom({ artifactId, name, dependencies = "", sourceDirs, compose = false }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>${localGroup}</groupId>
    <artifactId>${artifactId}</artifactId>
    <version>${version}</version>
    <packaging>jar</packaging>
    <name>${name}</name>${licenseXml}
    <properties>
        <kotlin.version>${kotlinVersion}</kotlin.version>
        <compose.version>${composeVersion}</compose.version>
        <project.build.sourceEncoding>UTF-8</project.build.sourceEncoding>
        <project.build.outputTimestamp>1980-01-01T00:00:00Z</project.build.outputTimestamp>
        <kotlin.compiler.daemon>false</kotlin.compiler.daemon>
    </properties>${repositoriesXml}
    <dependencies>
        <dependency><groupId>org.jetbrains.kotlin</groupId><artifactId>kotlin-stdlib</artifactId><version>\${kotlin.version}</version></dependency>${dependencies}
    </dependencies>
    <build>${resourceXml}
        <plugins>${kotlinPlugin(sourceDirs, { compose })}
        </plugins>
    </build>
</project>
`;
}

const composeDependencies = `
        <dependency><groupId>org.jetbrains.compose.ui</groupId><artifactId>ui-desktop</artifactId><version>\${compose.version}</version></dependency>
        <dependency><groupId>org.jetbrains.compose.foundation</groupId><artifactId>foundation-desktop</artifactId><version>\${compose.version}</version></dependency>`;
const adapterDependency = `
        <dependency><groupId>${localGroup}</groupId><artifactId>gui-framework-compose-adapter</artifactId><version>${version}</version></dependency>`;

const definitions = [
  {
    id: "compose-adapter-jvm",
    artifactId: "gui-framework-compose-adapter",
    name: "GUI Framework Compose Adapter (local staging)",
    dependencies: composeDependencies,
    compose: true,
    sourceDirs: [
      "\${project.basedir}/../../../compose",
      "\${project.basedir}/../../../../packages/adapter-compose/src/main/kotlin",
    ],
  },
  {
    id: "host-context-jvm",
    artifactId: "gui-framework-host-context",
    name: "GUI Framework Host Context (local staging)",
    sourceDirs: ["\${project.basedir}/../../../../packages/integration-host-context/kotlin"],
  },
  {
    id: "desktop-integration-jvm",
    artifactId: "gui-framework-desktop-integration",
    name: "GUI Framework Desktop Integration (local staging)",
    dependencies: adapterDependency,
    compose: true,
    sourceDirs: ["\${project.basedir}/../../../../packages/integration-desktop/src/main/kotlin"],
  },
  {
    id: "android-integration-jvm",
    artifactId: "gui-framework-android-integration",
    name: "GUI Framework Android Integration (local staging)",
    dependencies: adapterDependency,
    compose: true,
    sourceDirs: ["\${project.basedir}/../../../../packages/integration-android/src/main/kotlin"],
  },
];

for (const definition of definitions) {
  const contract = packaging.artifacts[definition.id];
  assert(contract?.strategy === "maven", `Missing Maven packaging contract for ${definition.id}`);
  const distributionArtifact = distribution.artifacts.find((artifact) => artifact.id === definition.id);
  assert(distributionArtifact?.logicalName === definition.artifactId, `${definition.id} logical Maven artifact name drifted`);
  const dir = path.join(stagingRoot, definition.id);
  ensureDir(dir);
  fs.writeFileSync(path.join(dir, "pom.xml"), pom(definition));
}

const consumerDir = path.join(stagingRoot, "consumer");
ensureDir(path.join(consumerDir, "src/main/kotlin"));
fs.writeFileSync(path.join(consumerDir, "src/main/kotlin/ArtifactConsumer.kt"), `package gui.framework.artifactsmoke

import gui.framework.generated.api.GuiThemeId
import gui.framework.integration.android.GuiAndroidSurface
import gui.framework.integration.desktop.GuiDesktopSurface
import gui.framework.integration.hostcontext.GuiHostContextPreset

fun describeTheme(theme: GuiThemeId): String = theme.toString()

fun main() {
    check(GuiDesktopSurface.APPLICATION.wireValue == "application")
    check(GuiAndroidSurface.APPLICATION.wireValue == "application")
    check(GuiHostContextPreset.PORTABLE.wireValue == "portable")
}
`);
fs.writeFileSync(path.join(consumerDir, "pom.xml"), `<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://maven.apache.org/POM/4.0.0 https://maven.apache.org/xsd/maven-4.0.0.xsd">
    <modelVersion>4.0.0</modelVersion>
    <groupId>gui.framework.local.smoke</groupId>
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
    <build><plugins>${kotlinPlugin(["\${project.basedir}/src/main/kotlin"])}</plugins></build>
</project>
`);

fs.writeFileSync(path.join(stagingRoot, "staged-packages.json"), `${JSON.stringify({ schemaVersion: 1, localGroup, version, packages: definitions.map(({ id, artifactId }) => ({ id, artifactId })) }, null, 2)}\n`);
console.log(`Staged ${definitions.length} local Maven artifact POMs using ${localGroup}:${version}.`);
