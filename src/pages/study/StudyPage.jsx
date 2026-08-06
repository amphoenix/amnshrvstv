import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { getStudyCategories } from "./loadNotes";
import RunnableCode from "./RunnableCode";
import "./study-content.css";

const categories = getStudyCategories();

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  return isMobile;
};

const categoryEmoji = (category) => {
  const lower = category.toLowerCase();
  if (lower.includes("ai")) return "🤖";
  if (lower.includes("fe") || lower.includes("front")) return "💻";
  if (lower.includes("be") || lower.includes("back")) return "🛠️";
  return "📁";
};

const estimateReadingMinutes = (content) => {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
};

const ChevronIcon = ({ open }) => (
  <svg
    viewBox='0 0 20 20'
    className={`w-4 h-4 transition-transform duration-200 ${open ? "rotate-90" : ""}`}
    fill='none'
    stroke='currentColor'
    strokeWidth='2'
    aria-hidden='true'
  >
    <path d='M7 5l6 5-6 5' strokeLinecap='round' strokeLinejoin='round' />
  </svg>
);

const TogglePanelButton = ({ label, open, controlsId, onClick }) => (
  <button
    type='button'
    onClick={onClick}
    aria-expanded={open}
    aria-controls={controlsId}
    className='flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2'
  >
    <ChevronIcon open={open} />
    <span>{label}</span>
  </button>
);

const markdownComponents = {
  code({ className, children }) {
    const isRunnable = /language-js-run/.test(className || "");
    if (isRunnable) {
      return <RunnableCode code={String(children).replace(/\n$/, "")} />;
    }
    return <code className={className}>{children}</code>;
  },
};

const fileIdFromPath = (path) => path.split("/").pop().replace(/\.md$/, "");

const CategoryList = ({ activeCategory, onSelect }) => (
  <nav aria-label='Study categories'>
    <ul>
      {categories.map((c) => (
        <li key={c.category}>
          <button
            onClick={() => onSelect(c.category)}
            aria-current={c.category === activeCategory ? "true" : undefined}
            className={`flex items-center gap-2 w-[calc(100%-1rem)] mx-2 mb-1 text-left px-3 py-2.5 text-sm rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
              c.category === activeCategory
                ? "bg-teal-500/15 text-teal-300 font-medium"
                : "text-neutral-300 hover:bg-neutral-800 hover:text-white"
            }`}
          >
            <span aria-hidden='true'>{categoryEmoji(c.category)}</span>
            <span className='truncate'>{c.category}</span>
          </button>
        </li>
      ))}
    </ul>
  </nav>
);

const FileList = ({ files, activeFile, onSelect }) => (
  <nav aria-label='Files in category'>
    <ul>
      {files.map((file) => (
        <li key={file.path}>
          <button
            onClick={() => onSelect(file)}
            aria-current={file.path === activeFile?.path ? "true" : undefined}
            className={`block w-[calc(100%-1rem)] mx-2 mb-1 text-left px-3 py-2.5 text-sm rounded-md transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
              file.path === activeFile?.path
                ? "bg-neutral-800 text-white font-medium"
                : "text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
            }`}
          >
            {file.title}
          </button>
        </li>
      ))}
      {files.length === 0 && (
        <li className='px-4 py-2 text-sm text-neutral-500'>No files yet.</li>
      )}
    </ul>
  </nav>
);

const StudyPage = () => {
  const isMobile = useIsMobile();
  const params = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const categoriesWithIds = useMemo(
    () =>
      categories.map((c) => ({
        ...c,
        files: c.files.map((f) => ({ ...f, id: fileIdFromPath(f.path) })),
      })),
    []
  );

  const getInitialCategory = () => {
    if (params.category) {
      try {
        const decoded = decodeURIComponent(params.category);
        return categoriesWithIds.find((c) => c.category === decoded)
          ? decoded
          : categoriesWithIds[0]?.category ?? null;
      } catch (e) {
        return categoriesWithIds[0]?.category ?? null;
      }
    }
    return categoriesWithIds[0]?.category ?? null;
  };

  const getInitialFile = () => {
    const initialCat = getInitialCategory();
    const files = categoriesWithIds.find((c) => c.category === initialCat)?.files ?? [];
    if (params.fileId) {
      try {
        const decodedFileId = decodeURIComponent(params.fileId);
        return files.find((f) => f.id === decodedFileId) ?? files[0] ?? null;
      } catch (e) {
        return files[0] ?? null;
      }
    }
    return files[0] ?? null;
  };

  const [activeCategory, setActiveCategory] = useState(getInitialCategory);
  const [activeFile, setActiveFile] = useState(getInitialFile);
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [filesOpen, setFilesOpen] = useState(true);

  const filesInCategory =
    categoriesWithIds.find((c) => c.category === activeCategory)?.files ?? [];

  const readingMinutes = useMemo(
    () => (activeFile ? estimateReadingMinutes(activeFile.content) : 0),
    [activeFile]
  );

  // keep the URL in sync when user changes selection
  useEffect(() => {
    if (!activeCategory) return;
    const encodedCategory = encodeURIComponent(activeCategory);
    const encodedFileId = activeFile?.id ? `/${encodeURIComponent(activeFile.id)}` : "";
    const target = `/prep/${encodedCategory}${encodedFileId}`;
    if (location.pathname !== target) {
      // replace on initial load, push on subsequent changes
      navigate(target, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeCategory, activeFile]);

  const selectCategory = (category) => {
    setActiveCategory(category);
    const firstFile = categoriesWithIds.find((c) => c.category === category)?.files[0] ?? null;
    setActiveFile(firstFile);
    if (isMobile) setCategoriesOpen(false);
  };

  const selectFile = (file) => {
    setActiveFile(file);
    if (isMobile) setFilesOpen(false);
  };

  const toggleCategories = () =>
    setCategoriesOpen((open) => {
      const next = !open;
      if (next && isMobile) setFilesOpen(false);
      return next;
    });

  const toggleFiles = () =>
    setFilesOpen((open) => {
      const next = !open;
      if (next && isMobile) setCategoriesOpen(false);
      return next;
    });

  const header = (
    <header className='flex flex-wrap items-center gap-1 border-b border-neutral-800 bg-gradient-to-r from-neutral-900 to-neutral-950 px-3 py-2.5'>
      <TogglePanelButton
        label='Categories'
        open={categoriesOpen}
        controlsId='study-categories'
        onClick={toggleCategories}
      />
      <TogglePanelButton
        label='Files'
        open={filesOpen}
        controlsId='study-files'
        onClick={toggleFiles}
      />
      <h1 className='ml-2 min-w-0 flex-1 truncate text-sm font-medium text-neutral-200'>
        {activeFile?.title ?? "Study Notes"}
      </h1>
      {activeFile && (
        <span className='flex-shrink-0 text-xs text-neutral-500'>
          ~{readingMinutes} min read
        </span>
      )}
    </header>
  );

  const content = (
    <main
      id='study-main-content'
      tabIndex={-1}
      className='study-content flex-1 overflow-y-auto overflow-x-hidden px-4 sm:px-10 py-6 sm:py-10'
    >
      <div className='max-w-3xl mx-auto w-full rounded-2xl border border-neutral-800 bg-neutral-900/60 px-4 sm:px-10 py-6 sm:py-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)]'>
        {activeFile ? (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
            {activeFile.content}
          </ReactMarkdown>
        ) : (
          <p className='text-neutral-400'>
            No notes yet — add .md files under src/study/&lt;Category&gt;.
          </p>
        )}
      </div>
    </main>
  );

  if (isMobile) {
    return (
      <div className='flex flex-col min-h-screen bg-neutral-950 text-neutral-100'>
        {header}
        {categoriesOpen && (
          <div
            id='study-categories'
            aria-label='Categories'
            className='w-full max-h-[45vh] overflow-y-auto border-b border-neutral-800 bg-neutral-900 py-4'
          >
            <p className='px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500'>
              Categories
            </p>
            <CategoryList activeCategory={activeCategory} onSelect={selectCategory} />
          </div>
        )}
        {filesOpen && (
          <div
            id='study-files'
            aria-label='Files'
            className='w-full max-h-[45vh] overflow-y-auto border-b border-neutral-800 bg-neutral-900 py-4'
          >
            <p className='px-4 pb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 truncate'>
              {activeCategory ? `${categoryEmoji(activeCategory)} ${activeCategory}` : "Files"}
            </p>
            <FileList files={filesInCategory} activeFile={activeFile} onSelect={selectFile} />
          </div>
        )}
        {content}
      </div>
    );
  }

  return (
    <div className='flex min-h-screen bg-neutral-950 text-neutral-100'>
      <aside
        id='study-categories'
        aria-label='Categories'
        aria-hidden={!categoriesOpen}
        className={`flex-shrink-0 border-r border-neutral-800 bg-neutral-900 overflow-hidden transition-[width] duration-200 ${
          categoriesOpen ? "w-56" : "w-0 border-r-0"
        }`}
      >
        <div className='w-56 py-4'>
          <div className='px-4 pb-3'>
            <p className='text-sm font-semibold text-white'>📚 Study Notes</p>
            <p className='text-xs text-neutral-500'>Personal reading room</p>
          </div>
          <p className='px-4 pb-2 pt-2 text-xs font-semibold uppercase tracking-wider text-neutral-500'>
            Categories
          </p>
          <CategoryList activeCategory={activeCategory} onSelect={selectCategory} />
        </div>
      </aside>

      <aside
        id='study-files'
        aria-label='Files'
        aria-hidden={!filesOpen}
        className={`flex-shrink-0 border-r border-neutral-800 overflow-y-auto transition-[width] duration-200 ${
          filesOpen ? "w-64" : "w-0 border-r-0"
        }`}
      >
        <div className='w-64 py-4'>
          <p className='px-4 pb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 truncate'>
            {activeCategory ? `${categoryEmoji(activeCategory)} ${activeCategory}` : "Files"}
          </p>
          <FileList files={filesInCategory} activeFile={activeFile} onSelect={selectFile} />
        </div>
      </aside>

      <div className='flex-1 flex flex-col min-w-0'>
        {header}
        {content}
      </div>
    </div>
  );
};

export default StudyPage;
