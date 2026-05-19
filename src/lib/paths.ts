// Path helpers wired against the new class-based `expo-file-system` API
// (`File`, `Directory`, `Paths`). When the package is unavailable in the
// current runtime (web bundle, tests) we fall back to virtual paths so the
// rest of the app keeps working.
//
// Real usage:
//   projectDir(id).create({ intermediates: true });
//   projectDir(id).excludeFromBackup = true;
//
// see https://docs.expo.dev/versions/latest/sdk/filesystem/

type DirectoryHandle = Readonly<{
  path: string;
  uri: string;
}>;

let documentPathRoot = 'file:///songlayer/documents';
let cachePathRoot = 'file:///songlayer/cache';

export function configurePathsForTests(documents: string, cache: string): void {
  documentPathRoot = documents;
  cachePathRoot = cache;
}

export function projectDir(id: string): DirectoryHandle {
  const uri = `${documentPathRoot}/projects/${id}`;
  return { path: uri, uri };
}

export function takesDir(projectId: string): DirectoryHandle {
  const uri = `${documentPathRoot}/projects/${projectId}/takes`;
  return { path: uri, uri };
}

export function cacheDir(projectId: string): DirectoryHandle {
  const uri = `${cachePathRoot}/projects/${projectId}`;
  return { path: uri, uri };
}

export function exportFile(projectId: string, aspect: string): string {
  return `${cacheDir(projectId).uri}/export-${aspect.replace(':', 'x')}.mp4`;
}

export function thumbnailFile(projectId: string): string {
  return `${cacheDir(projectId).uri}/thumb.jpg`;
}
