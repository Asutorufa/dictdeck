import { authorizedRequest, streamRequest } from "@/lib/api";
import {
  BUILTIN_METHODS,
  DEFAULT_METHOD,
  DEFAULT_SEARCH_ENGINE,
  LANGUAGES,
  PROMPT_MODES,
  SEARCH_ENGINES,
  buildTranslationQueryBody,
  customMethodValue,
  legacyCustomMethodValue,
  methodLabel,
  parseCustomMethod,
  type CustomLLM,
  type PromptMode,
} from "@/lib/translation";
import {
  EASE_SILK,
  SPRING_GENTLE,
  fadeUpItem,
  staggerContainer,
} from "@/lib/motion";
import { DropdownMenu, Switch, TextArea } from "@radix-ui/themes";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocalStorage } from "usehooks-ts";
import {
  addToast,
  listModel as listModels,
  Markdown,
  SaveWordModal,
} from "../components";
import {
  ArrowLeftRight,
  ArrowUp,
  BookmarkPlus,
  BookOpen,
  Brain,
  Check,
  ChevronDown,
  Copy,
  Globe2,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
} from "lucide-react";

async function fetchTranslation(
  opts: {
    method: string;
    query: string;
    instruction: string;
    promptMode?: PromptMode;
    googleSearch: boolean;
    searchEngine?: string;
    srcLang: string;
    dstLang: string;
  },
  callback: (
    data?: { result: string; reasoning?: string },
    error?: string,
  ) => void,
) {
  const resp = await authorizedRequest("/word/query", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(
      buildTranslationQueryBody({
        method: opts.method,
        text: opts.query,
        instruction: opts.instruction.length > 0 ? opts.instruction : undefined,
        promptMode: opts.promptMode,
        googleSearch: opts.googleSearch,
        searchEngine: opts.searchEngine ? opts.searchEngine : undefined,
        srcLang: opts.srcLang ? opts.srcLang : undefined,
        dstLang: opts.dstLang ? opts.dstLang : undefined,
      }),
    ),
  });

  if (resp.ok) {
    callback(
      (await resp.json()) as { result: string; reasoning?: string },
      undefined,
    );
  } else {
    callback(undefined, `(${resp.status}) ${await resp.text()}`);
  }
}

function showSelectLang(selected: string) {
  if (selected.startsWith("custom-") || parseCustomMethod(selected)) {
    return true;
  }

  switch (selected) {
    case "google":
    case "googlev1":
    case "m2m100_1_2b":
      return true;
    default:
      return false;
  }
}

const LANGUAGE_FLAGS: Record<string, string> = {
  "": "🌐",
  ja: "🇯🇵",
  zh: "🇨🇳",
  "zh-CN": "🇨🇳",
  "zh-TW": "🇹🇼",
  en: "🇺🇸",
  ko: "🇰🇷",
  fr: "🇫🇷",
  de: "🇩🇪",
  es: "🇪🇸",
  it: "🇮🇹",
  pt: "🇵🇹",
  ru: "🇷🇺",
  vi: "🇻🇳",
  th: "🇹🇭",
  id: "🇮🇩",
};

const languages = LANGUAGES.map(({ value, label }) => ({
  key: value,
  name: label,
  flag: LANGUAGE_FLAGS[value] ?? "🌐",
}));

const languageMap = Object.fromEntries(
  languages.map(({ key, name, flag }) => [key, { name, flag }]),
);

const TRANSLATION_SOURCE_KEYS = new Set(["google", "googlev1", "m2m100_1_2b"]);

const translationSources = BUILTIN_METHODS.filter((method) =>
  TRANSLATION_SOURCE_KEYS.has(method.value),
).map((method) => ({
  key: method.value,
  name: method.label,
}));

const dictSources = BUILTIN_METHODS.filter(
  (method) => !TRANSLATION_SOURCE_KEYS.has(method.value),
).map((method) => ({
  key: method.value,
  name: method.label,
}));

const translationMap = Object.fromEntries(
  BUILTIN_METHODS.map((method) => [method.value, method.label]),
);

const promptModeLabels = Object.fromEntries(
  PROMPT_MODES.map((mode) => [mode.value, mode.label]),
) as Record<PromptMode, string>;

const SUGGESTIONS = [
  {
    tag: "Japanese idiom",
    word: "一期一会",
    desc: "Explore nuance, kanji readings, and context",
    method: undefined as string | undefined,
  },
  {
    tag: "English lexicon",
    word: "serendipity",
    desc: "Meaning, etymology, and natural usage",
    method: undefined as string | undefined,
  },
  {
    tag: "Natural phrasing",
    word: "How do I say thank you naturally in Japanese?",
    desc: "Translate a phrase with tone variations",
    method: "google",
  },
];

function resolveCustomModel(
  value: string,
  customModels: Record<string, CustomLLM>,
): CustomLLM | undefined {
  if (customModels[value]) {
    return customModels[value];
  }

  const normalized = parseCustomMethod(value);
  if (normalized) {
    return normalized;
  }

  if (!value.startsWith("custom-")) {
    return undefined;
  }

  return Object.values(customModels).find(
    (customModel) => legacyCustomMethodValue(customModel) === value,
  );
}

export default function Home() {
  const [selected, setSelected] = useLocalStorage(
    "translate_type",
    DEFAULT_METHOD,
  );
  const [query, setQuery] = useLocalStorage("query", "");
  const [submittedQuery, setSubmittedQuery] = useLocalStorage(
    "submitted_query",
    "",
  );
  const [instruction, setInstruction] = useLocalStorage("instruction", "");
  const [googleSearch, setGoogleSearch] = useLocalStorage(
    "google_search",
    false,
  );
  const [searchEngine, setSearchEngine] = useLocalStorage<string>(
    "search_engine",
    DEFAULT_SEARCH_ENGINE,
  );
  const [result, setResult] = useLocalStorage<{
    result: string;
    reasoning?: string;
  }>("result_v2", { result: "" });
  const [liveResult, setLiveResult] = useState(result);
  const [srcLang, setSrcLang] = useLocalStorage("src_lang", "");
  const [dstLang, setDstLang] = useLocalStorage("dst_lang", "ja");
  const [loading, setLoading] = useState(false);
  const [stream, setStream] = useLocalStorage("stream", true);
  const [promptMode, setPromptMode] = useLocalStorage<PromptMode>(
    "prompt_mode",
    "default",
  );
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [thinkingOpen, setThinkingOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useLocalStorage(
    "home_advanced_open",
    false,
  );
  const [customModels, setCustomModels] = useLocalStorage<
    Record<string, CustomLLM>
  >("custom_llms_cache", {});
  const streamFrameRef = useRef<number | null>(null);
  const persistTimeoutRef = useRef<number | null>(null);
  const pendingStreamRef = useRef({ result: "", reasoning: "" });
  const queryInputRef = useRef<HTMLTextAreaElement | null>(null);

  const persistResult = useCallback(
    (
      next:
        | { result: string; reasoning?: string }
        | ((prev: { result: string; reasoning?: string }) => {
            result: string;
            reasoning?: string;
          }),
      options?: { debounce?: boolean; delay?: number },
    ) => {
      setLiveResult((prev) => {
        const nextValue = typeof next === "function" ? next(prev) : next;

        if (persistTimeoutRef.current !== null) {
          window.clearTimeout(persistTimeoutRef.current);
        }

        if (options?.debounce) {
          persistTimeoutRef.current = window.setTimeout(() => {
            setResult(nextValue);
            persistTimeoutRef.current = null;
          }, options.delay ?? 260);
        } else {
          setResult(nextValue);
        }

        return nextValue;
      });
    },
    [setResult],
  );

  useEffect(() => {
    return () => {
      if (streamFrameRef.current !== null) {
        window.cancelAnimationFrame(streamFrameRef.current);
      }
      if (persistTimeoutRef.current !== null) {
        window.clearTimeout(persistTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleFocusSearch = () => {
      queryInputRef.current?.focus();
      queryInputRef.current?.select();
    };
    window.addEventListener("dictdeck:focus-search", handleFocusSearch);
    return () =>
      window.removeEventListener("dictdeck:focus-search", handleFocusSearch);
  }, []);

  useEffect(() => {
    const textarea = queryInputRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(240, Math.max(62, textarea.scrollHeight))}px`;
  }, [query]);

  useEffect(() => {
    listModels((models, error) => {
      if (error) {
        console.log(error);
      } else if (models) {
        const customModelsMap: Record<string, CustomLLM> = {};
        for (const llm of models) {
          for (const model of llm.models) {
            const value = customMethodValue({ name: llm.name, model });
            customModelsMap[value] = {
              name: llm.name,
              model,
            };
          }
        }
        setCustomModels(customModelsMap);
      }
    });
  }, [setCustomModels]);

  useEffect(() => {
    if (!selected.startsWith("custom-")) return;

    const customModel = resolveCustomModel(selected, customModels);
    if (!customModel) return;

    const normalizedValue = customMethodValue(customModel);
    if (normalizedValue !== selected) {
      setSelected(normalizedValue);
    }
  }, [customModels, selected, setSelected]);

  const doQueryWord = useCallback(
    async (overrideQuery?: string, overrideMethod?: string) => {
      const targetQuery = (overrideQuery ?? query).trim();
      if (!targetQuery) return;
      const activeSelected = overrideMethod ?? selected;
      const customLLM = resolveCustomModel(activeSelected, customModels);
      const method = customLLM ? customMethodValue(customLLM) : activeSelected;

      setSubmittedQuery(targetQuery);
      setLoading(true);
      setThinkingOpen(false);

      if (stream && customLLM) {
        pendingStreamRef.current = { result: "", reasoning: "" };
        persistResult({ result: "" });
        try {
          const resp = await authorizedRequest("/word/query_stream", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(
              buildTranslationQueryBody({
                method,
                text: targetQuery,
                instruction: instruction.length > 0 ? instruction : undefined,
                promptMode,
                googleSearch,
                searchEngine: searchEngine ? searchEngine : undefined,
                srcLang: srcLang ? srcLang : undefined,
                dstLang: dstLang ? dstLang : undefined,
              }),
            ),
          });

          if (!resp.ok) {
            persistResult({
              result: `(${resp.status}) ${await resp.text()}`,
            });
            setLoading(false);
            return;
          }

          await streamRequest<{ result: string; reasoning?: string }>(
            resp,
            (data) => {
              pendingStreamRef.current = {
                result: pendingStreamRef.current.result + (data.result || ""),
                reasoning:
                  pendingStreamRef.current.reasoning + (data.reasoning || ""),
              };

              if (streamFrameRef.current !== null) return;

              streamFrameRef.current = window.requestAnimationFrame(() => {
                streamFrameRef.current = null;
                const pending = pendingStreamRef.current;
                pendingStreamRef.current = { result: "", reasoning: "" };

                persistResult(
                  (prev) => ({
                    result: prev.result + pending.result,
                    reasoning: (prev.reasoning || "") + pending.reasoning,
                  }),
                  { debounce: true },
                );
              });
            },
          );
        } catch (error) {
          persistResult({ result: String(error) });
        } finally {
          setLoading(false);
        }
      } else {
        await fetchTranslation(
          {
            query: targetQuery,
            srcLang,
            dstLang,
            googleSearch,
            searchEngine,
            instruction,
            promptMode,
            method,
          },
          (data, error) => {
            if (error) {
              persistResult({ result: error });
            } else if (data) {
              persistResult(data);
            } else {
              persistResult({ result: "NOT FOUND" });
            }
            setLoading(false);
          },
        );
      }
    },
    [
      query,
      srcLang,
      dstLang,
      googleSearch,
      searchEngine,
      instruction,
      promptMode,
      selected,
      customModels,
      persistResult,
      setSubmittedQuery,
      stream,
    ],
  );

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "s":
            e.preventDefault();
            setOpen(true);
            break;

          case "Enter":
            e.preventDefault();
            await doQueryWord();
            break;
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [doQueryWord]);

  const handleCopyResult = async () => {
    if (!liveResult.result) return;
    try {
      await navigator.clipboard?.writeText(liveResult.result);
      setCopied(true);
      addToast({ title: "Copied to clipboard", color: "success" });
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      addToast({ title: "Could not copy result", color: "warning" });
    }
  };

  const handleReset = () => {
    setQuery("");
    setSubmittedQuery("");
    persistResult({ result: "", reasoning: "" });
    setThinkingOpen(false);
    window.setTimeout(() => queryInputRef.current?.focus(), 40);
  };

  const handleSwapLanguages = () => {
    if (!srcLang) return;
    const prevSrc = srcLang;
    setSrcLang(dstLang);
    setDstLang(prevSrc);
  };

  const selectedCustomModel = resolveCustomModel(selected, customModels);
  const selectedLabel = selectedCustomModel
    ? selectedCustomModel.model
    : translationMap[selected] || methodLabel(selected);
  const hasCustomSelection = Boolean(selectedCustomModel);
  const hasOutput = Boolean(
    loading || liveResult.result || liveResult.reasoning,
  );
  const displayHeadword = submittedQuery || query || "Lookup result";

  return (
    <div className={`app-home-page${hasOutput ? "" : " is-idle"}`}>
      <SaveWordModal
        open={open}
        onChange={(p) => setOpen(p)}
        word={submittedQuery || query}
        explain={liveResult.result}
        type={0}
      />

      <div className="app-home-inner">
        <AnimatePresence initial={false}>
          {!hasOutput && (
            <motion.header
              key="home-hero"
              className="app-home-hero"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.3, ease: EASE_SILK }}
            >
              <div className="app-home-badge">
                <BookOpen size={13} />
                <span>Personal Lexicon & AI Translator</span>
              </div>
              <h1>
                Look up, understand, <em>remember.</em>
              </h1>
              <p className="app-home-subtitle">
                A quiet desk for dictionaries, nuanced translations, and lasting
                vocabulary.
              </p>
            </motion.header>
          )}
        </AnimatePresence>

        <motion.div layout="position" transition={SPRING_GENTLE}>
          <div className="app-composer">
            <div className="app-composer-input-wrap">
              <textarea
                ref={queryInputRef}
                value={query}
                rows={2}
                placeholder="Type a word, idiom, or sentence to look up…"
                className="app-composer-textarea"
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="app-composer-footer">
              <div className="app-composer-controls">
                <DropdownMenu.Root modal={false}>
                  <DropdownMenu.Trigger>
                    <button type="button" className="app-composer-chip">
                      <Sparkles
                        size={14}
                        className="shrink-0 text-[var(--dd-color-accent)]"
                      />
                      <span className="app-composer-chip-label">
                        {selectedLabel || "Select source"}
                      </span>
                      <ChevronDown size={13} className="shrink-0 opacity-60" />
                    </button>
                  </DropdownMenu.Trigger>
                  <DropdownMenu.Content>
                    <DropdownMenu.Label>Translation</DropdownMenu.Label>
                    {translationSources.map((source) => (
                      <DropdownMenu.Item
                        key={source.key}
                        onSelect={() => setSelected(source.key)}
                      >
                        {source.name}
                      </DropdownMenu.Item>
                    ))}
                    <DropdownMenu.Separator />
                    <DropdownMenu.Label>Dictionaries</DropdownMenu.Label>
                    {dictSources.map((source) => (
                      <DropdownMenu.Item
                        key={source.key}
                        onSelect={() => setSelected(source.key)}
                      >
                        {source.name}
                      </DropdownMenu.Item>
                    ))}
                    {Object.keys(customModels || {}).length > 0 && (
                      <>
                        <DropdownMenu.Separator />
                        <DropdownMenu.Label>AI Models</DropdownMenu.Label>
                      </>
                    )}
                    {Object.keys(customModels || {}).map((key) => (
                      <DropdownMenu.Item
                        key={key}
                        onSelect={() => setSelected(key)}
                      >
                        {customModels[key].model}
                      </DropdownMenu.Item>
                    ))}
                  </DropdownMenu.Content>
                </DropdownMenu.Root>

                {showSelectLang(selected) && (
                  <div className="app-composer-lang-group">
                    <DropdownMenu.Root modal={false}>
                      <DropdownMenu.Trigger>
                        <button type="button" className="app-composer-lang-btn">
                          <span>{languageMap[srcLang]?.flag || "🌐"}</span>
                          <span className="app-composer-chip-label">
                            {languageMap[srcLang]?.name || "Auto"}
                          </span>
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content>
                        {languages.map((lang) => (
                          <DropdownMenu.Item
                            key={lang.key}
                            onSelect={() => setSrcLang(lang.key)}
                          >
                            {lang.flag} {lang.name}
                          </DropdownMenu.Item>
                        ))}
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>

                    <button
                      type="button"
                      className="app-composer-swap"
                      onClick={handleSwapLanguages}
                      disabled={!srcLang}
                      aria-label="Swap languages"
                      title={
                        srcLang
                          ? "Swap source and target languages"
                          : "Choose a source language to swap"
                      }
                    >
                      <ArrowLeftRight size={13} />
                    </button>

                    <DropdownMenu.Root modal={false}>
                      <DropdownMenu.Trigger>
                        <button type="button" className="app-composer-lang-btn">
                          <span>{languageMap[dstLang]?.flag || "🌐"}</span>
                          <span className="app-composer-chip-label">
                            {languageMap[dstLang]?.name || "Auto"}
                          </span>
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Content>
                        {languages
                          .filter((lang) => lang.key !== "")
                          .map((lang) => (
                            <DropdownMenu.Item
                              key={lang.key}
                              onSelect={() => setDstLang(lang.key)}
                            >
                              {lang.flag} {lang.name}
                            </DropdownMenu.Item>
                          ))}
                      </DropdownMenu.Content>
                    </DropdownMenu.Root>
                  </div>
                )}

                {hasCustomSelection && (
                  <button
                    type="button"
                    className={`app-composer-icon-btn${showAdvanced ? " is-active" : ""}`}
                    onClick={() => setShowAdvanced((value) => !value)}
                    aria-label="Toggle advanced options"
                    title="Advanced options"
                  >
                    <SlidersHorizontal size={15} />
                  </button>
                )}
              </div>

              <div className="app-composer-submit-group">
                <kbd className="app-kbd">⌘↵</kbd>
                <button
                  type="button"
                  className="app-composer-submit"
                  onClick={() => void doQueryWord()}
                  disabled={loading || !query.trim()}
                  aria-label="Translate"
                >
                  {loading ? (
                    <span className="app-loading-dot" />
                  ) : (
                    <>
                      <span>Look up</span>
                      <ArrowUp size={15} strokeWidth={2.5} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </motion.div>

        <AnimatePresence initial={false}>
          {hasCustomSelection && showAdvanced && (
            <motion.section
              key="advanced-panel"
              className="app-advanced-panel"
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 14 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.24, ease: EASE_SILK }}
            >
              <div className="app-advanced-heading">
                <div>
                  <strong>Advanced options</strong>
                  <span>
                    Fine-tune grounding, streaming, and prompt guidance.
                  </span>
                </div>
                <button
                  type="button"
                  className="app-lexicon-btn"
                  onClick={() => setShowAdvanced(false)}
                >
                  Done
                </button>
              </div>
              <div className="app-advanced-grid">
                <label className="app-toggle-row">
                  <span>
                    <Switch
                      checked={googleSearch}
                      onCheckedChange={setGoogleSearch}
                    />
                    Web search grounding
                  </span>
                  <small>Pull fresh web references while translating.</small>
                </label>
                <label className="app-toggle-row">
                  <span>
                    <Switch checked={stream} onCheckedChange={setStream} />
                    Stream response
                  </span>
                  <small>Reveal tokens live as the model responds.</small>
                </label>
                {googleSearch && (
                  <label className="app-field-stack">
                    <span>Search engine</span>
                    <select
                      value={searchEngine}
                      onChange={(event) => setSearchEngine(event.target.value)}
                      className="app-native-select"
                    >
                      {SEARCH_ENGINES.map((engine) => (
                        <option key={engine.value} value={engine.value}>
                          {engine.label}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="app-field-stack">
                  <span>Prompt mode</span>
                  <DropdownMenu.Root modal={false}>
                    <DropdownMenu.Trigger>
                      <button
                        type="button"
                        className="app-composer-chip w-full justify-between"
                      >
                        <span>{promptModeLabels[promptMode]}</span>
                        <ChevronDown size={14} />
                      </button>
                    </DropdownMenu.Trigger>
                    <DropdownMenu.Content>
                      {PROMPT_MODES.map((mode) => (
                        <DropdownMenu.Item
                          key={mode.value}
                          onSelect={() => setPromptMode(mode.value)}
                        >
                          {mode.label}
                        </DropdownMenu.Item>
                      ))}
                    </DropdownMenu.Content>
                  </DropdownMenu.Root>
                </label>
                {!googleSearch && (
                  <label className="app-field-stack app-field-wide">
                    <span>Custom instruction</span>
                    <TextArea
                      value={instruction}
                      placeholder="e.g. Explain nuance, pitch accent, and 2 natural examples…"
                      onChange={(event) => setInstruction(event.target.value)}
                    />
                  </label>
                )}
              </div>
            </motion.section>
          )}
        </AnimatePresence>

        <AnimatePresence mode="wait">
          {hasOutput ? (
            <motion.article
              key="lexicon-result"
              className="app-lexicon-card"
              initial={{ opacity: 0, y: 16, scale: 0.99 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.99 }}
              transition={{ duration: 0.32, ease: EASE_SILK }}
            >
              <header className="app-lexicon-header">
                <div className="app-lexicon-headword-wrap">
                  <div className="app-lexicon-meta">
                    <span className="app-lexicon-source">
                      {loading && <span className="app-lexicon-live-dot" />}
                      {selectedLabel}
                    </span>
                  </div>
                  <h2 className="app-lexicon-headword">{displayHeadword}</h2>
                </div>

                <div className="app-lexicon-actions">
                  <button
                    type="button"
                    className="app-lexicon-btn app-lexicon-btn--accent"
                    onClick={() => setOpen(true)}
                  >
                    <BookmarkPlus size={15} />
                    <span>Save</span>
                  </button>
                  <button
                    type="button"
                    className="app-lexicon-btn"
                    onClick={() => void handleCopyResult()}
                    disabled={!liveResult.result}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                  <button
                    type="button"
                    className="app-lexicon-btn app-lexicon-btn--icon"
                    onClick={handleReset}
                    aria-label="Clear result"
                    title="Clear result"
                  >
                    <RotateCcw size={14} />
                  </button>
                </div>
              </header>

              {liveResult.reasoning && (
                <div className="app-thinking-box">
                  <button
                    type="button"
                    className="app-thinking-toggle"
                    onClick={() => setThinkingOpen((openState) => !openState)}
                    aria-expanded={thinkingOpen}
                  >
                    <span className="app-thinking-toggle-left">
                      <Brain size={14} />
                      <span>Thinking notes</span>
                    </span>
                    <ChevronDown
                      size={14}
                      style={{
                        transform: thinkingOpen
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                        transition: "transform 180ms ease",
                      }}
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {thinkingOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.22, ease: EASE_SILK }}
                        style={{ overflow: "hidden" }}
                      >
                        <div className="app-thinking-body prose">
                          <Markdown>{liveResult.reasoning}</Markdown>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}

              <div className="app-lexicon-body">
                {loading && !liveResult.result ? (
                  <div
                    className="app-lexicon-skeleton"
                    role="status"
                    aria-label="Looking up entry"
                  >
                    <span className="skeleton-line skeleton-line--title" />
                    <span className="skeleton-line" />
                    <span className="skeleton-line" />
                    <span className="skeleton-line skeleton-line--short" />
                  </div>
                ) : (
                  <div className="prose">
                    <Markdown>
                      {liveResult.result || "No result found."}
                    </Markdown>
                    {loading && (
                      <span className="app-stream-cursor" aria-hidden="true" />
                    )}
                  </div>
                )}
              </div>
            </motion.article>
          ) : (
            <motion.section
              key="home-suggestions"
              className="app-home-suggestions"
              variants={staggerContainer}
              initial="hidden"
              animate="show"
              exit={{ opacity: 0, y: 8 }}
            >
              <div className="app-home-suggestion-heading">
                <span>Try a lookup</span>
                <span className="inline-flex items-center gap-1.5 text-[11.5px] font-normal">
                  <Globe2 size={12} /> Press <kbd className="app-kbd">⌘S</kbd>{" "}
                  anytime to save
                </span>
              </div>
              <div className="app-home-suggestion-grid">
                {SUGGESTIONS.map((item) => (
                  <motion.button
                    key={item.word}
                    type="button"
                    variants={fadeUpItem}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.985 }}
                    className="app-suggestion-card"
                    onClick={() => {
                      if (item.method) setSelected(item.method);
                      setQuery(item.word);
                      void doQueryWord(item.word, item.method);
                    }}
                  >
                    <span className="app-suggestion-tag">{item.tag}</span>
                    <span className="app-suggestion-word">{item.word}</span>
                    <span className="app-suggestion-desc">{item.desc}</span>
                  </motion.button>
                ))}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
