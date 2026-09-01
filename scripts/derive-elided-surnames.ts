/**
 * Derives `src/elided-surnames.ts` — the table that tells an elided apostrophe
 * prefix ("O Brien" for O'Brien) from a middle initial ("John A Doe").
 *
 * Run: bun run scripts/derive-elided-surnames.ts [--report]
 *
 * WHY THIS IS DERIVED RATHER THAN WRITTEN
 *
 * The table was hand-curated once, and a hand-curated list is a recollection of
 * Irish surnames, not a measurement: no provenance, no coverage number, and no
 * principled answer to whether "O'Fallon" belongs. What the parser needs is a
 * fact about the population — of the people whose surname ends in "-rien", how
 * many write "O'Brien" and how many write "Brien"? — so the table should be
 * counted, not remembered.
 *
 * WHY ONE SOURCE, AND WHY THIS ONE
 *
 * The US Census 2010 surname file is the obvious source and is the wrong one.
 * It is public domain, it is exactly this library's population, and it FOLDS
 * THE APOSTROPHE AWAY — O'BRIEN is stored as OBRIEN. That is the same elision
 * this table exists to undo, so the file cannot attest that a name takes an
 * apostrophe at all. Worse, the fold collides: derived against it, "D'Avis"
 * scores 1,116,357 bearers, because DAVIS is where every Davis in America
 * lands, and "L'Ane", "D'Yer" and "O'Live" score their whole populations the
 * same way. The counts are real and they are measuring somebody else.
 *
 * So the source has to be one that PRESERVES the apostrophe on both sides of
 * the comparison. English Wikipedia page titles do: they are underscore-joined
 * and punctuation-faithful, "Conan_O'Brien" and "Dan_Ryan" both appear as
 * written, and there are enough people in there to count. That makes the
 * comparison a like-for-like one within a single population, which is the part
 * the Census could not offer at any price.
 *
 * Its bias is worth stating: Wikipedia is notable people, skewed English-
 * speaking and historical, so it is not a census of anybody. It is used here
 * only for a RATIO between two spellings of the same name, and that bias falls
 * on both spellings at once.
 *
 * THE POLICY, AND WHY EACH RULE EARNS ITS PLACE
 *
 * 1. ELIDING_LETTERS. Only letters a language actually contracts before a vowel
 *    can head an elided surname. The set is closed and short — the rest of this
 *    family ("Mc", "Mac", "Ni", "Al", "Ibn", "Dell'") runs to two letters or
 *    more and so never collides with a one-letter initial to begin with. The
 *    report prints what the data offered and this rule turned away.
 *
 * 2. MIN_SUPPORT. The apostrophe spelling has to be borne by several different
 *    people, which is what separates a surname from a one-off: "L'Ane" and
 *    "D'Ale" are titles in Wikipedia, but nobody is named them.
 *
 * 3. MIN_SHARE. The join has to be the likelier reading. A candidate competes
 *    against the reading where the letter is an initial and the next word is
 *    the whole surname, so it must hold its own against the bare stem. This is
 *    the rule that keeps "O'Brien" and drops "O'Ryan" — Ryan is overwhelmingly
 *    its own surname, Brien is overwhelmingly not.
 *
 * Every rule is applied HERE, at derivation time, so the parser keeps a plain
 * set lookup and ships no frequency data.
 */

const TITLES_URL = "https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-all-titles-in-ns0.gz";

/**
 * Letters a language contracts before a vowel, and can therefore head a surname
 * on their own.
 */
const ELIDING_LETTERS: { [letter: string]: string } = {
  o: "Irish and Scottish Gaelic O/Ua - O'Brien",
  d: "Italian, French, Catalan, Goan and Maltese di/de - D'Angelo, D'Souza",
  l: "French, Italian and Catalan le/la - L'Heureux",
  // "m" is deliberately absent. Scots M' ("M'Donald") is archaic, and the live
  // M' names are Senegalese - M'Baye, M'Barek - which clear the odds test on
  // Wikipedia's population but not on this library's: M is the commonest middle
  // initial there is, so a wrong join here costs more than the right ones gain.
  // Re-enable by adding it back; the report prints what it would admit.
};

/** Distinct people who write the name with the apostrophe. */
const MIN_SUPPORT = 3;

/**
 * How many times likelier the elided reading must be than the initial reading.
 *
 * The two readings of "X Stem" are not a straight contest between two
 * spellings, which is the trap the first cut of this script fell into: it
 * compared O'Sullivan's bearers against Sullivan's, found Sullivan ahead, and
 * threw away O'Sullivan, O'Reilly, D'Souza and D'Angelo. The initial reading
 * needs TWO things to be true at once - the surname is the bare stem AND the
 * letter is that person's middle initial - so its likelihood carries the
 * frequency of the initial as a factor:
 *
 *   elided   ~ people(X'Stem)
 *   initial  ~ people(Stem) * P(a given name starts with X)
 *
 * That factor is what separates O from D: a middle initial is almost never O,
 * so O'Sullivan wins comfortably over "Sullivan with middle initial O" despite
 * being the rarer spelling.
 */
const MIN_ODDS = 3;

/**
 * How many titles a word must head before it counts as a given name.
 *
 * "Two capitalised words" is a loose test for a person, and the slack shows up
 * as junk stems: "Five O'Clock", "Palme D'Or" and "Tohono O'odham" are all
 * shaped like a name. What they are not is a PERSON, and the tell is the first
 * word - real given names head thousands of biographies, "Palme" and "Tohono"
 * head a handful. Requiring the first word to be a name someone is actually
 * called filters the corpus down to people on both sides of the ratio.
 */
const GIVEN_NAME_FLOOR = 200;

const CACHE = new URL("../.cache/", import.meta.url).pathname;

async function cached(url: string, name: string): Promise<string> {
  const path = CACHE + name;
  if (await Bun.file(path).exists()) return path;
  console.error(`downloading ${url}`);
  const res = await fetch(url, {
    headers: { "User-Agent": "parse-full-name derive-elided-surnames (github.com/sroussey/parse-full-name)" },
  });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  await Bun.write(path, await res.arrayBuffer());
  return path;
}

async function* titleLines(gzPath: string): AsyncGenerator<string> {
  const stream = Bun.file(gzPath).stream().pipeThrough(new DecompressionStream("gzip"));
  const decoder = new TextDecoder();
  let carry = "";
  for await (const chunk of stream) {
    const text = carry + decoder.decode(chunk, { stream: true });
    const cut = text.lastIndexOf("\n");
    carry = cut === -1 ? text : text.slice(cut + 1);
    if (cut === -1) continue;
    for (const line of text.slice(0, cut).split("\n")) yield line;
  }
  if (carry) yield carry;
}

/**
 * The last word of a title that reads like a person's name, or null.
 *
 * The dump carries titles and nothing else — no hint of which pages are people
 * — so being a person has to be inferred from the shape of the title. Two to
 * four capitalised words with no digits, brackets or punctuation is what a
 * biography title looks like ("Conan_O'Brien", "Flannery_O'Connor") and what
 * "O'Hare_International_Airport" and "D'Angelo_(album)" do not.
 *
 * The heuristic lets some places and bands through. That is tolerable because
 * both sides of the ratio are drawn the same way, so the noise largely divides
 * out; a stem is only kept when the apostrophe spelling wins anyway.
 */
function personSurname(title: string): string | null {
  const words = title.split("_");
  if (words.length < 2 || words.length > 4) return null;
  for (const w of words) if (!/^[A-Z][A-Za-z'-]*$/.test(w)) return null;
  return words[words.length - 1];
}

const CANDIDATE = /^([A-Za-z])'([A-Za-z][A-Za-z-]*)$/;

/** `[letter, list]` entries by letter -- the default sort stringifies the pair. */
const byLetter = (a: readonly [string, unknown], b: readonly [string, unknown]): number =>
  a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0;

async function main() {
  const report = process.argv.includes("--report");
  const titlesPath = await cached(TITLES_URL, "enwiki-titles.gz");

  // Pass 1: how often each word heads a title, so the next pass can tell a
  // given name from "Palme" or "Tohono".
  const firstWord = new Map<string, number>();
  for await (const line of titleLines(titlesPath)) {
    if (!personSurname(line)) continue;
    const head = line.split("_")[0];
    firstWord.set(head, (firstWord.get(head) ?? 0) + 1);
  }
  const givenNames = new Set(
    [...firstWord].filter(([, n]) => n >= GIVEN_NAME_FLOOR).map(([w]) => w)
  );
  console.error(`given names (head >= ${GIVEN_NAME_FLOOR} titles): ${givenNames.size}`);

  // Pass 2: count people. Both sides of the odds test and the initial
  // distribution all come from this one filtered population, so Wikipedia's
  // skew towards notable English-speaking people applies throughout and largely
  // divides out. A middle initial is not quite a first initial, but the two are
  // drawn from the same pool of given names, which is what the test needs.
  const elided = new Map<string, number>(); // "o|brien" -> people
  const bare = new Map<string, number>();
  const givenInitial = new Map<string, number>();
  let people = 0;
  for await (const line of titleLines(titlesPath)) {
    const surname = personSurname(line);
    if (!surname || !givenNames.has(line.split("_")[0])) continue;
    people++;
    const initial = line[0].toLowerCase();
    givenInitial.set(initial, (givenInitial.get(initial) ?? 0) + 1);
    const m = CANDIDATE.exec(surname);
    if (m && m[2].length >= 2) {
      const key = `${m[1].toLowerCase()}|${m[2].toLowerCase()}`;
      elided.set(key, (elided.get(key) ?? 0) + 1);
    } else {
      const key = surname.toLowerCase();
      bare.set(key, (bare.get(key) ?? 0) + 1);
    }
  }
  const pInitial = (letter: string) => (givenInitial.get(letter) ?? 0) / people;
  console.error(`people: ${people}, apostrophe surnames: ${elided.size}`);
  console.error(
    "P(given name starts with):",
    Object.keys(ELIDING_LETTERS).map((l) => `${l}=${(pInitial(l) * 100).toFixed(2)}%`).join(" ")
  );

  interface Row { letter: string; stem: string; people: number; barePeople: number; odds: number }
  const rows: Row[] = [];
  for (const [key, count] of elided) {
    const [letter, stem] = key.split("|");
    const barePeople = bare.get(stem) ?? 0;
    const asInitial = barePeople * pInitial(letter);
    rows.push({ letter, stem, people: count, barePeople, odds: asInitial ? count / asInitial : Infinity });
  }

  const kept = new Map<string, Row[]>();
  const rejected: (Row & { reason: string })[] = [];
  for (const r of rows) {
    const reason =
      !(r.letter in ELIDING_LETTERS) ? "letter does not elide"
      : r.people < MIN_SUPPORT ? "too few bearers"
      : r.odds < MIN_ODDS ? "loses to the initial reading"
      : null;
    if (reason) {
      if (r.people >= MIN_SUPPORT) rejected.push({ ...r, reason });
      continue;
    }
    (kept.get(r.letter) ?? kept.set(r.letter, []).get(r.letter)!).push(r);
  }
  for (const list of kept.values()) list.sort((a, b) => b.people - a.people);

  if (report) {
    for (const [letter, list] of [...kept].sort(byLetter)) {
      console.error(`\n=== ${letter}' kept ${list.length}`);
      for (const r of list.slice(0, 22))
        console.error(`  ${letter}'${r.stem.padEnd(14)} people=${String(r.people).padStart(5)} bare=${String(r.barePeople).padStart(5)} odds=${r.odds.toFixed(1)}`);
    }
    const byReason = new Map<string, typeof rejected>();
    for (const r of rejected) (byReason.get(r.reason) ?? byReason.set(r.reason, []).get(r.reason)!).push(r);
    for (const [reason, list] of byReason) {
      list.sort((a, b) => b.people - a.people);
      console.error(`\n=== rejected: ${reason} — ${list.length}`);
      for (const r of list.slice(0, 22))
        console.error(`  ${r.letter}'${r.stem.padEnd(14)} people=${String(r.people).padStart(5)} bare=${String(r.barePeople).padStart(5)} odds=${r.odds.toFixed(1)}`);
    }
  }

  const total = [...kept.values()].reduce((s, l) => s + l.length, 0);
  const body = [...kept]
    .sort(byLetter)
    .map(([letter, list]) => {
      const stems = list.map((r) => r.stem).sort();
      const top = list.slice(0, 3).map((r) => `${letter.toUpperCase()}'${r.stem}`);
      const wrapped: string[] = [];
      let line = "";
      for (const s of stems) {
        if (line.length + s.length + 1 > 92) { wrapped.push(line); line = ""; }
        line += (line ? " " : "") + s;
      }
      if (line) wrapped.push(line);
      return (
        `  // ${ELIDING_LETTERS[letter]}\n` +
        `  // ${list.length} stems. Commonest: ${top.join(", ")}.\n` +
        `  ${letter}: new Set(\n` +
        // Two things this emitter got wrong once, both silent:
        // the trailing space belongs INSIDE every literal but the last, or the
        // concatenation welds one line's last stem to the next line's first; and
        // the whole concatenation needs parenthesising, or `.split` binds to the
        // final literal alone and `new Set` is handed a string, which quietly
        // yields a set of single CHARACTERS that matches no stem at all.
        `    (` +
        wrapped.map((l, k) => `"${l}${k < wrapped.length - 1 ? " " : ""}"`).join(" +\n     ") +
        `).split(" ")\n  ),`
      );
    })
    .join("\n");

  const out = `/**
 * GENERATED FILE - do not edit by hand.
 * Regenerate with \`bun run derive\`.
 *
 * Surname stems that follow an elided apostrophe prefix, keyed by the letter
 * that elides: "brien" under "o" is O'Brien, which a system that rejects
 * apostrophes stores as "O Brien". Lowercase, and matched against the token
 * after the letter - see \`isElidedSurnamePrefix\` in ./index.ts.
 *
 * ${total} stems, counted from English Wikipedia page titles that read like a
 * person's name <${TITLES_URL}>.
 * A stem is here because the elided reading of "X Stem" beats the reading where
 * X is a middle initial and Stem the whole surname - weighing the people who
 * write the apostrophe against the people who write the bare stem TIMES how
 * often a given name starts with that letter. That last factor is the one that
 * matters: a middle initial is almost never O, which is why O'Sullivan is here
 * even though Wikipedia's Sullivans outnumber its O'Sullivans nearly 3 to 1.
 * Factual name strings; Wikipedia content is CC BY-SA.
 *
 * The US Census surname file is deliberately NOT a source: it folds O'BRIEN to
 * OBRIEN, so it cannot attest an apostrophe, and its folded counts collide
 * ("D'Avis" inherits every Davis in America). The script says more.
 *
 * The selection policy - which letters may elide, the support floor, and the
 * odds the elided reading must beat the initial reading by - lives in the
 * script, not here. Read it there before adding or removing a stem by hand; a
 * hand edit is lost on the next regeneration.
 */
export const ELIDED_SURNAME_STEMS: { [letter: string]: Set<string> } = {
${body}
};
`;
  await Bun.write(new URL("../src/elided-surnames.ts", import.meta.url).pathname, out);
  console.error(`\nwrote src/elided-surnames.ts — ${total} stems across ${kept.size} letters`);
}

await main();
