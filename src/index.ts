/**
 * A parsed name.
 *
 * Trailing name parts are returned as TWO fields rather than one `suffix`,
 * because they answer different questions. `generation` says *which* person —
 * a junior and a senior sharing a name are two people. `credential` says how
 * one document chose to annotate a person — the same person is "Isaac Manke"
 * in one place and "Isaac Manke, Ph.D." in another. Code that identifies or
 * de-duplicates people must key on the former and ignore the latter; a single
 * combined `suffix` silently forced callers to do that classification
 * themselves, against a vocabulary only this library owns.
 */
interface ParsedName {
  title: string;
  first: string;
  middle: string;
  last: string;
  nick: string;
  /** Generational suffix: "Jr.", "Sr.", "III". Identity-bearing. */
  generation: string;
  /**
   * Professional credentials as written: "CPA", "Ph.D.", "M.D., CFA".
   * Comma-joined when a name carries several. NOT identity-bearing.
   */
  credential: string;
  error: string[];
}

/** The working shape during parsing, before `suffix` is classified. */
interface InternalParsedName {
  title: string;
  first: string;
  middle: string;
  last: string;
  nick: string;
  suffix: string;
  error: string[];
}

type PartToReturn =
  | "title"
  | "first"
  | "middle"
  | "last"
  | "nick"
  | "generation"
  | "credential"
  | "error"
  | "all";

/**
 * Suffixes that identify a DIFFERENT person rather than annotate the same one.
 * Everything else the suffix pass finds is a credential.
 */
const GENERATIONAL_SUFFIXES = new Set([
  "jr",
  "jnr",
  "junior",
  "sr",
  "snr",
  "senior",
  "ii",
  "iii",
  "iv",
  "v",
  "vi",
  "vii",
  "viii",
  "2",
  "2nd",
  "second",
  "3",
  "3rd",
  "third",
  "4",
  "4th",
  "fourth",
  "5",
  "5th",
  "fifth",
]);

/**
 * Splits the parsed suffix into its identity-bearing and annotation halves.
 *
 * A name can carry both at once ("John Smith Jr., CPA") and several of either,
 * joined by commas, so each part is classified on its own.
 */
function classifySuffix(suffix: string): { generation: string; credential: string } {
  const generation: string[] = [];
  const credential: string[] = [];
  for (const raw of suffix.split(",")) {
    const part = raw.trim();
    if (part === "") continue;
    const key = part.replace(/[.\s]/g, "").toLowerCase();
    (GENERATIONAL_SUFFIXES.has(key) ? generation : credential).push(part);
  }
  return { generation: generation.join(", "), credential: credential.join(", ") };
}

/** Projects the internal working shape onto the public one. */
function toPublicName(internal: InternalParsedName): ParsedName {
  const { generation, credential } = classifySuffix(internal.suffix);
  return {
    title: internal.title,
    first: internal.first,
    middle: internal.middle,
    last: internal.last,
    nick: internal.nick,
    generation,
    credential,
    error: internal.error,
  };
}

type FixCaseOption = boolean | number; // -1, 0, 1
type StopOnErrorOption = boolean | number; // 0, 1
type UseLongListsOption = boolean | number; // 0, 1
type NormalizeOption = boolean | number; // 0, 1

/**
 * Suffix-list entries that are also common surnames, so a trailing occurrence is
 * ambiguous rather than clearly a suffix. Stripping one of these is refused when
 * it would leave a single name part — see the suffix pass for why that case is
 * worse than merely inaccurate.
 */
const SURNAME_AMBIGUOUS_SUFFIXES = [
  "ma", // Master of Arts / the Chinese surname 馬
  "ba", // Bachelor of Arts / a Chinese and West African surname
  "di", // Diplom / an Italian and Chinese surname
  "mas", // Master of Applied Science / a Catalan and South Asian surname
  "vi", // Sixth / a given name (Violet) and a Vietnamese surname
];

interface ParseFullNameOptions {
  partToReturn?: PartToReturn;
  fixCase?: FixCaseOption;
  stopOnError?: StopOnErrorOption;
  useLongLists?: UseLongListsOption;
  normalize?: NormalizeOption;
}

// Function overloads for better type safety
export function parseFullName(
  nameToParse: string,
  options: { partToReturn: "error" } & Omit<ParseFullNameOptions, "partToReturn">
): string[];

export function parseFullName(
  nameToParse: string,
  options: { partToReturn: Exclude<PartToReturn, "all" | "error"> } & Omit<
    ParseFullNameOptions,
    "partToReturn"
  >
): string;

export function parseFullName(
  nameToParse: string,
  options?: { partToReturn?: "all" } & Omit<ParseFullNameOptions, "partToReturn">
): ParsedName;

export function parseFullName(
  nameToParse: string,
  options?: ParseFullNameOptions
): ParsedName | string | string[];

export function parseFullName(
  nameToParse: string,
  options: ParseFullNameOptions = {}
): ParsedName | string | string[] {
  // Destructure options with defaults
  const {
    partToReturn: partToReturnOption,
    fixCase: fixCaseOption,
    stopOnError: stopOnErrorOption,
    useLongLists: useLongListsOption,
    normalize: normalizeOption,
  } = options;

  let i: number,
    j: number,
    l: number,
    m: number,
    n: string[],
    part: string,
    comma: string | null,
    titleList: string[],
    suffixList: string[],
    prefixList: string[],
    regex: RegExp,
    partToCheck: string,
    partFound: string[] | null,
    partsFoundCount: number,
    firstComma: number,
    remainingCommas: number;

  const nameParts: string[] = [];
  const nameCommas: (string | null)[] = [null];
  let partsFound: string[] = [];

  const conjunctionList: string[] = ["&", "and", "et", "e", "of", "the", "und", "y"];

  const parsedName: InternalParsedName = {
    title: "",
    first: "",
    middle: "",
    last: "",
    nick: "",
    suffix: "",
    error: [],
  };

  // Validate inputs, or set to defaults
  const validParts: PartToReturn[] = [
    "title",
    "first",
    "middle",
    "last",
    "nick",
    "generation",
    "credential",
    "error",
  ];
  let partToReturn =
    partToReturnOption && validParts.indexOf(partToReturnOption.toLowerCase() as PartToReturn) > -1
      ? (partToReturnOption.toLowerCase() as PartToReturn)
      : "all";
  // 'all' = return object with all parts, others return single part

  let fixCase = fixCaseOption;
  if (fixCase === false) fixCase = 0;
  if (fixCase === true) fixCase = 1;
  fixCase = fixCase !== undefined && (fixCase === 0 || fixCase === 1) ? fixCase : -1; // -1 = fix case only if input is all upper or lowercase

  let stopOnError = stopOnErrorOption;
  if (stopOnError === true) stopOnError = 1;
  stopOnError = stopOnError && stopOnError === 1 ? 1 : 0;
  // false = output warnings on parse error, but don't stop

  let useLongLists = useLongListsOption;
  if (useLongLists === false) useLongLists = 0;
  else useLongLists = 1; // change -- defaults to on now

  let normalize = normalizeOption;
  if (normalize === true) normalize = 1;
  normalize = normalize && normalize === 1 ? 1 : 0;
  // false = no normalization, true = normalize for deduplication

  // If stopOnError = 1, throw error, otherwise return error messages in array
  function handleError(errorMessage: string): void {
    if (stopOnError) {
      throw new Error("Error: " + errorMessage);
    } else {
      parsedName.error.push("Error: " + errorMessage);
    }
  }

  // If fixCase = 1, fix case of parsedName parts before returning
  function fixParsedNameCase(
    fixedCaseName: InternalParsedName,
    fixCaseNow: number | boolean
  ): InternalParsedName {
    const forceCaseList: string[] = [
      "e",
      "y",
      "av",
      "af",
      "da",
      "dal",
      "de",
      "del",
      "der",
      "di",
      "la",
      "le",
      "van",
      "der",
      "den",
      "vel",
      "von",
      "II",
      "III",
      "IV",
      "J.D.",
      "LL.M.",
      "M.D.",
      "D.O.",
      "D.C.",
      "Ph.D.",
      "Dipl.-Ing.",
      "B.A.",
      "B.Sc.",
      "B.Eng.",
      "LL.B.",
      "B.Ed",
      "B.F.A.",
      "B.Mus.",
      "BBA",
      "M.A.",
      "M.Sc.",
      "M.Eng.",
      "LL.M.",
      "M.Ed.",
      "M.F.A.",
      "M.Mus.",
      "MBA",
      "MPH",
      "MSW",
      "Dr.",
      "Dr.phil.",
      "Dr.rer.nat.",
      "Dr.rer.pol.",
      "Dr.-Ing.",
      "Dr.med.",
      "Dr.med.dent.",
      "Dr.med.vent.",
      "Dr.jur.",
      "Dr.theol.",
      "Dr.agr.",
      "Dr.soc.sc.",
      "Prof.",
      "Dr.h.c.",
      "Dr.mult.",
      "Dr.habil.",
      "Dipl.-Ing.",
      "Dipl.-Kfm.",
      "Dipl.-Kffr.",
    ];
    let forceCaseListIndex: number;
    let namePartWords: string[]; // Removed unused outer namePartLabels

    if (fixCaseNow) {
      // Keys come from the INTERNAL object, which still carries `suffix`; the
      // generation/credential split happens after case-fixing, in toPublicName.
      const namePartLabels = Object.keys(parsedName).filter(
        (v: string) => v !== "error"
      ) as (keyof Omit<InternalParsedName, "error">)[];

      for (i = 0, l = namePartLabels.length; i < l; i++) {
        const currentLabel = namePartLabels[i];
        if (fixedCaseName[currentLabel]) {
          namePartWords = (fixedCaseName[currentLabel] + "").split(" ");
          for (j = 0, m = namePartWords.length; j < m; j++) {
            forceCaseListIndex = forceCaseList
              .map((v: string) => v.toLowerCase())
              .indexOf(namePartWords[j].toLowerCase());
            if (forceCaseListIndex > -1) {
              // Set case of words in forceCaseList
              namePartWords[j] = forceCaseList[forceCaseListIndex];
            } else if (namePartWords[j].length === 1) {
              // Uppercase initials
              namePartWords[j] = namePartWords[j].toUpperCase();
            } else if (
              namePartWords[j].length > 2 &&
              namePartWords[j].slice(0, 1) === namePartWords[j].slice(0, 1).toUpperCase() &&
              namePartWords[j].slice(1, 2) === namePartWords[j].slice(1, 2).toLowerCase() &&
              namePartWords[j].slice(2) === namePartWords[j].slice(2).toUpperCase()
            ) {
              // Detect McCASE and convert to McCase
              namePartWords[j] =
                namePartWords[j].slice(0, 3) + namePartWords[j].slice(3).toLowerCase();
            } else if (
              currentLabel === "suffix" &&
              namePartWords[j].slice(-1) !== "." &&
              suffixList.indexOf(namePartWords[j].toLowerCase()) === -1
            ) {
              // Convert suffix abbreviations to UPPER CASE
              if (namePartWords[j] === namePartWords[j].toLowerCase()) {
                namePartWords[j] = namePartWords[j].toUpperCase();
              }
            } else {
              // Convert to Title Case (with proper handling of hyphens and apostrophes)
              namePartWords[j] = namePartWords[j]
                .toLowerCase()
                .replace(/(^|[-'])[a-z]/g, (match) => match.toUpperCase());
            }
          }
          fixedCaseName[currentLabel] = namePartWords.join(" ");
        }
      }
    }
    return fixedCaseName;
  }

  // Normalize parsed name parts for deduplication
  function normalizeParsedName(nameToNormalize: InternalParsedName): InternalParsedName {
    if (!normalize) return nameToNormalize;

    // Normalization mappings
    const suffixNormalizations: { [key: string]: string } = {
      jr: "Jr.",
      "jr.": "Jr.",
      junior: "Jr.",
      jnr: "Jr.",
      "jnr.": "Jr.",
      sr: "Sr.",
      "sr.": "Sr.",
      senior: "Sr.",
      snr: "Sr.",
      "snr.": "Sr.",
      "2": "Jr.",
      "2nd": "Jr.",
      second: "Jr.",
      "3": "III",
      "3rd": "III",
      third: "III",
      "4": "IV",
      "4th": "IV",
      fourth: "IV",
      "5": "V",
      "5th": "V",
      fifth: "V",
      ii: "Jr.",
      iii: "III",
      iv: "IV",
      v: "V",
      vi: "VI",
      vii: "VII",
      viii: "VIII",
      dr: "Dr.",
      "dr.": "Dr.",
      doctor: "Dr.",
      prof: "Prof.",
      "prof.": "Prof.",
      professor: "Prof.",
      esq: "Esq.",
      "esq.": "Esq.",
      esquire: "Esq.",
    };

    const titleNormalizations: { [key: string]: string } = {
      dr: "Dr.",
      "dr.": "Dr.",
      doctor: "Dr.",
      prof: "Prof.",
      "prof.": "Prof.",
      professor: "Prof.",
      mr: "Mr.",
      "mr.": "Mr.",
      mrs: "Mrs.",
      "mrs.": "Mrs.",
      ms: "Ms.",
      "ms.": "Ms.",
      miss: "Miss",
      sir: "Sir",
    };

    // Normalize suffix
    if (nameToNormalize.suffix) {
      const suffixParts = nameToNormalize.suffix.split(", ");
      const normalizedSuffixParts = suffixParts.map((part) => {
        const lowerPart = part.toLowerCase();
        return suffixNormalizations[lowerPart] || part;
      });
      nameToNormalize.suffix = normalizedSuffixParts.join(", ");
    }

    // Normalize title
    if (nameToNormalize.title) {
      const titleParts = nameToNormalize.title.split(", ");
      const normalizedTitleParts = titleParts.map((part) => {
        const lowerPart = part.toLowerCase();
        return titleNormalizations[lowerPart] || part;
      });
      nameToNormalize.title = normalizedTitleParts.join(", ");
    }

    return nameToNormalize;
  }

  // If no input name, or input name is not a string, abort
  if (!nameToParse || typeof nameToParse !== "string") {
    handleError("No input");
    const fixedName = fixParsedNameCase(parsedName, fixCase as number);
    const normalizedName = toPublicName(normalizeParsedName(fixedName));
    if (partToReturn === "all" || !partToReturn) {
      return normalizedName;
    } else {
      return normalizedName[partToReturn] as any;
    }
  } else {
    nameToParse = nameToParse.replaceAll(/[       ]+/g, " ");
    nameToParse = nameToParse.trim();
  }

  // Auto-detect fixCase: fix if nameToParse is all upper or all lowercase
  if (fixCase === -1) {
    fixCase =
      nameToParse === nameToParse.toUpperCase() || nameToParse === nameToParse.toLowerCase()
        ? 1
        : 0;
  }

  // Initialize lists of prefixes, suffixes, and titles to detect
  // Note: These list entries must be all lowercase
  suffixList = [
    "2", // Second
    "2nd", // Second
    "3rd", // Third
    "4th", // Fourth
    "5th", // Fifth
    "b.ed", // Bachelor of Education
    "b.a.", // Bachelor of Arts
    "b.eng.", // Bachelor of Engineering
    "b.f.a.", // Bachelor of Fine Arts
    "b.mus.", // Bachelor of Music
    "b.sc.", // Bachelor of Science
    "ba", // Bachelor of Arts
    "bba", // Bachelor of Business Administration
    "beng", // Bachelor of Engineering
    "bsc", // Bachelor of Science
    "c.f.a.", // Chartered Financial Analyst
    "c.p.a.", // Certified Public Accountant
    "cfa", // Chartered Financial Analyst
    "cfp", // Certified Financial Planner
    "chfc", // Chartered Financial Consultant
    "cpa", // Certified Public Accountant
    "clu", // Chartered Life Underwriter
    "d.c.", // Doctor of Chiropractic
    "d.o.", // Doctor of Osteopathic Medicine
    "di", // Diplom
    "dipl.-kffr.", // Diplom-Ingenieur
    "dipl.-kfm.", // Diplom-Ingenieur
    "dipl.-ing.", // Diplom-Ingenieur
    "doctor", // Doctor
    "dr", // Doctor
    "dr.-ing.", // Diplom-Ingenieur
    "dr.agr.", // Doctor Agriculturae
    "dr.h.c.", // Doctor Honoris Causa
    "dr.habil.", // Doctor Habilitatus
    "dr.iur.", // Doctor Iuris
    "dr.jur.", // Doctor Juris
    "dr.med.", // Doctor Medicinae
    "dr.med.dent.", // Doctor Medicinae Dentariae
    "dr.mont.", // Doctor Montium
    "dr.mult.", // Doctor Multidisciplinaris
    "dr.nat.techn.", // Doctor Naturae Technologiae
    "dr.phil.", // Doctor Philosophiae
    "dr.rer.nat.", // Doctor Rerum Naturalium
    "dr.rer.pol.", // Doctor Rerum Politicarum
    "dr.rer.soc.oec.", // Doctor Rerum Societatis Oeconomicarum
    "dr.scient.med.", // Doctor Scientiae Medicinae
    "dr.soc.sc.", // Doctor Scientiarum Socialium
    "dr.theol.", // Doctor Theologiae
    "esq", // Esquire
    "esquire", // Esquire
    "ii", // Second
    "iii", // Third
    "iv", // Fourth
    "j.d.", // Juris Doctor
    "jnr", // Junior
    "jr", // Junior
    "junior", // Junior
    "ll.b.", // Bachelor of Laws
    "ll.m.", // Master of Laws
    "llm", // Master of Laws
    "m.a.", // Master of Arts
    "m.a.i.s.", // Master of Advanced International Studies
    "m.b.l.", // Master of Business Law
    "m.d.", // Doctor of Medicine
    "m.e.s.", // Master of Environmental Studies
    "m.ed.", // Master of Education
    "m.eng.", // Master of Engineering
    "m.f.a.", // Master of Fine Arts
    "m.mus.", // Master of Music
    "m.sc.", // Master of Science
    "ma", // Master of Arts
    "mag.iur.", // Magister Iuris
    "mag.med.vet.", // Magister Medicinae Veterinariae
    "mag.phil.", // Magister Philosophiae
    "mag.rer.nat.", // Magister Rerum Naturalium
    "mas", // Master of Applied Science
    "mba", // Master of Business Administration
    "md", // Doctor of Medicine
    "mib", // Master of International Business
    "mp", // Master of Public Administration
    "mph", // Master of Public Health
    "msc", // Master of Science
    "msw", // Master of Social Work
    "p.c.", // Professional Corporation
    "ph.d.", // Doctor of Philosophy
    "phd", // Doctor of Philosophy
    "prof", // Professor
    "professor", // Professor
    "senior", // Senior
    "snr", // Senior
    "sr", // Senior
    "v", // Fifth
    "vi", // Sixth
    "vii", // Seventh
    "viii", // Eighth
  ];

  if (useLongLists) {
    prefixList = [
      "a",
      "ab",
      "antune",
      "ap",
      "abu",
      "al",
      "alm",
      "alt",
      "bab",
      "bäck",
      "bar",
      "bath",
      "bat",
      "beau",
      "beck",
      "ben",
      "berg",
      "bet",
      "bin",
      "bint",
      "birch",
      "björk",
      "björn",
      "bjur",
      "da",
      "dahl",
      "dal",
      "de",
      "degli",
      "dele",
      "del",
      "della",
      "der",
      "di",
      "dos",
      "du",
      "e",
      "ek",
      "el",
      "escob",
      "esch",
      "fleisch",
      "fitz",
      "fors",
      "gott",
      "griff",
      "haj",
      "haug",
      "holm",
      "ibn",
      "kauf",
      "kil",
      "koop",
      "kvarn",
      "la",
      "le",
      "lind",
      "lönn",
      "lund",
      "mac",
      "mhic",
      "mic",
      "mir",
      "na",
      "naka",
      "neder",
      "nic",
      "ni",
      "nin",
      "nord",
      "norr",
      "ny",
      "o",
      "ua",
      "ui'",
      "öfver",
      "ost",
      "över",
      "öz",
      "papa",
      "pour",
      "quarn",
      "skog",
      "skoog",
      "sten",
      "stor",
      "ström",
      "söder",
      "ter",
      "ter",
      "tre",
      "türk",
      "van",
      "väst",
      "väster",
      "vest",
      "von",
    ];
    titleList = [
      "mr",
      "mrs",
      "ms",
      "miss",
      "dr",
      "herr",
      "monsieur",
      "hr",
      "frau",
      "a v m",
      "admiraal",
      "admiral",
      "air cdre",
      "air commodore",
      "air marshal",
      "air vice marshal",
      "alderman",
      "alhaji",
      "ambassador",
      "baron",
      "barones",
      "brig",
      "brig gen",
      "brig general",
      "brigadier",
      "brigadier general",
      "brother",
      "canon",
      "capt",
      "captain",
      "cardinal",
      "cdr",
      "chief",
      "cik",
      "cmdr",
      "coach",
      "col",
      "col dr",
      "colonel",
      "commandant",
      "commander",
      "commissioner",
      "commodore",
      "comte",
      "comtessa",
      "congressman",
      "conseiller",
      "consul",
      "conte",
      "contessa",
      "corporal",
      "councillor",
      "count",
      "countess",
      "crown prince",
      "crown princess",
      "dame",
      "datin",
      "dato",
      "datuk",
      "datuk seri",
      "deacon",
      "deaconess",
      "dean",
      "dhr",
      "dipl ing",
      "doctor",
      "dott",
      "dott sa",
      "dr",
      "dr ing",
      "dra",
      "drs",
      "embajador",
      "embajadora",
      "en",
      "encik",
      "eng",
      "eur ing",
      "exma sra",
      "exmo sr",
      "f o",
      "father",
      "first lieutient",
      "first officer",
      "flt lieut",
      "flying officer",
      "fr",
      "frau",
      "fraulein",
      "fru",
      "gen",
      "generaal",
      "general",
      "governor",
      "graaf",
      "gravin",
      "group captain",
      "grp capt",
      "h e dr",
      "h h",
      "h m",
      "h r h",
      "hajah",
      "haji",
      "hajim",
      "her highness",
      "her majesty",
      "herr",
      "high chief",
      "his highness",
      "his holiness",
      "his majesty",
      "hon",
      "hr",
      "hra",
      "ing",
      "ir",
      "jonkheer",
      "judge",
      "justice",
      "khun ying",
      "kolonel",
      "lady",
      "lcda",
      "lic",
      "lieut",
      "lieut cdr",
      "lieut col",
      "lieut gen",
      "lord",
      "m",
      "m l",
      "m r",
      "madame",
      "mademoiselle",
      "maj gen",
      "major",
      "master",
      "mevrouw",
      "miss",
      "mlle",
      "mme",
      "monsieur",
      "monsignor",
      "mr",
      "mrs",
      "ms",
      "mstr",
      "nti",
      "pastor",
      "president",
      "prince",
      "princess",
      "princesse",
      "prinses",
      "prof",
      "prof dr",
      "prof sir",
      "professor",
      "puan",
      "puan sri",
      "rabbi",
      "rear admiral",
      "rev",
      "rev canon",
      "rev dr",
      "rev mother",
      "reverend",
      "rva",
      "senator",
      "sergeant",
      "sheikh",
      "sheikha",
      "sig",
      "sig na",
      "sig ra",
      "sir",
      "sister",
      "sqn ldr",
      "sr",
      "sr d",
      "sra",
      "srta",
      "sultan",
      "tan sri",
      "tan sri dato",
      "tengku",
      "teuku",
      "than puying",
      "the hon dr",
      "the hon justice",
      "the hon miss",
      "the hon mr",
      "the hon mrs",
      "the hon ms",
      "the hon sir",
      "the very rev",
      "toh puan",
      "tun",
      "vice admiral",
      "viscount",
      "viscountess",
      "wg cdr",
      "ind",
      "misc",
      "mx",
      "divers",
      "diverse",
      "diverses",
      "diversi",
      "diversos",
      "diversas",
    ];
  } else {
    prefixList = [
      "ab",
      "bar",
      "bin",
      "da",
      "dal",
      "de",
      "de la",
      "del",
      "della",
      "der",
      "di",
      "du",
      "ibn",
      "l'",
      "la",
      "le",
      "san",
      "st",
      "st.",
      "ste",
      "ter",
      "van",
      "van de",
      "van der",
      "van den",
      "vel",
      "ver",
      "vere",
      "von",
    ];
    titleList = [
      "dr",
      "miss",
      "mr",
      "mrs",
      "ms",
      "prof",
      "sir",
      "frau",
      "herr",
      "hr",
      "monsieur",
      "captain",
      "doctor",
      "judge",
      "officer",
      "professor",
      "ind",
      "misc",
      "mx",
      "divers",
      "diverse",
      "diverses",
      "diversi",
      "diversos",
      "diversas",
    ];
  }

  // Nickname: remove and store parts with surrounding punctuation as nicknames
  regex = /\s(?:[‘’']([^‘’']+)[‘’']|[“”"]([^“”"]+)[“”"]|\[([^\]]+)\]|\(([^\)]+)\)),?\s/g;
  partFound = (" " + nameToParse + " ").match(regex);
  if (partFound) partsFound = partsFound.concat(partFound);
  partsFoundCount = partsFound.length;
  if (partsFoundCount === 1) {
    parsedName.nick = partsFound[0].slice(2).slice(0, -2);
    if (parsedName.nick.slice(-1) === ",") {
      parsedName.nick = parsedName.nick.slice(0, -1);
    }
    nameToParse = (" " + nameToParse + " ").replace(partsFound[0], " ").trim();
    partsFound = [];
  } else if (partsFoundCount > 1) {
    handleError(partsFoundCount + " nicknames found");
    for (i = 0; i < partsFoundCount; i++) {
      nameToParse = (" " + nameToParse + " ").replace(partsFound[i], " ").trim();
      partsFound[i] = partsFound[i].slice(2).slice(0, -2);
      if (partsFound[i].slice(-1) === ",") {
        partsFound[i] = partsFound[i].slice(0, -1);
      }
    }
    parsedName.nick = partsFound.join(", ");
    partsFound = [];
  }
  if (!nameToParse.trim().length) {
    const fixedName = fixParsedNameCase(parsedName, fixCase as number);
    const normalizedName = toPublicName(normalizeParsedName(fixedName));
    if (partToReturn === "all" || !partToReturn) {
      return normalizedName;
    } else {
      return normalizedName[partToReturn] as any;
    }
  }

  // Split remaining nameToParse into parts, remove and store preceding commas
  for (i = 0, n = nameToParse.split(" "), l = n.length; i < l; i++) {
    part = n[i];
    comma = null;
    if (part.slice(-1) === ",") {
      comma = ",";
      part = part.slice(0, -1);
    }
    nameParts.push(part);
    nameCommas.push(comma);
  }

  // Suffix: remove and store matching parts as suffixes
  for (l = nameParts.length, i = l - 1; i > 0; i--) {
    partToCheck =
      nameParts[i].slice(-1) === "."
        ? nameParts[i].slice(0, -1).toLowerCase()
        : nameParts[i].toLowerCase();
    // A handful of list entries are also real surnames: "ma" (Master of Arts)
    // is the common Chinese surname, and "ba" / "di" / "mas" collide the same
    // way. Two guards apply to those — and ONLY those — because an unambiguous
    // suffix cannot be a surname, and a blanket rule would turn "Smith, Jr."
    // into a first name of "Jr.".
    if (SURNAME_AMBIGUOUS_SUFFIXES.includes(partToCheck)) {
      // Guard 1 — capitalization, which is a ONE-DIRECTIONAL signal. A degree is
      // written "MA" or "M.A.", never "Ma", so a title-cased (or lowercase)
      // token is definitely NOT a suffix and the collision is settled outright:
      // "Wei Li Ma" keeps Ma as the surname. The converse does not hold — an
      // all-caps document renders the surname as "MA" too — so caps alone
      // proves nothing and only falls through to the next guard.
      const raw = nameParts[i].slice(-1) === "." ? nameParts[i].slice(0, -1) : nameParts[i];
      if (raw !== raw.toUpperCase()) continue;

      // Guard 2 — for the still-ambiguous all-caps case, refuse to strip the
      // token when doing so would leave a single name part: "JACK MA" is
      // overwhelmingly a person rather than a mononym holding a Master of Arts.
      // This is the one that matters most, because the unguarded result was not
      // merely inaccurate — it left last="Jack" with NO first name, and a
      // consumer requiring both parts then discards the person entirely.
      //
      // Titles are removed in a LATER pass, so they are still sitting in
      // `nameParts` here and must not be counted as the surviving name: with a
      // raw length check "DR. JACK MA" reads as three parts and strips "MA"
      // anyway, re-opening the very collapse this guard exists to stop.
      const titleListToCheck = titleList.map((value: string) => value.toLowerCase());
      const isTitlePart = (value: string): boolean => {
        const bare = value.slice(-1) === "." ? value.slice(0, -1).toLowerCase() : value.toLowerCase();
        return titleListToCheck.includes(bare) || titleListToCheck.includes(bare + ".");
      };
      const remainingNameParts = nameParts.filter(
        (value: string, index: number) => index !== i && !isTitlePart(value)
      ).length;
      if (remainingNameParts < 2) continue;
    }
    if (suffixList.indexOf(partToCheck) > -1 || suffixList.indexOf(partToCheck + ".") > -1) {
      // Check for suffixes that could also be titles
      const titleListToCheck = titleList.map((value: string) => value.toLowerCase());
      const isAlsoTitle =
        titleListToCheck.indexOf(partToCheck) > -1 ||
        titleListToCheck.indexOf(partToCheck + ".") > -1;

      if (isAlsoTitle) {
        // For suffix-priority terms (generational suffixes), always treat as suffix when at end
        const suffixPriorityTerms = [
          "sr",
          "senior",
          "jr",
          "junior",
          "snr",
          "ii",
          "iii",
          "iv",
          "v",
          "2nd",
          "3rd",
          "4th",
          "5th",
        ];
        const isSuffixPriority = suffixPriorityTerms.includes(partToCheck);

        if (isSuffixPriority) {
          // Always treat suffix-priority terms as suffixes
          partsFound = nameParts.splice(i, 1).concat(partsFound);
          if (nameCommas[i] === ",") {
            // Keep comma, either before or after
            nameCommas.splice(i + 1, 1);
          } else {
            nameCommas.splice(i, 1);
          }
        } else {
          // If this suffix is also a title, only treat it as a suffix if there are other title parts
          const otherNameParts = nameParts
            .map((value: string) =>
              value.slice(-1) === "." ? value.slice(0, -1).toLowerCase() : value.toLowerCase()
            )
            .filter((_: string, index: number) => index !== i);

          if (titleListToCheck.some((value: string) => otherNameParts.includes(value))) {
            partsFound = nameParts.splice(i, 1).concat(partsFound);
            if (nameCommas[i] === ",") {
              // Keep comma, either before or after
              nameCommas.splice(i + 1, 1);
            } else {
              nameCommas.splice(i, 1);
            }
          }
        }
      } else {
        // This is a suffix and not a title, so treat it as a suffix
        partsFound = nameParts.splice(i, 1).concat(partsFound);
        if (nameCommas[i] === ",") {
          // Keep comma, either before or after
          nameCommas.splice(i + 1, 1);
        } else {
          nameCommas.splice(i, 1);
        }
      }
    }
  }
  partsFoundCount = partsFound.length;
  if (partsFoundCount === 1) {
    parsedName.suffix = partsFound[0];
    partsFound = [];
  } else if (partsFoundCount > 1) {
    handleError(partsFoundCount + " suffixes found");
    parsedName.suffix = partsFound.join(", ");
    partsFound = [];
  }
  if (!nameParts.length) {
    const fixedName = fixParsedNameCase(parsedName, fixCase as number);
    const normalizedName = toPublicName(normalizeParsedName(fixedName));
    if (partToReturn === "all" || !partToReturn) {
      return normalizedName;
    } else {
      return normalizedName[partToReturn] as any;
    }
  }

  // Title: remove and store matching parts as titles
  for (l = nameParts.length, i = l - 1; i >= 0; i--) {
    partToCheck =
      nameParts[i].slice(-1) === "."
        ? nameParts[i].slice(0, -1).toLowerCase()
        : nameParts[i].toLowerCase();
    if (titleList.indexOf(partToCheck) > -1 || titleList.indexOf(partToCheck + ".") > -1) {
      partsFound = nameParts.splice(i, 1).concat(partsFound);
      if (nameCommas[i] === ",") {
        // Keep comma, either before or after
        nameCommas.splice(i + 1, 1);
      } else {
        nameCommas.splice(i, 1);
      }
    }
  }

  partsFoundCount = partsFound.length;
  if (partsFoundCount === 1) {
    parsedName.title = partsFound[0];
    partsFound = [];
  } else if (partsFoundCount > 1) {
    handleError(partsFoundCount + " titles found");
    parsedName.title = partsFound.join(", ");
    partsFound = [];
  }
  if (!nameParts.length) {
    const fixedName = fixParsedNameCase(parsedName, fixCase as number);
    const normalizedName = toPublicName(normalizeParsedName(fixedName));
    if (partToReturn === "all" || !partToReturn) {
      return normalizedName;
    } else {
      return normalizedName[partToReturn] as any;
    }
  }

  // Join name prefixes to following names
  if (nameParts.length > 1) {
    for (i = nameParts.length - 2; i >= 0; i--) {
      if (prefixList.indexOf(nameParts[i].toLowerCase()) > -1) {
        nameParts[i] = nameParts[i] + " " + nameParts[i + 1];
        nameParts.splice(i + 1, 1);
        nameCommas.splice(i + 1, 1);
      }
    }
  }

  // Join conjunctions to surrounding names
  if (nameParts.length > 2) {
    for (i = nameParts.length - 3; i >= 0; i--) {
      if (conjunctionList.indexOf(nameParts[i + 1].toLowerCase()) > -1) {
        nameParts[i] = nameParts[i] + " " + nameParts[i + 1] + " " + nameParts[i + 2];
        nameParts.splice(i + 1, 2);
        nameCommas.splice(i + 1, 2);
        i--;
      }
    }
  }

  // Suffix: remove and store items after extra commas as suffixes
  nameCommas.pop();
  firstComma = nameCommas.indexOf(",");
  remainingCommas = nameCommas.filter((v: string | null) => v !== null).length;
  if (firstComma > 1 || remainingCommas > 1) {
    for (i = nameParts.length - 1; i >= 2; i--) {
      if (nameCommas[i] === ",") {
        partsFound = nameParts.splice(i, 1).concat(partsFound);
        nameCommas.splice(i, 1);
        remainingCommas--;
      } else {
        break;
      }
    }
  }
  if (partsFound.length) {
    if (parsedName.suffix) {
      partsFound = [parsedName.suffix].concat(partsFound);
    }
    parsedName.suffix = partsFound.join(", ");
    partsFound = [];
  }

  // Last name: remove and store last name
  if (remainingCommas > 0) {
    if (remainingCommas > 1) {
      handleError(remainingCommas - 1 + " extra commas found");
    }
    // Remove and store all parts before first comma as last name
    const commaIndex = nameCommas.indexOf(",");
    if (commaIndex > 0) {
      parsedName.last = nameParts.splice(0, commaIndex).join(" ");
      nameCommas.splice(0, commaIndex);
    }
  } else {
    // Remove and store last part as last name
    const lastPart = nameParts.pop();
    if (lastPart) {
      parsedName.last = lastPart;
    }
  }
  if (!nameParts.length) {
    const fixedName = fixParsedNameCase(parsedName, fixCase as number);
    const normalizedName = toPublicName(normalizeParsedName(fixedName));
    if (partToReturn === "all" || !partToReturn) {
      return normalizedName;
    } else {
      return normalizedName[partToReturn] as any;
    }
  }

  // First name: remove and store first part as first name
  if (suffixList.includes(nameParts[0].toLowerCase())) {
    const suffixPart = nameParts.shift();
    if (suffixPart) {
      parsedName.suffix = suffixPart;
    }
  }
  const firstPart = nameParts.shift();
  if (firstPart) {
    parsedName.first = firstPart;
  }
  if (!nameParts.length) {
    const fixedName = fixParsedNameCase(parsedName, fixCase as number);
    const normalizedName = toPublicName(normalizeParsedName(fixedName));
    if (partToReturn === "all" || !partToReturn) {
      return normalizedName;
    } else {
      return normalizedName[partToReturn] as any;
    }
  }

  // Middle name: store all remaining parts as middle name
  if (nameParts.length > 2) {
    handleError(nameParts.length + " middle names");
  }
  parsedName.middle = nameParts.join(" ");

  const fixedName = fixParsedNameCase(parsedName, fixCase as number);
  const normalizedName = toPublicName(normalizeParsedName(fixedName));
  for (const key in normalizedName) {
    const val = normalizedName[key as keyof ParsedName];
    if (typeof val === "string") {
      normalizedName[key as keyof ParsedName] = val.trim() as any;
    } else if (Array.isArray(val)) {
      normalizedName[key as keyof ParsedName] = val.map((v: string) => v.trim()) as any;
    }
  }
  return partToReturn === "all" ? normalizedName : normalizedName[partToReturn as keyof ParsedName];
}
