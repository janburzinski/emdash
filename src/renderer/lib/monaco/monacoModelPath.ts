export function buildMonacoModelPath(rootPath: string, filePath: string): string {
  const normalizedRoot = rootPath.replace(/\\/g, '/').replace(/\/+$/g, '');
  const normalizedFile = filePath.replace(/\\/g, '/').replace(/^\/+/g, '');
  const joined = `${normalizedRoot}/${normalizedFile}`.replace(/\/{2,}/g, '/');
  const absolute = joined.startsWith('/') ? joined : `/${joined}`;
  const encodedPath = absolute
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/');
  return `file://${encodedPath}`;
}
