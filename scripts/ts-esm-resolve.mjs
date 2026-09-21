export async function resolve(specifier, context, nextResolve) {
  if (specifier.startsWith(".") && specifier.endsWith(".js")) {
    try {
      return await nextResolve(specifier.replace(/\.js$/, ".ts"), context);
    } catch {
      // fall through to the original .js specifier
    }
  }
  return nextResolve(specifier, context);
}
