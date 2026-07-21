export function titleFromFilename(filename) {
  const base = filename.replace(/\.md$/, "");

  return base
    .split(/[-_]+/)
    .filter(Boolean)
    .map((word) =>
      word === word.toUpperCase() ? word : word[0].toUpperCase() + word.slice(1).toLowerCase()
    )
    .join(" ");
}

export function categoryFromPath(path) {
  const match = path.match(/\/src\/study\/([^/]+)\//);
  return match ? match[1] : "Uncategorized";
}

export function buildCategories(globResult) {
  const byCategory = new Map();

  for (const [path, content] of Object.entries(globResult)) {
    const category = categoryFromPath(path);
    const filename = path.split("/").pop();
    const title = titleFromFilename(filename);

    if (!byCategory.has(category)) {
      byCategory.set(category, []);
    }
    byCategory.get(category).push({ title, path, content });
  }

  return Array.from(byCategory.entries())
    .map(([category, files]) => ({
      category,
      files: files.sort((a, b) => a.title.localeCompare(b.title)),
    }))
    .sort((a, b) => a.category.localeCompare(b.category));
}

export function getStudyCategories() {
  const globResult = import.meta.glob("/src/study/**/*.md", {
    eager: true,
    query: "?raw",
    import: "default",
  });
  return buildCategories(globResult);
}
