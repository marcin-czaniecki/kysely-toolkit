import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

export const MODULE_EXTENSIONS = [".mts", ".ts", ".mjs", ".js", ".cts", ".cjs"] as const;

export function hasModuleExtension(fileName: string): boolean {
  if (fileName.endsWith(".d.ts") || fileName.endsWith(".d.mts") || fileName.endsWith(".d.cts")) {
    return false;
  }

  return MODULE_EXTENSIONS.some((extension) => fileName.endsWith(extension));
}

export function stripModuleExtension(fileName: string): string {
  for (const extension of MODULE_EXTENSIONS) {
    if (fileName.endsWith(extension)) {
      return fileName.slice(0, -extension.length);
    }
  }

  return fileName;
}

export function toModuleUrl(filePath: string): string {
  return pathToFileURL(path.resolve(filePath)).href;
}

function displayPath(filePathOrUrl: string): string {
  if (filePathOrUrl.startsWith("file:")) {
    try {
      return fileURLToPath(filePathOrUrl);
    } catch {
      return filePathOrUrl;
    }
  }

  return filePathOrUrl;
}

export async function loadUserModule(filePathOrUrl: string): Promise<Record<string, unknown>> {
  const href = filePathOrUrl.startsWith("file:") ? filePathOrUrl : toModuleUrl(filePathOrUrl);

  try {
    return await import(href);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Failed to load ${displayPath(filePathOrUrl)}. ` +
        "Config, migrations, and seeds are loaded with Node's native TypeScript type stripping. " +
        "Requires Node.js >= 22.18, erasable TypeScript syntax (prefer `import type`), " +
        "and ESM modules (generated files use `.mts`). " +
        `Original error: ${detail}`,
      { cause: error },
    );
  }
}
