import {
  createContext,
  useContext,
  type PropsWithChildren,
  type ReactElement,
} from "react";
import {
  createI18n,
  type I18n,
} from "../i18n/dictionary.js";

const DEFAULT_EDITOR_I18N = createI18n();
const EditorI18nContext = createContext<I18n>(DEFAULT_EDITOR_I18N);

export function EditorI18nProvider({
  i18n,
  children,
}: PropsWithChildren<{ i18n: I18n }>): ReactElement {
  return (
    <EditorI18nContext.Provider value={i18n}>
      {children}
    </EditorI18nContext.Provider>
  );
}

export function useEditorI18n(): I18n {
  return useContext(EditorI18nContext);
}
