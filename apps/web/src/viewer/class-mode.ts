/**
 * Class mode, for projecting a lesson: bigger text and buttons, the color key
 * held open, and a panel with only the lesson in it. It lives in the URL
 * (?mode=class) and nowhere else, so a teacher can bookmark it and the site
 * still sets no cookie or storage for it.
 */
export const MODE_PARAM = "mode";
export const CLASS_MODE = "class";

export function readClassMode(search: string): boolean {
  return new URLSearchParams(search).get(MODE_PARAM) === CLASS_MODE;
}

/** `href` with class mode carried along, so the next lesson opens the same way. */
export function modeHref(href: string, classMode: boolean): string {
  if (!classMode) return href;
  const [rest = "", hash] = href.split("#");
  const [path = "", query] = rest.split("?");
  const params = new URLSearchParams(query);
  params.set(MODE_PARAM, CLASS_MODE);
  return `${path}?${params.toString()}${hash === undefined ? "" : `#${hash}`}`;
}

/** The current address with class mode on or off, keeping everything else. */
export function withClassMode(href: string, on: boolean): string {
  const url = new URL(href);
  if (on) url.searchParams.set(MODE_PARAM, CLASS_MODE);
  else url.searchParams.delete(MODE_PARAM);
  return `${url.pathname}${url.search}${url.hash}`;
}
