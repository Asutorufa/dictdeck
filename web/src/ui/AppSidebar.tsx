import {
  BookOpen,
  Layers3,
  Menu,
  Monitor,
  Moon,
  PanelLeft,
  Search,
  Settings2,
  Sparkles,
  Sun,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import { ReactNode } from "react";
import { SPRING_SNAPPY } from "@/lib/motion";
import {
  ROUTE_CONFIG,
  ROUTE_FLASHCARD,
  ROUTE_HOME,
  ROUTE_WORDS,
} from "@/lib/constants";

type AppSidebarProps = {
  value: string;
  onValueChange: (value: string) => void;
  onNewLookup: () => void;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  mobileOpen: boolean;
  onToggleMobile: () => void;
  onCloseMobile: () => void;
};

type SidebarItemProps = {
  icon: ReactNode;
  label: string;
  active?: boolean;
  collapsed: boolean;
  onClick: () => void;
};

function SidebarItem({
  icon,
  label,
  active,
  collapsed,
  onClick,
}: SidebarItemProps) {
  return (
    <button
      type="button"
      className={`app-sidebar-item${active ? " is-active" : ""}`}
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      title={label}
    >
      {active && (
        <motion.span
          layoutId="sidebar-active-pill"
          className="app-sidebar-item-pill"
          transition={SPRING_SNAPPY}
          aria-hidden="true"
        />
      )}
      <span className="app-sidebar-item-icon">{icon}</span>
      {!collapsed && <span className="app-sidebar-item-label">{label}</span>}
    </button>
  );
}

function BrandMark() {
  return <img className="app-sidebar-brand-mark" src="/dictdeck.svg" alt="" />;
}

const THEME_OPTIONS = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "Auto", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
] as const;

export function AppSidebar({
  value,
  onValueChange,
  onNewLookup,
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onToggleMobile,
  onCloseMobile,
}: AppSidebarProps) {
  const { theme = "system", setTheme } = useTheme();
  const effectiveCollapsed = collapsed && !mobileOpen;

  const go = (route: string) => {
    onValueChange(route);
    onCloseMobile();
  };

  const handleLookupClick = () => {
    onNewLookup();
    onCloseMobile();
  };

  const cycleTheme = () => {
    const order = ["light", "dark", "system"] as const;
    const index = order.indexOf(theme as (typeof order)[number]);
    const next = order[(index + 1) % order.length];
    setTheme(next);
  };

  const activeThemeIcon =
    theme === "dark" ? (
      <Moon size={16} />
    ) : theme === "light" ? (
      <Sun size={16} />
    ) : (
      <Monitor size={16} />
    );

  return (
    <>
      <div className="app-mobile-nav-bar">
        <button
          type="button"
          className="app-mobile-nav-brand"
          onClick={() => go(ROUTE_HOME)}
          aria-label="Go to DictDeck home"
        >
          <BrandMark />
          <span>DictDeck</span>
        </button>
        <button
          type="button"
          className="app-mobile-nav-toggle"
          onClick={onToggleMobile}
          aria-label={mobileOpen ? "Close navigation" : "Open navigation"}
          aria-expanded={mobileOpen}
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <AnimatePresence>
        {mobileOpen && (
          <motion.button
            type="button"
            className="app-sidebar-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onCloseMobile}
            aria-label="Close navigation"
          />
        )}
      </AnimatePresence>

      <aside
        className={`app-sidebar${effectiveCollapsed ? " is-collapsed" : ""}${mobileOpen ? " is-mobile-open" : ""}`}
        aria-label="Main navigation"
      >
        <div className="app-sidebar-top">
          <div className="app-sidebar-brand-row">
            {!effectiveCollapsed && (
              <button
                type="button"
                className="app-sidebar-brand"
                onClick={() => go(ROUTE_HOME)}
                aria-label="Go to DictDeck home"
              >
                <BrandMark />
                <span>DictDeck</span>
              </button>
            )}
            <button
              type="button"
              className="app-sidebar-collapse"
              onClick={onToggleCollapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-expanded={!collapsed}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <PanelLeft size={17} />
            </button>
          </div>

          <button
            type="button"
            className="app-sidebar-new"
            onClick={handleLookupClick}
            title="New lookup (⌘K)"
          >
            <span className="app-sidebar-new-icon">
              <Search size={16} />
            </span>
            {!effectiveCollapsed && (
              <>
                <span>Quick lookup</span>
                <kbd className="app-kbd">⌘K</kbd>
              </>
            )}
          </button>

          {!effectiveCollapsed && (
            <div className="app-sidebar-section-label">Library</div>
          )}

          <nav className="app-sidebar-nav">
            <SidebarItem
              icon={<Sparkles size={17} />}
              label="Dictionary"
              active={value === ROUTE_HOME}
              collapsed={effectiveCollapsed}
              onClick={() => go(ROUTE_HOME)}
            />
            <SidebarItem
              icon={<BookOpen size={17} />}
              label="Vocabulary"
              active={value === ROUTE_WORDS}
              collapsed={effectiveCollapsed}
              onClick={() => go(ROUTE_WORDS)}
            />
            <SidebarItem
              icon={<Layers3 size={17} />}
              label="Daily review"
              active={value === ROUTE_FLASHCARD}
              collapsed={effectiveCollapsed}
              onClick={() => go(ROUTE_FLASHCARD)}
            />
            <SidebarItem
              icon={<Settings2 size={17} />}
              label="Settings"
              active={value === ROUTE_CONFIG}
              collapsed={effectiveCollapsed}
              onClick={() => go(ROUTE_CONFIG)}
            />
          </nav>
        </div>

        <div className="app-sidebar-footer">
          {effectiveCollapsed ? (
            <button
              type="button"
              className="app-theme-cycle-btn"
              onClick={cycleTheme}
              aria-label={`Switch theme (current: ${theme})`}
              title={`Theme: ${theme}`}
            >
              {activeThemeIcon}
            </button>
          ) : (
            <>
              <div
                className="app-theme-switch"
                role="radiogroup"
                aria-label="Color theme"
              >
                {THEME_OPTIONS.map((option) => {
                  const Icon = option.icon;
                  const isActive = theme === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      role="radio"
                      aria-checked={isActive}
                      className={`app-theme-switch-btn${isActive ? " is-active" : ""}`}
                      onClick={() => setTheme(option.value)}
                      title={`${option.label} theme`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="sidebar-theme-pill"
                          className="app-theme-switch-pill"
                          transition={SPRING_SNAPPY}
                          aria-hidden="true"
                        />
                      )}
                      <Icon size={13} />
                      <span>{option.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="app-sidebar-meta">
                <span>DictDeck Studio</span>
                <span>Self-hosted</span>
              </div>
            </>
          )}
        </div>
      </aside>
    </>
  );
}
