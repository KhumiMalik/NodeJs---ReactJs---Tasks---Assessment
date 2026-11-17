/**
 * Refuses to continue unless the URL points at a database whose name ends in
 * "_test", so destructive test setup can never touch the development database.
 */
export function assertTestDatabase(databaseUrl: string | undefined): void {
  const name = databaseUrl ? new URL(databaseUrl).pathname.replace(/^\//, '') : '';
  if (!name.endsWith('_test')) {
    throw new Error(`Refusing to run tests against database "${name}". The test database name must end with "_test".`);
  }
}
