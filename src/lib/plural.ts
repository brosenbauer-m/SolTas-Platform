/** "1 project", "2 projects", "1,204 funding opportunities" (counts formatted for reading). */
export function plural(count: number, singular: string, pluralForm = `${singular}s`): string {
  return `${count.toLocaleString("en")} ${count === 1 ? singular : pluralForm}`;
}
