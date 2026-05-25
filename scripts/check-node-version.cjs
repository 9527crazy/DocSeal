const expectedMajor = 20;
const actual = process.versions.node;
const actualMajor = Number(actual.split('.')[0]);

if (actualMajor !== expectedMajor) {
  console.error(
    [
      `DocSeal must run with Node ${expectedMajor}.x because better-sqlite3 is a native dependency.`,
      `Current Node version: ${actual}`,
      '',
      'Run these commands in the project root:',
      '  nvm use',
      '  pnpm --filter server rebuild better-sqlite3',
      '  pnpm dev',
    ].join('\n'),
  );
  process.exit(1);
}
