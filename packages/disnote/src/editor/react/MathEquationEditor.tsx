import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
  type ReactElement,
} from "react";
import type { MathfieldElement } from "mathlive";
import {
  mathFieldTemplateFor,
  mathPaletteByCategory,
  type MathPaletteCategory,
  type MathPaletteItem,
} from "../../math/index.js";
import { MathRenderer } from "../../renderer-react/components/MathRenderer.js";
import {
  createI18n,
  type EditorLocale,
  type EditorMessageKey,
  type EditorMessageOverrides,
} from "../i18n/dictionary.js";
import { useEditorI18n } from "./EditorI18nContext.js";

export interface MathEquationEditorProps {
  code: string;
  onChange(code: string): void;
  locale?: EditorLocale;
  /** Override any English UI message without forking the component. */
  messages?: EditorMessageOverrides;
  className?: string;
}

const categoryOrder: MathPaletteCategory[] = [
  "structures",
  "operators",
  "relations",
  "greek",
];

const categoryMessageKeys: Readonly<
  Record<MathPaletteCategory, EditorMessageKey>
> = {
  structures: "math.category.structures",
  operators: "math.category.operators",
  relations: "math.category.relations",
  greek: "math.category.greek",
};

function mathItemMessageKey(item: MathPaletteItem): EditorMessageKey {
  return `math.item.${item.id}` as EditorMessageKey;
}

const surfaceStyle: CSSProperties = {
  border: "1px solid #dbe3ea",
  borderRadius: 10,
  background: "#ffffff",
  overflow: "hidden",
  width: "100%",
};

const mathFieldStyle = {
  boxSizing: "border-box",
  display: "block",
  width: "100%",
  minHeight: 92,
  padding: "20px 18px",
  border: "1px solid #cbd5e1",
  borderRadius: 8,
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "1.55rem",
  lineHeight: 1.6,
  textAlign: "center",
  overflowX: "auto",
  "--caret-color": "#0d9488",
  "--selection-background-color": "#99f6e4",
  "--contains-highlight-background-color": "#ccfbf1",
  "--placeholder-color": "#94a3b8",
} as CSSProperties;

export function MathEquationEditor({
  code,
  onChange,
  locale: localeProp,
  messages,
  className = "disnote-math-equation-editor",
}: MathEquationEditorProps): ReactElement {
  const contextI18n = useEditorI18n();
  const i18n = useMemo(
    () =>
      localeProp !== undefined || messages !== undefined
        ? createI18n({
            locale: localeProp ?? contextI18n.locale,
            messages: { ...contextI18n.messages, ...messages },
          })
        : contextI18n,
    [contextI18n, localeProp, messages]
  );
  const editorLabel = i18n.t("math.editor");
  const fieldLabel = i18n.t("math.field");
  const emptyMessage = i18n.t("math.empty");
  const mathFieldRef = useRef<MathfieldElement | null>(null);
  const latestCodeRef = useRef(code);
  const lastEmittedCodeRef = useRef<string | null>(null);
  const [mathFieldStatus, setMathFieldStatus] = useState<
    "loading" | "ready" | "failed"
  >("loading");
  const [activeCategory, setActiveCategory] =
    useState<MathPaletteCategory>("structures");

  latestCodeRef.current = code;

  const setMathFieldRef = useCallback(
    (element: MathfieldElement | null): void => {
      mathFieldRef.current = element;
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    const element = mathFieldRef.current;
    if (!element) return;

    void import("./mathlive-browser.js")
      .then(({ prepareMathField }) =>
        prepareMathField(element, latestCodeRef.current, emptyMessage)
      )
      .then(() => {
        if (!cancelled) setMathFieldStatus("ready");
      })
      .catch(() => {
        if (!cancelled) setMathFieldStatus("failed");
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const field = mathFieldRef.current;
    if (!field || mathFieldStatus !== "ready") return;

    field.placeholder = emptyMessage;
    if (lastEmittedCodeRef.current === code) {
      lastEmittedCodeRef.current = null;
      return;
    }

    const currentValue = field.getValue("latex-without-placeholders");
    if (currentValue !== code) {
      field.setValue(code, { silenceNotifications: true });
    }
  }, [code, emptyMessage, mathFieldStatus]);

  const emitMathChange = (field: MathfieldElement): void => {
    const nextCode = field.getValue("latex-without-placeholders");
    lastEmittedCodeRef.current = nextCode;
    onChange(nextCode);
  };

  const handleInput = (event: FormEvent<MathfieldElement>): void => {
    if (typeof event.currentTarget.getValue === "function") {
      emitMathChange(event.currentTarget);
    }
  };

  const insertItem = (item: MathPaletteItem): void => {
    const field = mathFieldRef.current;
    if (!field || typeof field.insert !== "function") return;

    const template = mathFieldTemplateFor(item);
    field.insert(template.insert, {
      focus: true,
      insertionMode: "replaceSelection",
      selectionMode: "placeholder",
    });
    emitMathChange(field);
  };

  return (
    <section
      className={className}
      contentEditable={false}
      style={surfaceStyle}
      aria-label={editorLabel}
    >
      <div
        role="tablist"
        aria-label={editorLabel}
        style={{
          display: "flex",
          gap: 2,
          padding: "6px 8px 0",
          overflowX: "auto",
          background: "#f4f7fa",
          borderBottom: "1px solid #dbe3ea",
        }}
      >
        {categoryOrder.map((category) => (
          <button
            key={category}
            type="button"
            role="tab"
            aria-selected={activeCategory === category}
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => setActiveCategory(category)}
            style={{
              border: 0,
              borderBottom:
                activeCategory === category
                  ? "2px solid #0d9488"
                  : "2px solid transparent",
              padding: "7px 10px",
              background: "transparent",
              color: activeCategory === category ? "#0f766e" : "#475569",
              fontWeight: activeCategory === category ? 700 : 500,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {i18n.t(categoryMessageKeys[category])}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(58px, 1fr))",
          gap: 6,
          padding: 10,
          background: "#f8fafc",
          borderBottom: "1px solid #dbe3ea",
        }}
      >
        {mathPaletteByCategory[activeCategory].map((item) => {
          const template = mathFieldTemplateFor(item);
          const description = i18n.t(mathItemMessageKey(item));
          return (
            <button
              key={item.id}
              type="button"
              aria-label={description}
              title={description}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => insertItem(item)}
              style={{
                minWidth: 54,
                minHeight: 46,
                padding: "5px 7px",
                border: "1px solid #cbd5e1",
                borderRadius: 7,
                background: "#ffffff",
                color: "#0f172a",
                fontSize: 16,
                cursor: "pointer",
                overflow: "hidden",
              }}
            >
              <MathRenderer
                code={template.preview}
                displayMode={false}
                fallback={item.label}
              />
            </button>
          );
        })}
      </div>

      <label
        style={{
          display: "block",
          padding: 12,
          color: "#475569",
          fontSize: 12,
        }}
      >
        <span
          style={{
            display: "block",
            marginBottom: 7,
            fontWeight: 650,
          }}
        >
          {fieldLabel}
        </span>
        <style>
          {
            "math-field[data-disnote-visual-math-field]::part(menu-toggle){display:none}"
          }
        </style>
        <math-field
          data-disnote-visual-math-field=""
          ref={setMathFieldRef}
          onInput={handleInput}
          aria-label={fieldLabel}
          style={{
            ...mathFieldStyle,
            visibility: mathFieldStatus === "ready" ? "visible" : "hidden",
          }}
        />
        {mathFieldStatus === "failed" && (
          <span
            role="status"
            style={{
              display: "block",
              marginTop: -92,
              minHeight: 92,
              padding: "30px 18px",
              color: "#b91c1c",
              textAlign: "center",
            }}
          >
            {i18n.t("math.invalid")}
          </span>
        )}
        <span style={{ display: "block", marginTop: 7 }}>
          {i18n.t("math.hint")}
        </span>
      </label>
    </section>
  );
}
