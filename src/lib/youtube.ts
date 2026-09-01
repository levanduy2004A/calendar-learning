export function parseYouTubeId(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  if (/^[\w-]{11}$/.test(raw)) return raw;
  try {
    const url = new URL(raw);
    if (url.hostname === "youtu.be") {
      const id = url.pathname.split("/").filter(Boolean)[0];
      return id && /^[\w-]{11}$/.test(id) ? id : null;
    }
    if (url.hostname.includes("youtube.com")) {
      const v = url.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const parts = url.pathname.split("/").filter(Boolean);
      const embedIdx = parts.indexOf("embed");
      if (embedIdx >= 0 && /^[\w-]{11}$/.test(parts[embedIdx + 1] ?? "")) {
        return parts[embedIdx + 1];
      }
      const shortsIdx = parts.indexOf("shorts");
      if (shortsIdx >= 0 && /^[\w-]{11}$/.test(parts[shortsIdx + 1] ?? "")) {
        return parts[shortsIdx + 1];
      }
    }
  } catch {
    return null;
  }
  return null;
}
