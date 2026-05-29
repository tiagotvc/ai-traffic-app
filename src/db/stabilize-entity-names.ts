/**
 * Next.js minifies server class names in production (User -> "j"), which makes
 * TypeORM assign duplicate entity names and throw Cyclic dependency / metadata errors.
 */
export function stabilizeTypeOrmEntityNames(
  entries: ReadonlyArray<{ ctor: new (...args: never[]) => object; name: string }>
) {
  for (const { ctor, name } of entries) {
    Object.defineProperty(ctor, "name", { value: name, configurable: true });
  }
}
