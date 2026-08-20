const UUID_V7_PATTERN =
  /^([0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})_(.+)$/i;

export type ParsedFileName = {
  uuid: string;
  slug: string;
};

export function buildFileName(uuid: string, slug: string): string {
  return `${uuid}_${slug}.ts`;
}

export function parseFileName(fileName: string): ParsedFileName | null {
  const baseName = fileName.replace(/\.ts$/, "");
  const match = baseName.match(UUID_V7_PATTERN);

  if (!match?.[1] || !match[2]) {
    return null;
  }

  return {
    uuid: match[1].toLowerCase(),
    slug: match[2],
  };
}

export function slugify(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");

  if (!slug) {
    throw new Error("Name must contain at least one alphanumeric character");
  }

  return slug;
}
