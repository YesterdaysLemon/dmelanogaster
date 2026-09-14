/** A single byte range for video seeking. Unsupported/malformed ranges are
 * ignored; a well-formed but unsatisfiable range receives HTTP 416. */
export function byteRange(header, size) {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header);
  if (!match || (!match[1] && !match[2])) return null;
  const first = match[1] ? Number(match[1]) : null;
  const last = match[2] ? Number(match[2]) : null;
  if ([first, last].some((v) => v !== null && !Number.isSafeInteger(v)))
    return null;
  if (
    !size ||
    (first !== null && first >= size) ||
    (first === null && last === 0) ||
    (first !== null && last !== null && last < first)
  )
    return false;
  return {
    start: first ?? Math.max(0, size - last),
    end: first === null ? size - 1 : Math.min(last ?? size - 1, size - 1),
  };
}
