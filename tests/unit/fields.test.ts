import { describe, expect, it } from "vitest";
import { buildSchema, defaultValues, toFormValues } from "@/lib/cms/fields";
import { PROFILE_CONFIG, RESOURCES, resourceFields, SETTINGS_CONFIG, singletonFields } from "@/lib/cms/resources";

const projectSchema = buildSchema(resourceFields(RESOURCES.projects!));

function validProject(over: Record<string, unknown> = {}) {
  return { ...defaultValues(resourceFields(RESOURCES.projects!)), title: "My app", slug: "my-app", ...over };
}

describe("generated schemas", () => {
  it("accepts a minimal valid project and normalises empties", () => {
    const r = projectSchema.safeParse(validProject({ live_url: "", started_on: "" }));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.live_url).toBeNull();
      expect(r.data.started_on).toBeNull();
      expect(r.data.status).toBe("draft");
    }
  });

  it("defaults new records to draft (never auto-published)", () => {
    for (const r of Object.values(RESOURCES)) {
      expect(defaultValues(resourceFields(r)).status).toBe("draft");
    }
  });

  it("rejects missing required fields, bad slugs and unsafe URLs", () => {
    const r = projectSchema.safeParse(validProject({ title: "", slug: "Bad Slug", live_url: "javascript:alert(1)" }));
    expect(r.success).toBe(false);
    if (!r.success) {
      const paths = r.error.issues.map((i) => i.path[0]);
      expect(paths).toEqual(expect.arrayContaining(["title", "slug", "live_url"]));
    }
  });

  it("strips unknown keys (no mass assignment of id / timestamps)", () => {
    const r = projectSchema.safeParse(validProject({ id: "x", created_at: "2020", sort_order: 9 }));
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data).not.toHaveProperty("id");
      expect(r.data).not.toHaveProperty("created_at");
      expect(r.data).not.toHaveProperty("sort_order");
    }
  });

  it("enforces skill level bounds and allows an empty level", () => {
    const s = buildSchema(resourceFields(RESOURCES.skills!));
    const base = { ...defaultValues(resourceFields(RESOURCES.skills!)), name: "TypeScript" };
    expect(s.safeParse({ ...base, level: "" }).success).toBe(true);
    expect(s.safeParse({ ...base, level: "80" }).success).toBe(true);
    expect(s.safeParse({ ...base, level: 101 }).success).toBe(false);
  });

  it("validates nav links and colours in settings", () => {
    const s = buildSchema(singletonFields(SETTINGS_CONFIG));
    const base = { ...defaultValues(singletonFields(SETTINGS_CONFIG)), site_name: "Site" };
    expect(s.safeParse({ ...base, nav_items: [{ label: "A", href: "/about", visible: true }] }).success).toBe(true);
    expect(s.safeParse({ ...base, nav_items: [{ label: "A", href: "javascript:x", visible: true }] }).success).toBe(false);
    expect(s.safeParse({ ...base, accent_color: "red" }).success).toBe(false);
  });

  it("round-trips DB rows to form values", () => {
    const values = toFormValues(resourceFields(RESOURCES.projects!), { title: "T", live_url: null, tags: ["a"] });
    expect(values.title).toBe("T");
    expect(values.live_url).toBe("");
    expect(values.tags).toEqual(["a"]);
  });

  it("profile schema requires a name", () => {
    const s = buildSchema(singletonFields(PROFILE_CONFIG));
    expect(s.safeParse({ ...defaultValues(singletonFields(PROFILE_CONFIG)), full_name: "" }).success).toBe(false);
  });
});
