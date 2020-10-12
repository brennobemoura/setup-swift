import * as semver from "semver";
import * as core from "@actions/core";
import { System, OS } from "./os";

const VERSIONS_LIST: [string, OS[]][] = [
  ["5.3", [OS.MacOS, OS.Ubuntu]],
  ["5.2.5", [OS.Ubuntu]],
  ["5.2.4", [OS.MacOS, OS.Ubuntu]],
  ["5.2.3", [OS.Ubuntu]],
  ["5.2.2", [OS.MacOS, OS.Ubuntu]],
  ["5.2.1", [OS.Ubuntu]],
  ["5.2", [OS.MacOS, OS.Ubuntu]],
  ["5.1.5", [OS.Ubuntu]],
  ["5.1.4", [OS.Ubuntu]],
  ["5.1.3", [OS.MacOS, OS.Ubuntu]],
  ["5.1.2", [OS.MacOS, OS.Ubuntu]],
  ["5.1.1", [OS.Ubuntu]],
  ["5.1", [OS.MacOS, OS.Ubuntu]],
  ["5.0.3", [OS.Ubuntu]],
  ["5.0.2", [OS.Ubuntu]],
  ["5.0.1", [OS.MacOS, OS.Ubuntu]],
  ["5.0", [OS.MacOS, OS.Ubuntu]],
  ["4.2.4", [OS.Ubuntu]],
  ["4.2.3", [OS.Ubuntu]],
  ["4.2.2", [OS.Ubuntu]],
  ["4.2.1", [OS.MacOS, OS.Ubuntu]],
  ["4.2", [OS.MacOS, OS.Ubuntu]],
  ["4.1.3", [OS.Ubuntu]],
  ["4.1.2", [OS.MacOS, OS.Ubuntu]],
  ["4.1.1", [OS.Ubuntu]],
  ["4.1", [OS.MacOS, OS.Ubuntu]],
  ["4.0.3", [OS.MacOS, OS.Ubuntu]],
  ["4.0.2", [OS.MacOS, OS.Ubuntu]],
  ["4.0", [OS.MacOS, OS.Ubuntu]],
  ["3.1.1", [OS.MacOS, OS.Ubuntu]],
  ["3.1", [OS.MacOS, OS.Ubuntu]],
  ["3.0.2", [OS.MacOS, OS.Ubuntu]],
  ["3.0.1", [OS.MacOS, OS.Ubuntu]],
  ["3.0", [OS.MacOS, OS.Ubuntu]],
  ["2.2.1", [OS.MacOS, OS.Ubuntu]],
  ["2.2", [OS.MacOS, OS.Ubuntu]],
];

const AVAILABLE_VERSIONS: [semver.SemVer, OS[]][] = VERSIONS_LIST.map(
  ([version, os]) => {
    const semverVersion = semver.coerce(version);
    return <[semver.SemVer, OS[]]>[semverVersion, os];
  }
);

function notEmpty<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export interface Package {
  url: string;
  name: string;
}

export function swiftPackage(version: string, system: System): Package {
  let platform: string;
  let archiveFile: string;
  let archiveName: string;

  switch (system.os) {
    case OS.MacOS:
      platform = "xcode";
      archiveName = `swift-${version}-RELEASE-osx`;
      archiveFile = `${archiveName}.pkg`;
      break;
    case OS.Ubuntu:
      platform = `ubuntu${system.version.replace(/\D/g, "")}`;
      archiveName = `swift-${version}-RELEASE-ubuntu${system.version}`;
      archiveFile = `${archiveName}.tar.gz`;
      break;
    default:
      throw new Error("Cannot create download URL for an unsupported platform");
  }

  return {
    url: `https://swift.org/builds/swift-${version}-release/${platform}/swift-${version}-RELEASE/${archiveFile}`,
    name: archiveName,
  };
}

export function verify(version: string, system: System) {
  let range = semver.validRange(version);
  if (range === null) {
    throw new Error("Version must be a valid semver format.");
  }

  core.debug(`Resolved range ${range}`);

  let systemVersions = AVAILABLE_VERSIONS.filter(([_, os]) =>
    os.includes(system.os)
  ).map(([version, _]) => version);

  let matchingVersion = evaluateVersions(systemVersions, version);
  if (matchingVersion === null) {
    throw new Error(`Version "${version}" is not available`);
  }

  core.debug(`Found matching version ${matchingVersion}`);

  return matchingVersion;
}

// TODO - should we just export this from @actions/tool-cache? Lifted directly from there
function evaluateVersions(versions: semver.SemVer[], versionSpec: string) {
  let version = null;

  versions = versions.sort((a, b) => {
    if (semver.gt(a, b)) {
      return 1;
    }
    return -1;
  });

  for (let i = versions.length - 1; i >= 0; i--) {
    const potential = versions[i];
    const satisfied: boolean = semver.satisfies(potential, versionSpec);
    if (satisfied) {
      version = potential;
      break;
    }
  }

  if (version === null) {
    return null;
  }

  return `${version.major}.${version.minor}${
    version.patch > 0 ? `.${version.patch}` : ""
  }`;
}
