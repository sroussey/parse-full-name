# @sroussey/parse-full-name

## Description

parseFullName() is designed to parse large batches of full names in multiple
inconsistent formats, as from a database, and continue processing without error,
even if given some unparsable garbage entries.

parseFullName():

1. accepts a string containing a person's full name, in any format,
2. analyzes and attempts to detect the format of that name,
3. (if possible) parses the name into its component parts, and
4. (by default) returns an object containing all individual parts of the name:
   - title (string): title(s) (e.g. "Ms." or "Dr.")
   - first (string): first name or initial
   - middle (string): middle name(s) or initial(s)
   - last (string): last name or initial
   - nick (string): nickname(s)
   - generation (string): generational suffix(es) (e.g. "Jr." or "III")
   - credential (string): professional credential(s) (e.g. "Esq.", "CPA", or
     "M.D., CFA"), comma-joined when a name carries several
   - error (array of strings): any parsing error messages

   Trailing name parts are split across two fields because they answer
   different questions. `generation` says *which* person — a junior and a
   senior sharing a name are two people — so code that identifies or
   de-duplicates people must key on it. `credential` says only how one document
   chose to annotate a person, and must be ignored for that purpose.

Optionally, parseFullName() can also:

- return only the specified part of a name as a string (or errors as an array)
- always fix or ignore the letter case of the returned parts (the default is
  to fix the case only when the original input is all upper or all lowercase)
- stop on errors (the default is to return warning messages in the output,
  but never throw a JavaScript error, no matter how mangled the input)
- detect more variations of name prefixes, suffixes, and titles (the default
  detects 29 prefixes, 19 suffixes, 16 titles, and 8 conjunctions, but it
  can be set to detect 94 prefixes, 23 suffixes, and 204 titles instead)

If this is not what you're looking for, is overkill for your application, or
is in the wrong language, check the "Credits" section at the end of this file
for links to several other excellent parsers which may suit your needs better.

## Use

### Basic Use

```ts
import { parseFullName } from "@sroussey/parse-full-name";

const name = parseFullName("Mr. David Davis");

assert.strictEqual(name.title, "Mr.");
assert.strictEqual(name.first, "David");
assert.strictEqual(name.last, "Davis");
```

### Options

```ts
parseFullName(nameToParse: string , {partToReturn, fixCase, stopOnError, useLongLists, normalize}: {partToReturn: string, fixCase: number, stopOnError: number, useLongLists: number, normalize: number})
```

nameToParse (string, required): the name to be parsed

partToReturn (string, optional): the name of a single part to return

- 'all' (default) = return an object containing all name parts
- 'title' = return only the title(s) as a string (or an empty string)
- 'first' = return only the first name as a string (or an empty string)
- 'middle' = return only the middle name(s) as a string (or an empty string)
- 'last' = return only the last name as a string (or an empty string)
- 'nick' = return only the nickname(s) as a string (or an empty string)
- 'generation' = return only the generational suffix(es) as a string (or an empty string)
- 'credential' = return only the credential(s) as a string (or an empty string)
- 'error' = return only the array of parsing error messages (or an empty array)

fixCase (integer, optional): fix case of output name

- -1 (default) = fix case only if input name is all upper or lowercase
- 0 or false = never fix the case (retain and output same case as input name)
- 1 or true = always fix case of output, even if input is mixed case

stopOnError (integer, optional): makes parsing errors throw JavaScript errors

- 0 or false (default) = return warnings about parsing errors, but continue
- 1 or true = if a parsing error is found, throw a JavaScript error

useLongLists (integer, optional): use long prefix, suffix, and title lists

- 0 or false (default) = use default lists (29 prefixes, 19 suffixes, 16 titles)
- 1 or true = use experimental long lists (94 prefixes, 23 suffixes, 204 titles)
  Note: The alternate long lists are experimental and have not been tested.
  Be especially careful using the long prefix list, which may incorrectly
  detect "Ben" as a prefix, which is common in middle-eastern names,
  rather than as a first name, which is common in English names

normalize (integer, optional): normalize name parts for deduplication

- 0 or false (default) = no normalization
- 1 or true = normalize name parts to canonical forms

### Normalize Option

The `normalize` option standardizes name parts to canonical forms, useful for deduplication:

**Suffixes normalized:**

- `jr`, `junior`, `jnr` → `Jr.`
- `sr`, `senior`, `snr` → `Sr.`
- `2`, `2nd`, `second` → `II`
- `3`, `3rd`, `third` → `III`
- `esq`, `esquire` → `Esq.`

**Titles normalized:**

- `dr`, `doctor` → `Dr.`
- `prof`, `professor` → `Prof.`
- `mr` → `Mr.`
- `mrs` → `Mrs.`
- `ms` → `Ms.`

This ensures consistent formatting for database deduplication and matching.

### Advanced Use

```javascript
var parseFullName = require("parse-full-name").parseFullName;

name = parseFullName("DE LORENZO Y GUTIEREZ, Mr. JÜAN MARTINEZ (MARTIN) Jr.", {
  partToReturn: "all",
  fixCase: 1,
  stopOnError: 0,
  useLongLists: 0,
  normalize: 0,
});

assert.strictEqual(name.title, "Mr.");
assert.strictEqual(name.first, "Jüan");
assert.strictEqual(name.middle, "Martinez");
assert.strictEqual(name.last, "de Lorenzo y Gutierez");
assert.strictEqual(name.nick, "Martin");
assert.strictEqual(name.generation, "Jr.");
assert.strictEqual(name.credential, "");
assert.strictEqual(name.error, []);
```

## Elided apostrophe prefixes

`Conner O Brien` and `John A Doe` are the same three-token shape, but the first
is one first name and one surname (O'Brien, with the apostrophe stripped by some
upstream system) and the second is a first name, a middle initial and a surname.
Any single rule for both gets one of them wrong, and both failures rewrite a name
part: read as a prefix, `John A Doe` yields `last: "A Doe"`; read as an initial,
`Conner O Brien` yields `last: "Brien"`. A caller matching on `last` misses the
record either way.

The parser settles it on the word *after* the letter, against a table of surname
stems in `src/elided-surnames.ts`:

```ts
parseFullName("Conner O Brien").last; // "O Brien"
parseFullName("John A Doe").middle; // "A"
parseFullName("Sean O Sullivan").last; // "O Sullivan"
parseFullName("Michael O Ryan").middle; // "O"  — Ryan is its own surname
parseFullName("John O. Brien").middle; // "O."  — a dot settles it outright
```

That table is **derived, not hand-written**. Regenerate it with:

```sh
bun run derive          # add --report to see what was kept, dropped and why
```

`scripts/derive-elided-surnames.ts` counts English Wikipedia page titles that
read like a person's name, and keeps a stem only where the elided reading beats
the reading in which the letter is a middle initial and the stem is the whole
surname:

```
elided  ~ people(X'Stem)
initial ~ people(Stem) × P(a given name starts with X)
```

That second factor is the one that matters. Wikipedia's Sullivans outnumber its
O'Sullivans nearly 3 to 1, so comparing the two spellings alone would discard
O'Sullivan — but a middle initial is almost never `O`, and once that is priced
in, `O Sullivan` wins by 21×. The same arithmetic drops `O'Ryan`, `O'Moore`,
`D'Silva` and `D'Cruz`, whose stems are common surnames in their own right.

The US Census surname file is deliberately **not** a source. It folds `O'BRIEN`
to `OBRIEN`, which is the very elision this table exists to undo, so it cannot
attest that a name takes an apostrophe — and its folded counts collide, scoring
`D'Avis` with every Davis in America, `L'Ang` with every Lang and `L'Amb` with
every Lamb. The script documents this at length; read it before editing the
table by hand, since a hand edit is lost on the next regeneration.

Currently 231 stems across `O'`, `D'` and `L'`. Two known limits: a stem nobody
notable carries is missing, and Dutch `'t` / `'s` (as in `Van 't Hoff`) is not
handled, because `T` and `S` are far commoner as middle initials than any
evidence for the Dutch reading could outweigh.

## Upgrading from 2.x

**Breaking:** `suffix` is gone. It is replaced by `generation` and
`credential`, and `partToReturn: "suffix"` is likewise replaced by
`"generation"` / `"credential"`.

```js
// 2.x
name.suffix; // "Jr., CPA"

// 3.x
name.generation; // "Jr."
name.credential; // "CPA"
```

To restore the old combined string:
`[name.generation, name.credential].filter(Boolean).join(", ")`.

The split moved into this library because only it owns the suffix vocabulary;
callers doing the classification themselves drifted out of sync with the list.

Also in 3.0: `CPA` and `CFA` are recognized (previously taken as the surname),
generational suffixes past `V` (`VI`, `VII`, `VIII`) are recognized (likewise),
and a suffix that is also a common surname — `Ma`, `Ba`, `Di`, `Mas`, `Vi` — no
longer consumes the last remaining name part, so "Jack Ma" parses as a first
and last name rather than a last name with no first.

## Reporting Bugs

If you find a name this function does not parse correctly, or any other bug,
please report it here: https://github.com/sroussey/parse-full-name/issues

## Credits and precursors

This is a fork of https://github.com/anTon1337x3/parse-full-name-plus which
is a fork of https://github.com/dschnelldavis/parse-full-name

Before creating this function I studied many other name-parsing functions.
None quite suited my needs, but many are excellent at what they do, and
this function uses ideas from several of them.

My thanks to all the following developers for sharing their work.

"If I have seen further, it is by standing on the shoulders of giants."
— Isaac Newton

Josh Fraser's PHP-Name-Parser:
https://github.com/joshfraser/PHP-Name-Parser

Josh Fraser's JavaScript-Name-Parser:
https://github.com/joshfraser/JavaScript-Name-Parser

Garve Hays' Java NameParser:
https://github.com/gkhays/NameParser

Jason Priem's PHP HumanNameParser:
https://web.archive.org/web/20150408022642/http://jasonpriem.org/human-name-parse/ and
https://github.com/jasonpriem/HumanNameParser.php

Keith Beckman's PHP nameparse:
http://alphahelical.com/code/misc/nameparse/

Jed Hartman's PHP normalize_name:
http://www.kith.org/journals/jed/2007/02/11/3813.html and
http://www.kith.org/logos/things/code/name-parser-php.html

ashaffer88's JavaScript parse-name:
https://github.com/weo-edu/parse-name and
https://www.npmjs.com/package/parse-name

Derek Gulbranson's Python nameparser:
https://github.com/derek73/python-nameparser/

Discussion about how to change all upper or lowercase names to correct case:
http://stackoverflow.com/questions/11529213/given-upper-case-names-transform-to-proper-case-handling-ohara-mcdonald

Title lists modified from:
http://www.codeproject.com/Questions/262876/Titles-or-Salutation-list

Suffix lists modified from:
http://en.wikipedia.org/wiki/Suffix_(name) and
https://github.com/derek73/python-nameparser/blob/master/nameparser/config/suffixes.py

Prefix lists modified from:
http://en.wikipedia.org/wiki/List_of_family_name_affixes

Conjunction list copied entirely from:
https://github.com/derek73/python-nameparser/blob/master/nameparser/config/conjunctions.py
