import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export function Pager({
  page,
  total,
  onPageChange,
}: {
  page: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  const safeTotal = useMemo(() => Math.max(1, total || 1), [total]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(page));
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setDraft(String(page));
  }, [page]);

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [editing]);

  const commit = () => {
    setEditing(false);
    const n = Number.parseInt(draft, 10);
    if (Number.isNaN(n)) {
      setDraft(String(page));
      return;
    }
    const clamped = Math.min(safeTotal, Math.max(1, n));
    setDraft(String(clamped));
    if (clamped !== page) onPageChange(clamped);
  };

  return (
    <div className="app-pager-wrap">
      <nav className="app-pager" aria-label="Vocabulary pages">
        <button
          type="button"
          className="app-pager-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(1)}
          aria-label="First page"
          title="First page"
        >
          <ChevronsLeft size={16} />
        </button>
        <button
          type="button"
          className="app-pager-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          aria-label="Previous page"
          title="Previous page"
        >
          <ChevronLeft size={16} />
        </button>

        {editing ? (
          <div className="app-pager-status">
            <span>Page</span>
            <input
              ref={inputRef}
              className="app-pager-input"
              inputMode="numeric"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commit}
              onKeyDown={(e) => {
                if (e.key === "Enter") commit();
                if (e.key === "Escape") {
                  setDraft(String(page));
                  setEditing(false);
                }
              }}
              aria-label="Jump to page number"
            />
            <span>of {safeTotal}</span>
          </div>
        ) : (
          <button
            type="button"
            className="app-pager-status"
            onClick={() => setEditing(true)}
            title="Click to jump to a specific page"
          >
            <span>Page</span>
            <strong>{page}</strong>
            <span>of {safeTotal}</span>
          </button>
        )}

        <button
          type="button"
          className="app-pager-btn"
          disabled={page >= safeTotal}
          onClick={() => onPageChange(page + 1)}
          aria-label="Next page"
          title="Next page"
        >
          <ChevronRight size={16} />
        </button>
        <button
          type="button"
          className="app-pager-btn"
          disabled={page >= safeTotal}
          onClick={() => onPageChange(safeTotal)}
          aria-label="Last page"
          title="Last page"
        >
          <ChevronsRight size={16} />
        </button>
      </nav>
    </div>
  );
}
