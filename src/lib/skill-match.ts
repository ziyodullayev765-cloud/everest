/** "iOS / SwiftUI" → ["ios", "swiftui"]; "Next.js" → ["nextjs"]. */
function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .split(/[/,&+|]|\band\b/)
    .map((t) => t.replace(/[^a-z0-9а-яё]/gi, ""))
    .filter((t) => t.length > 1);
}

/** True when a project's technologies or tags mention the skill (or one of its parts). */
export function projectUsesSkill(skill: string, tech: string[]): boolean {
  const want = new Set(tokens(skill));
  if (!want.size) return false;
  return tech.some((t) => tokens(t).some((x) => want.has(x)));
}
