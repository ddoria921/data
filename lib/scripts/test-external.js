'use strict';
/* eslint-disable no-console, node/no-extraneous-require */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
// apparently violates no-extraneous require? /shrug
const debug = require('debug')('test-external');

const projectRoot = path.resolve(__dirname, '../../');
const externalProjectName = process.argv[2];
const gitUrl = process.argv[3];
const tempDir = path.join(projectRoot, '../__external-test-cache');
const projectTempDir = path.join(tempDir, externalProjectName);

if (!gitUrl) {
  throw new Error(
    'No git url provided to `node ./lib/scripts/test-external`. An https git url should be the first argument.'
  );
} else if (gitUrl.indexOf('https') !== 0) {
  throw new Error(
    `The git url provided to \`node ./lib/scripts/test-external\` should use https. Received '${gitUrl}'`
  );
}

console.log(
  `Testing external project ${externalProjectName} located at ${gitUrl} against this ember-data commit.`
);

function execWithLog(command, force) {
  if (debug.enabled || force) {
    return execSync(command, { stdio: [0, 1, 2] });
  }

  return execSync(command);
}

if (!fs.existsSync(tempDir)) {
  fs.mkdirSync(tempDir);
}

if (fs.existsSync(projectTempDir)) {
  // update the project
  try {
    console.log(`Fetching latest commits from ${externalProjectName}`);
    execWithLog(`cd ../__external-test-cache/${externalProjectName} && git pull`);
  } catch (e) {
    debug(e);
    throw new Error(`Update of ${gitUrl} for external project ${externalProjectName} failed.`);
  }
} else {
  // install the project
  try {
    execWithLog(`cd ../__external-test-cache && git clone ${gitUrl}`);
  } catch (e) {
    debug(e);
    throw new Error(
      `Install of ${gitUrl} for external project ${externalProjectName} testing failed.`
    );
  }
}

const useYarn = fs.existsSync(path.join(projectTempDir, 'yarn.lock'));

// install project dependencies and link our local version of ember-data
try {
  execSync(
    `${
      useYarn ? 'yarn link' : 'npm link'
    } && cd ../__external-test-cache/${externalProjectName} && ${
      useYarn ? 'yarn link ember-data && yarn' : 'npm link ember-data && npm install'
    }`
  );
} catch (e) {
  debug(e);
  throw new Error(
    `Unable to complete install of dependencies for external project ${externalProjectName}`
  );
}

// run project tests
console.log(`Running tests for ${externalProjectName}`);
execWithLog(`cd ../__external-test-cache/${externalProjectName} && ember test`, true);
