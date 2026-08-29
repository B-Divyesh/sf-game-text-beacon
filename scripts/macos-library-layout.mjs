import { dirname, join, normalize } from 'node:path'

// Homebrew's libwebpmux records libsharpyuv as an @rpath dependency. The
// runtime loader will look in our copied library directory, but the packager
// must first find that dependency beside the originating Homebrew library.
// Keep this resolution separate so it has a portable regression test.
export const macDependencyCandidates = ({ dependency, libraryPath }) => {
  const libraryDirectory = dirname(libraryPath)
  const candidates = dependency.startsWith('@rpath/')
    ? [join(libraryDirectory, dependency.slice('@rpath/'.length))]
    : dependency.startsWith('@loader_path/')
      ? [join(libraryDirectory, dependency.slice('@loader_path/'.length))]
      : dependency.startsWith('/')
        ? [dependency]
        : []

  return [...new Set(candidates.map((candidate) => normalize(candidate)))]
}
