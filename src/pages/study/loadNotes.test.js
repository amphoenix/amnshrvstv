import { describe, it, expect } from "vitest";
import { titleFromFilename, categoryFromPath, buildCategories } from "./loadNotes";

describe("titleFromFilename", () => {
  it("title-cases a simple filename", () => {
    expect(titleFromFilename("hooks.md")).toBe("Hooks");
  });

  it("splits on hyphens", () => {
    expect(titleFromFilename("rag-pipelines.md")).toBe("Rag Pipelines");
  });

  it("splits on underscores", () => {
    expect(titleFromFilename("multi_agent_systems.md")).toBe("Multi Agent Systems");
  });

  it("preserves all-caps words as acronyms", () => {
    expect(titleFromFilename("RAG-basics.md")).toBe("RAG Basics");
  });
});

describe("categoryFromPath", () => {
  it("extracts the folder name under src/study", () => {
    expect(categoryFromPath("/src/study/FE Materials/hooks.md")).toBe("FE Materials");
  });

  it("falls back to Uncategorized when the pattern doesn't match", () => {
    expect(categoryFromPath("/src/other/file.md")).toBe("Uncategorized");
  });
});

describe("buildCategories", () => {
  it("groups files by category and sorts categories and files alphabetically", () => {
    const globResult = {
      "/src/study/FE Materials/hooks.md": "# Hooks",
      "/src/study/AI Materials/rag-pipelines.md": "# RAG",
      "/src/study/AI Materials/agents.md": "# Agents",
    };

    const result = buildCategories(globResult);

    expect(result).toEqual([
      {
        category: "AI Materials",
        files: [
          { title: "Agents", path: "/src/study/AI Materials/agents.md", content: "# Agents" },
          { title: "Rag Pipelines", path: "/src/study/AI Materials/rag-pipelines.md", content: "# RAG" },
        ],
      },
      {
        category: "FE Materials",
        files: [
          { title: "Hooks", path: "/src/study/FE Materials/hooks.md", content: "# Hooks" },
        ],
      },
    ]);
  });

  it("returns an empty array for an empty glob result", () => {
    expect(buildCategories({})).toEqual([]);
  });
});
