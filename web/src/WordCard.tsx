import {
  addToast,
  changePriority,
  getPriorityText,
  incrementRemindCount,
  ListWordResponse,
  Markdown,
  Spoiler,
} from "@/components";
import { EASE_SILK, SPRING_SNAPPY } from "@/lib/motion";
import { Badge, DropdownMenu, Tooltip } from "@radix-ui/themes";
import { BookOpenCheck, Check, Copy, Pencil, Trash2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";

interface WordCardProps {
  word: ListWordResponse;
  quizMode: boolean;
  revealed: boolean;
  onRevealedChange: (revealed: boolean) => void;
  onEdit: () => void;
  onDelete: () => void;
  onWordUpdate: (updatedWord: ListWordResponse) => void;
}

export default function WordCard({
  word,
  quizMode,
  revealed,
  onRevealedChange,
  onEdit,
  onDelete,
  onWordUpdate,
}: WordCardProps) {
  const [loading, setLoading] = useState(false);
  const [isIncrementing, setIsIncrementing] = useState(false);
  const [copied, setCopied] = useState(false);

  const handlePriorityChange = async (key: string) => {
    const priority = Number.parseInt(key, 10);
    if (priority === word.priority) return;
    setLoading(true);
    await changePriority(word.word, priority, (error) => {
      setLoading(false);
      if (!error) onWordUpdate({ ...word, priority });
    });
  };

  const handleIncrement = async () => {
    if (isIncrementing) return;
    setIsIncrementing(true);
    await incrementRemindCount(word.word, (error) => {
      setIsIncrementing(false);
      if (!error) onWordUpdate({ ...word, anki_count: word.anki_count + 1 });
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard?.writeText(word.word);
      setCopied(true);
      addToast({ title: `Copied "${word.word}"`, color: "success" });
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      addToast({ title: "Could not copy word", color: "warning" });
    }
  };

  const badgeColor =
    word.priority === 0 ? "jade" : word.priority === 1 ? "amber" : "red";

  return (
    <motion.article
      key={word.word}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: EASE_SILK }}
      className="app-vocab-detail"
    >
      <header className="app-vocab-detail-header">
        <div className="app-vocab-detail-title-wrap">
          <div className="app-vocab-detail-title-row">
            <span
              className={`app-priority-dot app-priority-dot--${word.priority}`}
              aria-hidden="true"
            />
            <h2 className="app-vocab-detail-headword">{word.word}</h2>
            <DropdownMenu.Root modal={false}>
              <DropdownMenu.Trigger disabled={loading}>
                <Badge size="2" variant="soft" color={badgeColor}>
                  {getPriorityText(word.priority)}
                </Badge>
              </DropdownMenu.Trigger>
              <DropdownMenu.Content>
                <DropdownMenu.Item
                  color="jade"
                  onSelect={() => void handlePriorityChange("0")}
                >
                  Low
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  color="amber"
                  onSelect={() => void handlePriorityChange("1")}
                >
                  Medium
                </DropdownMenu.Item>
                <DropdownMenu.Item
                  color="red"
                  onSelect={() => void handlePriorityChange("2")}
                >
                  High
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Root>
          </div>

          <div className="app-vocab-detail-meta">
            <span>
              Updated{" "}
              {new Date(word.update_time * 1000).toLocaleDateString(undefined, {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            <span>·</span>
            <span>
              Next review{" "}
              <strong className="font-semibold text-[var(--dd-color-text)]">
                {new Date(word.reminder_time * 1000).toLocaleDateString()}
              </strong>
            </span>
          </div>
        </div>

        <div className="app-vocab-detail-actions">
          <Tooltip content="Mark as reviewed (R)">
            <button
              type="button"
              className="app-word-review-btn"
              onClick={() => void handleIncrement()}
              disabled={isIncrementing}
            >
              <BookOpenCheck size={14} />
              <span>Reviewed</span>
              <span className="app-word-review-count">
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={word.anki_count}
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -10, opacity: 0 }}
                    transition={SPRING_SNAPPY}
                  >
                    {word.anki_count}
                  </motion.span>
                </AnimatePresence>
              </span>
            </button>
          </Tooltip>

          <button
            type="button"
            className="app-lexicon-btn app-lexicon-btn--icon"
            onClick={() => void handleCopy()}
            aria-label="Copy headword"
            title="Copy headword"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </button>

          <button
            type="button"
            className="app-lexicon-btn app-lexicon-btn--icon"
            onClick={onEdit}
            aria-label={`Edit ${word.word}`}
            title="Edit entry (E)"
          >
            <Pencil size={14} />
          </button>

          <button
            type="button"
            className="dd-button dd-button--sm dd-button--icon dd-button--danger"
            onClick={onDelete}
            aria-label={`Delete ${word.word}`}
            title="Delete entry"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </header>

      {word.example && (
        <section className="app-vocab-detail-example">
          <div className="prose">
            <Markdown>{word.example}</Markdown>
          </div>
        </section>
      )}

      <section className="app-vocab-detail-body">
        <div className="app-vocab-detail-section-head">
          <span className="app-word-section-label">Explanation & notes</span>
          {quizMode && (
            <span className="text-xs text-[var(--dd-color-muted)]">
              Self-test veil active
            </span>
          )}
        </div>

        {quizMode ? (
          <Spoiler
            flex
            revealed={revealed}
            onRevealedChange={onRevealedChange}
            revealLabel="Reveal explanation (Space)"
            className="app-vocab-detail-spoiler"
          >
            <div className="prose">
              <Markdown>{word.explain}</Markdown>
            </div>
          </Spoiler>
        ) : (
          <div className="prose">
            <Markdown>{word.explain}</Markdown>
          </div>
        )}
      </section>

      <footer className="app-vocab-detail-footer">
        <div className="app-review-hints" aria-hidden="true">
          <span className="app-review-hint-item">
            <kbd className="app-kbd">↑</kbd>
            <kbd className="app-kbd">↓</kbd> Navigate
          </span>
          {quizMode && (
            <span className="app-review-hint-item">
              <kbd className="app-kbd">Space</kbd> Reveal
            </span>
          )}
          <span className="app-review-hint-item">
            <kbd className="app-kbd">R</kbd> Reviewed
          </span>
          <span className="app-review-hint-item">
            <kbd className="app-kbd">E</kbd> Edit
          </span>
        </div>
        <span>{word.type === 1 ? "Grammar note" : "Vocabulary entry"}</span>
      </footer>
    </motion.article>
  );
}
