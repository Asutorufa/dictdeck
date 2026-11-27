import {
  addToast,
  changePriority,
  countWord,
  getPriorityText,
  incrementRemindCount,
  ListWordResponse,
  Markdown,
  queryWord,
  Spoiler,
} from "@/components";
import {
  EASE_SILK,
  SPRING_DECK,
  SPRING_GENTLE,
  SPRING_SNAPPY,
} from "@/lib/motion";
import { Badge, DropdownMenu } from "@radix-ui/themes";
import {
  motion,
  MotionValue,
  PanInfo,
  useAnimation,
  useDragControls,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { useLocalStorage } from "usehooks-ts";
import { EmptyState } from "@/ui/EmptyState";
import {
  ArrowDownUp,
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Layers3,
  X,
} from "lucide-react";

const SORT_OPTIONS: [string, string][] = [
  ["word", "Word (A–Z)"],
  ["word desc", "Word (Z–A)"],
  ["priority desc", "Priority"],
  ["reminder_time", "Reminder date"],
  ["anki_count desc", "Review count"],
];

type ReviewCardMotionProps = {
  currentWord: ListWordResponse;
  page: number;
  total: number;
  revealed: boolean;
  onRevealedChange: (revealed: boolean) => void;
  dragX: MotionValue<number>;
  shouldReduceMotion: boolean | null;
  onSwipe: (action: "know" | "skip") => Promise<void>;
  onPriorityChange: (key: string) => void;
};

type ReviewCardMotionHandle = {
  swipe: (action: "know" | "skip") => Promise<void>;
};

const ReviewCardMotion = forwardRef<
  ReviewCardMotionHandle,
  ReviewCardMotionProps
>(function ReviewCardMotion(
  {
    currentWord,
    page,
    total,
    revealed,
    onRevealedChange,
    dragX,
    shouldReduceMotion,
    onSwipe,
    onPriorityChange,
  },
  ref,
) {
  const controls = useAnimation();
  const dragControls = useDragControls();
  const [copied, setCopied] = useState(false);

  const rotate = useTransform(
    dragX,
    [-220, 0, 220],
    shouldReduceMotion ? [0, 0, 0] : [-8.5, 0, 8.5],
  );
  const knowOpacity = useTransform(dragX, [40, 140], [0, 1]);
  const knowScale = useTransform(dragX, [40, 140], [0.85, 1]);
  const skipOpacity = useTransform(dragX, [-140, -40], [1, 0]);
  const skipScale = useTransform(dragX, [-140, -40], [1, 0.85]);

  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isAnimating = useRef(false);

  useEffect(() => {
    controls.stop();
    dragX.set(0);
    if (shouldReduceMotion) {
      controls.set({ x: 0, y: 0, opacity: 1, scale: 1 });
      return;
    }
    controls.set({ x: 0, y: 12, opacity: 0, scale: 0.96 });
    void controls.start({
      x: 0,
      y: 0,
      opacity: 1,
      scale: 1,
      transition: SPRING_DECK,
    });
  }, [controls, currentWord, dragX, page, shouldReduceMotion]);

  const handleSwipe = useCallback(
    async (action: "know" | "skip") => {
      if (isAnimating.current) return;
      isAnimating.current = true;

      try {
        const canAdvance = page < total;
        const exitX = action === "know" ? 540 : -540;

        if (canAdvance) {
          await controls.start({
            x: exitX,
            y: 18,
            opacity: 0,
            transition: { duration: 0.24, ease: [0.32, 0, 0.67, 0] },
          });
        } else {
          await controls.start({
            x: exitX > 0 ? 52 : -52,
            transition: { duration: 0.14, ease: EASE_SILK },
          });
        }

        await onSwipe(action);

        if (!canAdvance) {
          dragX.set(0);
          await controls.start({
            x: 0,
            y: 0,
            opacity: 1,
            scale: 1,
            transition: SPRING_DECK,
          });
        }
      } finally {
        isAnimating.current = false;
      }
    },
    [controls, dragX, onSwipe, page, total],
  );

  const handleDragEnd = async (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo,
  ) => {
    const threshold = 95;
    const velocityThreshold = 420;

    if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
      await handleSwipe("know");
    } else if (
      info.offset.x < -threshold ||
      info.velocity.x < -velocityThreshold
    ) {
      await handleSwipe("skip");
    } else {
      await controls.start({
        x: 0,
        y: 0,
        opacity: 1,
        scale: 1,
        transition: SPRING_DECK,
      });
    }
  };

  useImperativeHandle(ref, () => ({ swipe: handleSwipe }), [handleSwipe]);

  const copyWord = useCallback(() => {
    void navigator.clipboard?.writeText(currentWord.word).then(() => {
      setCopied(true);
      addToast({ title: `Copied "${currentWord.word}"`, color: "success" });
      window.setTimeout(() => setCopied(false), 1400);
    });
  }, [currentWord.word]);

  const badgeColor =
    currentWord.priority === 0
      ? "jade"
      : currentWord.priority === 1
        ? "amber"
        : "red";

  return (
    <motion.div
      animate={controls}
      drag="x"
      dragListener={false}
      dragControls={dragControls}
      dragConstraints={{ left: 0, right: 0 }}
      dragDirectionLock
      dragElastic={shouldReduceMotion ? 0.15 : 0.55}
      onDragEnd={handleDragEnd}
      style={{ x: dragX, rotate }}
      className="app-review-card-wrap"
      onTapStart={() => {
        longPressTimer.current = setTimeout(copyWord, 700);
      }}
      onTapCancel={() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }}
      onTap={() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }}
      onDragStart={() => {
        if (longPressTimer.current) clearTimeout(longPressTimer.current);
      }}
    >
      <motion.div
        className="app-review-stamp app-review-stamp--know"
        style={{ opacity: knowOpacity, scale: knowScale }}
        aria-hidden="true"
      >
        <Check size={16} strokeWidth={2.75} />
        <span>Know</span>
      </motion.div>

      <motion.div
        className="app-review-stamp app-review-stamp--skip"
        style={{ opacity: skipOpacity, scale: skipScale }}
        aria-hidden="true"
      >
        <X size={16} strokeWidth={2.75} />
        <span>Skip</span>
      </motion.div>

      <article
        className="app-review-card"
        onPointerDown={(event) => {
          const target = event.target as HTMLElement;
          if (
            target.closest(
              "a,button,input,textarea,select,[role='menuitem'],[data-radix-collection-item]",
            )
          ) {
            return;
          }
          dragControls.start(event);
        }}
      >
        <header className="app-review-card-header">
          <div>
            <h2>{currentWord.word}</h2>
            <span className="app-review-card-header-sub">
              Updated{" "}
              {new Date(currentWord.update_time * 1000).toLocaleDateString()} ·
              Reviewed {currentWord.anki_count}×
            </span>
          </div>
          <div className="app-review-card-meta">
            <span className="text-xs text-[var(--dd-color-muted)]">
              Due{" "}
              {new Date(currentWord.reminder_time * 1000).toLocaleDateString()}
            </span>
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger>
                <Badge size="1" variant="soft" color={badgeColor}>
                  {getPriorityText(currentWord.priority)}
                </Badge>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item
                  color="jade"
                  onSelect={() => onPriorityChange("0")}
                >
                  Low
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  color="amber"
                  onSelect={() => onPriorityChange("1")}
                >
                  Medium
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  color="red"
                  onSelect={() => onPriorityChange("2")}
                >
                  High
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>
        </header>

        {currentWord.example && (
          <section className="app-review-example">
            <div className="prose">
              <Markdown>{currentWord.example}</Markdown>
            </div>
          </section>
        )}

        <section className="app-review-meaning">
          <div className="app-word-section-label">Meaning</div>
          <Spoiler
            flex
            revealed={revealed}
            onRevealedChange={onRevealedChange}
            revealLabel="Reveal meaning (Space)"
            className="app-review-spoiler"
          >
            <div className="prose app-review-meaning-content">
              <Markdown>{currentWord.explain}</Markdown>
            </div>
          </Spoiler>
        </section>

        <footer className="app-review-card-footer">
          <button
            type="button"
            className="app-review-copy-btn"
            onClick={copyWord}
          >
            {copied ? <Check size={13} /> : <Copy size={13} />}
            <span>{copied ? "Copied" : "Copy headword"}</span>
          </button>
          <span className="tabular-nums">
            Card {page} of {total}
          </span>
        </footer>
      </article>
    </motion.div>
  );
});

export default function Flashcard() {
  const [page, setPage] = useLocalStorage<number>("flashcard_page_v2", 1);
  const [total, setTotal] = useLocalStorage<number>("flashcard_total_words", 0);
  const [orderBy, setOrderBy] = useLocalStorage("order_by", "word");
  const [grammar, setGrammar] = useLocalStorage("grammar", false);

  const [wordsMap, setWordsMap] = useState<Map<number, ListWordResponse>>(
    new Map(),
  );
  const [loading, setLoading] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const loadedChunksRef = useRef<Set<number>>(new Set());
  const shouldReduceMotion = useReducedMotion();

  // Shared drag value so underlying stacked cards respond smoothly in real time
  const dragX = useMotionValue(0);
  const dragAbs = useTransform(dragX, (value) =>
    Math.min(Math.abs(value), 180),
  );
  const stack1Scale = useTransform(dragAbs, [0, 180], [0.96, 1]);
  const stack1Y = useTransform(dragAbs, [0, 180], [14, 0]);
  const stack1Opacity = useTransform(dragAbs, [0, 180], [0.72, 0.96]);
  const stack2Scale = useTransform(dragAbs, [0, 180], [0.92, 0.96]);
  const stack2Y = useTransform(dragAbs, [0, 180], [28, 14]);
  const stack2Opacity = useTransform(dragAbs, [0, 180], [0.42, 0.72]);

  const CHUNK_SIZE = 10;

  const fetchChunksIfNeeded = useCallback(
    async (targetIndex: number) => {
      const targetPage = Math.ceil(targetIndex / CHUNK_SIZE);
      const neededChunks: number[] = [];

      if (!loadedChunksRef.current.has(targetPage)) {
        neededChunks.push(targetPage);
      }

      if (targetIndex % CHUNK_SIZE > 5) {
        if (!loadedChunksRef.current.has(targetPage + 1)) {
          neededChunks.push(targetPage + 1);
        }
      }

      if (neededChunks.length > 0) {
        setLoading(true);
        neededChunks.forEach((c) => loadedChunksRef.current.add(c));

        await Promise.all(
          neededChunks.map(
            (p) =>
              new Promise<void>((resolve) => {
                void queryWord(p, CHUNK_SIZE, orderBy, grammar, (data) => {
                  if (data) {
                    setWordsMap((prev) => {
                      const newMap = new Map(prev);
                      data.forEach((w, i) => {
                        const absIndex = (p - 1) * CHUNK_SIZE + 1 + i;
                        newMap.set(absIndex, w);
                      });
                      return newMap;
                    });
                  }
                  resolve();
                });
              }),
          ),
        );
        setLoading(false);
      }
    },
    [orderBy, grammar, CHUNK_SIZE],
  );

  useEffect(() => {
    setWordsMap(new Map());
    loadedChunksRef.current.clear();
  }, [fetchChunksIfNeeded]);

  useEffect(() => {
    void fetchChunksIfNeeded(page);
    setRevealed(false);
  }, [page, fetchChunksIfNeeded]);

  useEffect(() => {
    void countWord(grammar, (size) => {
      if (size === undefined) return;
      setTotal(size);
      setPage((current) => (size === 0 ? 1 : current > size ? size : current));
    });
  }, [grammar, orderBy, setPage, setTotal]);

  const currentWord = wordsMap.get(page);
  const hasNext1 = page + 1 <= total;
  const hasNext2 = page + 2 <= total;
  const reviewCardRef = useRef<ReviewCardMotionHandle>(null);

  const handleSwipe = useCallback(
    async (action: "know" | "skip") => {
      if (action === "know" && currentWord) {
        await incrementRemindCount(currentWord.word, () => {});
        setWordsMap((prev) => {
          const next = new Map(prev);
          const item = next.get(page);
          if (item) {
            next.set(page, { ...item, anki_count: item.anki_count + 1 });
          }
          return next;
        });
      }

      if (page < total) {
        setPage((p) => Math.min(p + 1, total));
      } else if (action === "know") {
        addToast({
          title: "Deck complete!",
          description: "You reached the last card in this review deck.",
          color: "success",
        });
      }
    },
    [currentWord, page, setPage, total],
  );

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if (!currentWord) return;

      if (event.code === "Space") {
        event.preventDefault();
        setRevealed((r) => !r);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        void reviewCardRef.current?.swipe("know");
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        void reviewCardRef.current?.swipe("skip");
      } else if (event.key === "Backspace" && page > 1) {
        event.preventDefault();
        setPage((p) => Math.max(1, p - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentWord, page, setPage]);

  const handlePriorityChange = (key: string) => {
    if (!currentWord) return;
    const newP = parseInt(key, 10);
    void changePriority(currentWord.word, newP, (err) => {
      if (!err) {
        setWordsMap((prev) => {
          const newMap = new Map(prev);
          const w = newMap.get(page);
          if (w) newMap.set(page, { ...w, priority: newP });
          return newMap;
        });
      }
    });
  };

  const progressRatio = total > 0 ? Math.min(page / total, 1) : 0;
  const activeSortLabel =
    SORT_OPTIONS.find(([v]) => v === orderBy)?.[1] ?? orderBy;

  return (
    <div className="app-review-page">
      <header className="app-review-header">
        <div>
          <h1 className="app-page-title">Daily review</h1>
          <p className="app-page-subtitle">
            Flip through your deck with drag gestures or keyboard shortcuts.
          </p>
        </div>

        <div className="app-review-progress">
          <div className="app-review-progress-copy">
            <strong>{total > 0 ? page : 0}</strong>
            <span>/ {total || 0} cards</span>
          </div>
          <div className="app-review-progress-track" aria-hidden="true">
            <motion.div
              className="app-review-progress-fill"
              animate={{ scaleX: progressRatio }}
              transition={SPRING_GENTLE}
            />
          </div>
        </div>
      </header>

      <div className="app-review-toolbar">
        <div className="app-review-toolbar-left">
          <div className="app-segmented" role="tablist" aria-label="Deck type">
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
                      layoutId="review-type-pill"
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

          <DropdownMenu.Root modal={false}>
            <DropdownMenu.Trigger disabled={loading && wordsMap.size === 0}>
              <button type="button" className="app-toolbar-btn">
                <ArrowDownUp size={15} />
                <span>{activeSortLabel}</span>
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Label>Sort review by</DropdownMenu.Label>
              <DropdownMenu.RadioGroup
                value={orderBy}
                onValueChange={(value) => {
                  setOrderBy(value);
                  setPage(1);
                }}
              >
                {SORT_OPTIONS.map(([value, label]) => (
                  <DropdownMenu.RadioItem key={value} value={value}>
                    {label}
                  </DropdownMenu.RadioItem>
                ))}
              </DropdownMenu.RadioGroup>
            </DropdownMenu.Content>
          </DropdownMenu.Root>
        </div>

        <div className="app-review-hints" aria-hidden="true">
          <span className="app-review-hint-item">
            <kbd className="app-kbd">Space</kbd> Reveal
          </span>
          <span className="app-review-hint-item">
            <kbd className="app-kbd">←</kbd> Skip
          </span>
          <span className="app-review-hint-item">
            <kbd className="app-kbd">→</kbd> Know
          </span>
        </div>
      </div>

      <div className="app-review-stage">
        {loading && wordsMap.size === 0 && (
          <div className="app-review-deck">
            <div className="app-skeleton-card min-h-[420px]">
              <span className="skeleton-line skeleton-line--title" />
              <span className="skeleton-line" />
              <span className="skeleton-line" />
              <span className="skeleton-line skeleton-line--short" />
            </div>
          </div>
        )}

        {!loading && wordsMap.size === 0 && (
          <EmptyState
            title="No cards to review"
            description="Save a few words first, then return here to practice."
            icon={<Layers3 size={24} />}
            actionLabel="Reload deck"
            onAction={() => setPage(1)}
          />
        )}

        {currentWord && (
          <div className="app-review-deck">
            {hasNext2 && (
              <motion.div
                className="app-review-stack-layer"
                style={{
                  zIndex: 1,
                  scale: stack2Scale,
                  y: stack2Y,
                  opacity: stack2Opacity,
                }}
                aria-hidden="true"
              />
            )}
            {hasNext1 && (
              <motion.div
                className="app-review-stack-layer"
                style={{
                  zIndex: 2,
                  scale: stack1Scale,
                  y: stack1Y,
                  opacity: stack1Opacity,
                }}
                aria-hidden="true"
              />
            )}

            <ReviewCardMotion
              key={page}
              ref={reviewCardRef}
              currentWord={currentWord}
              page={page}
              total={total}
              revealed={revealed}
              onRevealedChange={setRevealed}
              dragX={dragX}
              shouldReduceMotion={shouldReduceMotion}
              onSwipe={handleSwipe}
              onPriorityChange={handlePriorityChange}
            />
          </div>
        )}
      </div>

      {currentWord && (
        <div className="app-review-actions">
          <button
            type="button"
            className="app-review-btn app-review-btn--skip"
            onClick={() => void reviewCardRef.current?.swipe("skip")}
          >
            <X size={17} />
            <span>Skip</span>
          </button>

          <button
            type="button"
            className="app-review-btn app-review-btn--back"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            aria-label="Previous card"
            title="Previous card (Backspace)"
          >
            <ArrowLeft size={17} />
          </button>

          <button
            type="button"
            className="app-review-btn app-review-btn--know"
            onClick={() => void reviewCardRef.current?.swipe("know")}
          >
            <span>Know</span>
            <ArrowRight size={17} />
          </button>
        </div>
      )}
    </div>
  );
}
