import {
  ConfirmModal,
  countWord,
  deleteWord,
  incrementRemindCount,
  ListWordResponse,
  queryWord,
  SaveWordModal,
} from "@/components";
import { SPRING_SNAPPY } from "@/lib/motion";
import WordCard from "@/WordCard";
import { DropdownMenu } from "@radix-ui/themes";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import { EmptyState } from "@/ui/EmptyState";
import { PageContainer } from "@/ui/PageContainer";
import { PageHeader } from "@/ui/PageHeader";
import { Pager } from "@/ui/Pager";
import {
  ArrowDownUp,
  ArrowLeft,
  BookOpen,
  ChevronRight,
  Eye,
  EyeOff,
  Plus,
  RefreshCw,
  Search,
  X,
} from "lucide-react";

const createEmptyWord = (): ListWordResponse => ({
  word: "",
  example: "",
  explain: "",
  add_time: 0,
  update_time: 0,
  reminder_time: 0,
  anki_count: 0,
  priority: 0,
  type: 0,
});

const SORT_LABELS: Record<string, string> = {
  word: "Word (A–Z)",
  "word desc": "Word (Z–A)",
  "priority desc": "Priority",
  "add_time desc": "Recently added",
  "anki_count desc": "Most reviewed",
};

function stripPreviewText(text: string): string {
  return text
    .replace(/<[^>]+>/g, " ")
    .replace(/[#*_`>[\]()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function Words() {
  const [words, setWords] = useState<ListWordResponse[]>([]);
  const [page, setPage] = useLocalStorage<number>("page", 1);
  const [total, setTotal] = useLocalStorage<number>("words_total_pages", 1);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [removeWord, setRemoveWord] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState("");
  const [selectedWordKey, setSelectedWordKey] = useState<string | null>(null);
  const [mobileReaderOpen, setMobileReaderOpen] = useState(false);
  const [quizMode, setQuizMode] = useLocalStorage("vocab_hide_explain", true);
  const [detailRevealed, setDetailRevealed] = useState(false);
  const [newWord, setNewWord] = useState<{
    origin?: string;
    new: ListWordResponse;
  }>({
    new: createEmptyWord(),
  });
  const [orderBy, setOrderBy] = useLocalStorage("order_by", "word");
  const [grammar, setGrammar] = useLocalStorage("grammar", false);

  useEffect(() => {
    void countWord(grammar, (size) => {
      if (size !== undefined) {
        const totalPages = Math.ceil(size / 10);
        const safeTotalPages = Math.max(totalPages, 1);
        setTotal(safeTotalPages);
        if (page > safeTotalPages) setPage(safeTotalPages);
      }
    });
  }, [refresh, grammar, page, setPage, setTotal]);

  useEffect(() => {
    setLoading(true);
    void queryWord(page, 10, orderBy, grammar, (data) => {
      if (data) {
        setWords(data);
      }
      setLoading(false);
    });
  }, [page, orderBy, refresh, grammar]);

  const openNewWord = () => {
    setNewWord({ new: createEmptyWord() });
    setOpen(true);
  };

  const handleWordUpdate = useCallback(
    (index: number, updatedWord: ListWordResponse) => {
      setWords((prev) => {
        const newWords = [...prev];
        newWords[index] = updatedWord;
        return newWords;
      });
    },
    [],
  );

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleWords = useMemo(
    () =>
      words
        .map((word, index) => ({ word, index }))
        .filter(({ word }) => {
          return (
            word.word &&
            word.word.length > 0 &&
            (!normalizedSearch ||
              `${word.word} ${word.example} ${word.explain}`
                .toLocaleLowerCase()
                .includes(normalizedSearch))
          );
        }),
    [words, normalizedSearch],
  );

  // Keep a valid selected entry whenever the visible list changes
  const activeEntry = useMemo(() => {
    if (visibleWords.length === 0) return null;
    const found = visibleWords.find(
      ({ word }) => word.word === selectedWordKey,
    );
    return found ?? visibleWords[0];
  }, [visibleWords, selectedWordKey]);

  const activeWordName = activeEntry?.word.word ?? null;

  // Reset quiz reveal when moving to another entry
  useEffect(() => {
    setDetailRevealed(false);
  }, [activeWordName, quizMode]);

  // Keyboard navigation for fast study & review
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        open ||
        confirmOpen ||
        (target &&
          (target.tagName === "INPUT" ||
            target.tagName === "TEXTAREA" ||
            target.isContentEditable))
      ) {
        return;
      }
      if (!activeEntry || visibleWords.length === 0) return;

      const currentPos = visibleWords.findIndex(
        ({ word }) => word.word === activeEntry.word.word,
      );

      if (event.key === "ArrowDown" || event.key === "j") {
        event.preventDefault();
        const next = visibleWords[(currentPos + 1) % visibleWords.length];
        setSelectedWordKey(next.word.word);
      } else if (event.key === "ArrowUp" || event.key === "k") {
        event.preventDefault();
        const prev =
          visibleWords[
            (currentPos - 1 + visibleWords.length) % visibleWords.length
          ];
        setSelectedWordKey(prev.word.word);
      } else if (event.code === "Space" && quizMode) {
        event.preventDefault();
        setDetailRevealed((r) => !r);
      } else if (
        event.key.toLowerCase() === "r" &&
        !event.metaKey &&
        !event.ctrlKey
      ) {
        event.preventDefault();
        void incrementRemindCount(activeEntry.word.word, (err) => {
          if (!err) {
            handleWordUpdate(activeEntry.index, {
              ...activeEntry.word,
              anki_count: activeEntry.word.anki_count + 1,
            });
          }
        });
      } else if (
        event.key.toLowerCase() === "e" &&
        !event.metaKey &&
        !event.ctrlKey
      ) {
        event.preventDefault();
        setNewWord({ origin: activeEntry.word.word, new: activeEntry.word });
        setOpen(true);
      } else if (event.key === "Escape" && mobileReaderOpen) {
        setMobileReaderOpen(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeEntry,
    confirmOpen,
    handleWordUpdate,
    mobileReaderOpen,
    open,
    quizMode,
    visibleWords,
  ]);

  return (
    <div className="app-library-page">
      <ConfirmModal
        title={`Are you sure you want to delete ${removeWord}?`}
        open={confirmOpen}
        color="danger"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onChange={(p) => setConfirmOpen(p)}
        onConfirm={async () => {
          if (removeWord) {
            await deleteWord(removeWord, (error) => {
              if (!error) {
                setMobileReaderOpen(false);
                setRefresh((value) => value + 1);
              }
            });
          }
        }}
      />

      <SaveWordModal
        open={open}
        onChange={(p) => setOpen(p)}
        word={newWord.new.word}
        explain={newWord.new.explain}
        example={newWord.new.example}
        type={newWord.new.type}
        origin={newWord.origin}
        onSaved={() => {
          setRefresh((value) => value + 1);
        }}
      />

      <PageContainer>
        <PageHeader
          title="Vocabulary"
          subtitle="Recall first on the left, then reveal full explanations when needed on the right."
          actions={
            <button
              type="button"
              className="app-primary-action"
              onClick={openNewWord}
            >
              <Plus size={16} />
              Add word
            </button>
          }
        />

        <div className="app-library-toolbar">
          <label className="app-search-field">
            <Search size={16} aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Filter current page…"
              aria-label="Find a saved word"
            />
            {search && (
              <button
                type="button"
                className="app-word-more"
                onClick={() => setSearch("")}
                aria-label="Clear filter"
              >
                <X size={14} />
              </button>
            )}
          </label>

          <div className="app-library-toolbar-actions">
            <div
              className="app-segmented"
              role="tablist"
              aria-label="Entry type"
            >
              {(
                [
                  { key: false, label: "Words" },
                  { key: true, label: "Grammar" },
                ] as const
              ).map((tab) => {
                const isActive = grammar === tab.key;
                return (
                  <button
                    key={String(tab.key)}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    className={`app-segmented-btn${isActive ? " is-active" : ""}`}
                    onClick={() => {
                      setGrammar(tab.key);
                      setPage(1);
                    }}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="vocab-type-pill"
                        className="app-segmented-pill"
                        transition={SPRING_SNAPPY}
                        aria-hidden="true"
                      />
                    )}
                    {tab.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              className={`app-toolbar-btn${quizMode ? " is-active" : ""}`}
              onClick={() => setQuizMode((v) => !v)}
              aria-pressed={quizMode}
              title={
                quizMode
                  ? "Explanations are hidden by default — click to always show"
                  : "Explanations are visible — click to hide by default for recall"
              }
            >
              {quizMode ? <EyeOff size={15} /> : <Eye size={15} />}
              <span>{quizMode ? "Hide meaning" : "Show meaning"}</span>
            </button>

            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger>
                <button type="button" className="app-toolbar-btn">
                  <ArrowDownUp size={15} />
                  <span>{SORT_LABELS[orderBy] || "Sort"}</span>
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Label>Sort by</DropdownMenu.Label>
                <DropdownMenu.RadioGroup
                  value={orderBy}
                  onValueChange={setOrderBy}
                >
                  <DropdownMenu.RadioItem value="word">
                    Word (A–Z)
                  </DropdownMenu.RadioItem>
                  <DropdownMenu.RadioItem value="word desc">
                    Word (Z–A)
                  </DropdownMenu.RadioItem>
                  <DropdownMenu.RadioItem value="priority desc">
                    Priority
                  </DropdownMenu.RadioItem>
                  <DropdownMenu.RadioItem value="add_time desc">
                    Recently added
                  </DropdownMenu.RadioItem>
                  <DropdownMenu.RadioItem value="anki_count desc">
                    Most reviewed
                  </DropdownMenu.RadioItem>
                </DropdownMenu.RadioGroup>
              </DropdownMenu.Content>
            </DropdownMenu.Root>

            <button
              type="button"
              className="app-toolbar-btn app-toolbar-btn--icon"
              onClick={() => setRefresh((r) => r + 1)}
              aria-label="Refresh vocabulary"
              title="Refresh"
            >
              <RefreshCw
                size={15}
                className={loading ? "animate-spin" : undefined}
              />
            </button>
          </div>
        </div>

        {loading && words.length === 0 ? (
          <div className="app-vocab-workbench" aria-label="Loading words">
            <div className="app-vocab-index-card p-3">
              <div className="grid gap-3">
                {[0, 1, 2, 3].map((slot) => (
                  <div key={slot} className="grid gap-2 p-2">
                    <span className="skeleton-line skeleton-line--title" />
                    <span className="skeleton-line skeleton-line--short" />
                  </div>
                ))}
              </div>
            </div>
            <div className="app-skeleton-card min-h-[460px]">
              <span className="skeleton-line skeleton-line--title" />
              <span className="skeleton-line" />
              <span className="skeleton-line" />
              <span className="skeleton-line skeleton-line--short" />
            </div>
          </div>
        ) : visibleWords.length === 0 ? (
          <EmptyState
            title={
              normalizedSearch ? "No matching words" : "Your notebook is empty"
            }
            description={
              normalizedSearch
                ? "Try another search term or clear the filter."
                : "Save words from the dictionary desk or add your first entry here."
            }
            icon={<BookOpen size={24} />}
            actionLabel={normalizedSearch ? "Clear filter" : "Add first word"}
            onAction={normalizedSearch ? () => setSearch("") : openNewWord}
          />
        ) : (
          <div className="app-vocab-workbench">
            <div className="app-vocab-index-col">
              <div className="app-vocab-index-card">
                <div className="app-vocab-index-head">
                  <span>
                    {grammar ? "Grammar notes" : "Lexicon index"} · Page {page}{" "}
                    of {total || 1}
                  </span>
                  <span>
                    {visibleWords.length}{" "}
                    {normalizedSearch ? "matching" : "entries"}
                  </span>
                </div>

                <div
                  className="app-vocab-list"
                  role="listbox"
                  aria-label="Saved words"
                >
                  {visibleWords.map(({ word: w }) => {
                    const isSelected = activeWordName === w.word;
                    const preview = stripPreviewText(
                      quizMode ? w.example : w.example || w.explain,
                    );
                    return (
                      <button
                        key={w.word}
                        type="button"
                        role="option"
                        aria-selected={isSelected}
                        className={`app-vocab-row${isSelected ? " is-selected" : ""}`}
                        onClick={() => {
                          setSelectedWordKey(w.word);
                          setMobileReaderOpen(true);
                        }}
                      >
                        {isSelected && (
                          <>
                            <motion.span
                              layoutId="vocab-active-row"
                              className="app-vocab-row-highlight"
                              transition={SPRING_SNAPPY}
                              aria-hidden="true"
                            />
                            <motion.span
                              layoutId="vocab-active-bar"
                              className="app-vocab-row-bar"
                              transition={SPRING_SNAPPY}
                              aria-hidden="true"
                            />
                          </>
                        )}

                        <div className="app-vocab-row-main">
                          <div className="app-vocab-row-title">
                            <span
                              className={`app-priority-dot app-priority-dot--${w.priority}`}
                              aria-hidden="true"
                            />
                            <span className="app-vocab-row-word">{w.word}</span>
                          </div>
                          {preview && (
                            <div className="app-vocab-row-preview">
                              {preview}
                            </div>
                          )}
                        </div>

                        <div className="app-vocab-row-aside">
                          <span className="app-vocab-row-count">
                            {w.anki_count}×
                          </span>
                          <ChevronRight size={14} className="opacity-50" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {(total || 1) > 1 && (
                <Pager
                  page={page}
                  total={total || 1}
                  onPageChange={(p) => setPage(p)}
                />
              )}
            </div>

            <div
              className={`app-vocab-reader-col${mobileReaderOpen ? " is-mobile-open" : ""}`}
            >
              <button
                type="button"
                className="app-toolbar-btn app-vocab-mobile-close"
                onClick={() => setMobileReaderOpen(false)}
              >
                <ArrowLeft size={15} />
                <span>Back to list</span>
              </button>

              <AnimatePresence mode="wait">
                {activeEntry && (
                  <WordCard
                    key={activeEntry.word.word}
                    word={activeEntry.word}
                    quizMode={quizMode}
                    revealed={detailRevealed}
                    onRevealedChange={setDetailRevealed}
                    onEdit={() => {
                      setNewWord({
                        origin: activeEntry.word.word,
                        new: activeEntry.word,
                      });
                      setOpen(true);
                    }}
                    onDelete={() => {
                      setRemoveWord(activeEntry.word.word);
                      setConfirmOpen(true);
                    }}
                    onWordUpdate={(updated) =>
                      handleWordUpdate(activeEntry.index, updated)
                    }
                  />
                )}
              </AnimatePresence>
            </div>
          </div>
        )}
      </PageContainer>
    </div>
  );
}
