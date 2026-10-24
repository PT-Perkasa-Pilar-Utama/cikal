const PLACEHOLDER = /\{\{(\w+)\}\}/g;

/** Mengisi placeholder `{{nama}}` template email; placeholder tanpa nilai dibiarkan apa adanya. */
export function renderTemplate(text: string, values: Readonly<Record<string, string>>): string {
  return text.replace(PLACEHOLDER, (placeholder, name: string) => values[name] ?? placeholder);
}
