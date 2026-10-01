const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const driverRoot = path.resolve(__dirname, '..');
const workspaceRoot = path.resolve(driverRoot, '..', '..');
const androidRoot = path.join(driverRoot, 'android');
const candidates =
  process.platform === 'win32'
    ? [
        'C:\\Program Files\\Eclipse Adoptium\\jdk-17.0.20.101-hotspot',
        'C:\\Program Files\\Android\\Android Studio\\jbr',
      ]
    : ['/Applications/Android Studio.app/Contents/jbr/Contents/Home', '/opt/android-studio/jbr'];

const javaHome = candidates.find(candidate =>
  fs.existsSync(path.join(candidate, 'bin', process.platform === 'win32' ? 'java.exe' : 'java'))
);

const environment = { ...process.env };
if (javaHome) {
  environment.JAVA_HOME = javaHome;
  environment.PATH = `${path.join(javaHome, 'bin')}${path.delimiter}${environment.PATH || ''}`;
}

const packageManager = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : 'pnpm';
const buildArgs =
  process.platform === 'win32'
    ? ['/d', '/s', '/c', 'pnpm --filter @bus-tracking/driver build:android']
    : ['--filter', '@bus-tracking/driver', 'build:android'];
const build = spawnSync(packageManager, buildArgs, {
  cwd: workspaceRoot,
  env: environment,
  stdio: 'inherit',
});

if (build.error) {
  console.error(`Unable to run the Android web build: ${build.error.message}`);
  process.exit(1);
}

if (build.status !== 0) {
  process.exit(build.status ?? 1);
}

const gradle = process.platform === 'win32' ? process.env.ComSpec || 'cmd.exe' : './gradlew';
const gradleArgs =
  process.platform === 'win32'
    ? ['/d', '/s', '/c', '.\\gradlew.bat assembleDebug']
    : ['assembleDebug'];
const assemble = spawnSync(gradle, gradleArgs, {
  cwd: androidRoot,
  env: environment,
  stdio: 'inherit',
});

if (assemble.error) {
  console.error(`Unable to run the Android Gradle build: ${assemble.error.message}`);
  process.exit(1);
}

process.exit(assemble.status ?? 1);
