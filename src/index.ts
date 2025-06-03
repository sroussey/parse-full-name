interface ParsedName {
  title: string;
  first: string;
  middle: string;
  last: string;
  nick: string;
  suffix: string;
  error: string[];
}

type PartToReturn = 'title' | 'first' | 'middle' | 'last' | 'nick' | 'suffix' | 'error' | 'all';

type FixCaseOption = boolean | number; // -1, 0, 1
type StopOnErrorOption = boolean | number; // 0, 1
type UseLongListsOption = boolean | number; // 0, 1

// Function overloads for better type safety
export function parseFullName(
  nameToParse: string,
  partToReturn: 'error',
  fixCase?: FixCaseOption,
  stopOnError?: StopOnErrorOption,
  useLongLists?: UseLongListsOption
): string[];

export function parseFullName(
  nameToParse: string,
  partToReturn: PartToReturn,
  fixCase?: FixCaseOption,
  stopOnError?: StopOnErrorOption,
  useLongLists?: UseLongListsOption
): string;

export function parseFullName(
  nameToParse: string,
  partToReturn?: 'all',
  fixCase?: FixCaseOption,
  stopOnError?: StopOnErrorOption,
  useLongLists?: UseLongListsOption
): ParsedName;

export function parseFullName(
  nameToParse: string,
  partToReturn?: PartToReturn,
  fixCase?: FixCaseOption,
  stopOnError?: StopOnErrorOption,
  useLongLists?: UseLongListsOption
): ParsedName | string | string[] {
  'use strict';

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

  const conjunctionList: string[] = ['&', 'and', 'et', 'e', 'of', 'the', 'und', 'y'];

  const parsedName: ParsedName = {
    title: '',
    first: '',
    middle: '',
    last: '',
    nick: '',
    suffix: '',
    error: [],
  };

  // Validate inputs, or set to defaults
  const validParts: PartToReturn[] = ['title', 'first', 'middle', 'last', 'nick', 'suffix', 'error'];
  partToReturn =
    partToReturn && validParts.indexOf(partToReturn.toLowerCase() as PartToReturn) > -1
      ? (partToReturn.toLowerCase() as PartToReturn)
      : 'all';
  // 'all' = return object with all parts, others return single part

  if (fixCase === false) fixCase = 0;
  if (fixCase === true) fixCase = 1;
  fixCase = fixCase !== undefined && (fixCase === 0 || fixCase === 1) ? fixCase : -1; // -1 = fix case only if input is all upper or lowercase

  if (stopOnError === true) stopOnError = 1;
  stopOnError = stopOnError && stopOnError === 1 ? 1 : 0;
  // false = output warnings on parse error, but don't stop

  if (useLongLists === true) useLongLists = 1;
  useLongLists = useLongLists && useLongLists === 1 ? 1 : 0; // 0 = short lists

  // If stopOnError = 1, throw error, otherwise return error messages in array
  function handleError(errorMessage: string): void {
    if (stopOnError) {
      throw new Error('Error: ' + errorMessage);
    } else {
      parsedName.error.push('Error: ' + errorMessage);
    }
  }

  // If fixCase = 1, fix case of parsedName parts before returning
  function fixParsedNameCase(fixedCaseName: ParsedName, fixCaseNow: number | boolean): ParsedName {
    const forceCaseList: string[] = [
      'e',
      'y',
      'av',
      'af',
      'da',
      'dal',
      'de',
      'del',
      'der',
      'di',
      'la',
      'le',
      'van',
      'der',
      'den',
      'vel',
      'von',
      'II',
      'III',
      'IV',
      'J.D.',
      'LL.M.',
      'M.D.',
      'D.O.',
      'D.C.',
      'Ph.D.',
      'Dipl.-Ing.',
      'B.A.',
      'B.Sc.',
      'B.Eng.',
      'LL.B.',
      'B.Ed',
      'B.F.A.',
      'B.Mus.',
      'BBA',
      'M.A.',
      'M.Sc.',
      'M.Eng.',
      'LL.M.',
      'M.Ed.',
      'M.F.A.',
      'M.Mus.',
      'MBA',
      'MPH',
      'MSW',
      'Dr.',
      'Dr.phil.',
      'Dr.rer.nat.',
      'Dr.rer.pol.',
      'Dr.-Ing.',
      'Dr.med.',
      'Dr.med.dent.',
      'Dr.med.vent.',
      'Dr.jur.',
      'Dr.theol.',
      'Dr.agr.',
      'Dr.soc.sc.',
      'Prof.',
      'Dr.h.c.',
      'Dr.mult.',
      'Dr.habil.',
      'Dipl.-Ing.',
      'Dipl.-Kfm.',
      'Dipl.-Kffr.',
    ];
    let forceCaseListIndex: number;
    let namePartWords: string[]; // Removed unused outer namePartLabels

    if (fixCaseNow) {
      const namePartLabels = Object.keys(parsedName).filter((v: string) => v !== 'error') as (keyof Omit<
        ParsedName,
        'error'
      >)[];

      for (i = 0, l = namePartLabels.length; i < l; i++) {
        const currentLabel = namePartLabels[i];
        if (fixedCaseName[currentLabel]) {
          namePartWords = (fixedCaseName[currentLabel] + '').split(' ');
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
              namePartWords[j] = namePartWords[j].slice(0, 3) + namePartWords[j].slice(3).toLowerCase();
            } else if (
              currentLabel === 'suffix' &&
              namePartWords[j].slice(-1) !== '.' &&
              suffixList.indexOf(namePartWords[j].toLowerCase()) === -1
            ) {
              // Convert suffix abbreviations to UPPER CASE
              if (namePartWords[j] === namePartWords[j].toLowerCase()) {
                namePartWords[j] = namePartWords[j].toUpperCase();
              }
            } else {
              // Convert to Title Case
              namePartWords[j] = namePartWords[j].slice(0, 1).toUpperCase() + namePartWords[j].slice(1).toLowerCase();
            }
          }
          fixedCaseName[currentLabel] = namePartWords.join(' ');
        }
      }
    }
    return fixedCaseName;
  }

  // If no input name, or input name is not a string, abort
  if (!nameToParse || typeof nameToParse !== 'string') {
    handleError('No input');
    const fixedName = fixParsedNameCase(parsedName, fixCase as number);
    if (partToReturn === 'all' || !partToReturn) {
      return fixedName;
    } else {
      return fixedName[partToReturn] as any;
    }
  } else {
    nameToParse = nameToParse.trim();
  }

  // Auto-detect fixCase: fix if nameToParse is all upper or all lowercase
  if (fixCase === -1) {
    fixCase = nameToParse === nameToParse.toUpperCase() || nameToParse === nameToParse.toLowerCase() ? 1 : 0;
  }

  // Initialize lists of prefixes, suffixes, and titles to detect
  // Note: These list entries must be all lowercase
  suffixList = [
    '2', // Second
    'b.ed', // Bachelor of Education
    'b.a.', // Bachelor of Arts
    'b.eng.', // Bachelor of Engineering
    'b.f.a.', // Bachelor of Fine Arts
    'b.mus.', // Bachelor of Music
    'b.sc.', // Bachelor of Science
    'ba', // Bachelor of Arts
    'bba', // Bachelor of Business Administration
    'beng', // Bachelor of Engineering
    'bsc', // Bachelor of Science
    'cfp', // Certified Financial Planner
    'chfc', // Chartered Financial Consultant
    'clu', // Chartered Life Underwriter
    'd.c.', // Doctor of Chiropractic
    'd.o.', // Doctor of Osteopathic Medicine
    'di', // Diplom
    'dipl.-kffr.', // Diplom-Ingenieur
    'dipl.-kfm.', // Diplom-Ingenieur
    'dipl.-ing.', // Diplom-Ingenieur
    'doctor', // Doctor
    'dr', // Doctor
    'dr.-ing.', // Diplom-Ingenieur
    'dr.agr.', // Doctor Agriculturae
    'dr.h.c.', // Doctor Honoris Causa
    'dr.habil.', // Doctor Habilitatus
    'dr.iur.', // Doctor Iuris
    'dr.jur.', // Doctor Juris
    'dr.med.', // Doctor Medicinae
    'dr.med.dent.', // Doctor Medicinae Dentariae
    'dr.mont.', // Doctor Montium
    'dr.mult.', // Doctor Multidisciplinaris
    'dr.nat.techn.', // Doctor Naturae Technologiae
    'dr.phil.', // Doctor Philosophiae
    'dr.rer.nat.', // Doctor Rerum Naturalium
    'dr.rer.pol.', // Doctor Rerum Politicarum
    'dr.rer.soc.oec.', // Doctor Rerum Societatis Oeconomicarum
    'dr.scient.med.', // Doctor Scientiae Medicinae
    'dr.soc.sc.', // Doctor Scientiarum Socialium
    'dr.theol.', // Doctor Theologiae
    'esq', // Esquire
    'esquire', // Esquire
    'ii', // Second
    'iii', // Third
    'iv', // Fourth
    'j.d.', // Juris Doctor
    'jnr', // Junior
    'jr', // Junior
    'll.b.', // Bachelor of Laws
    'll.m.', // Master of Laws
    'llm', // Master of Laws
    'm.a.', // Master of Arts
    'm.a.i.s.', // Master of Advanced International Studies
    'm.b.l.', // Master of Business Law
    'm.d.', // Doctor of Medicine
    'm.e.s.', // Master of Environmental Studies
    'm.ed.', // Master of Education
    'm.eng.', // Master of Engineering
    'm.f.a.', // Master of Fine Arts
    'm.mus.', // Master of Music
    'm.sc.', // Master of Science
    'ma', // Master of Arts
    'mag.iur.', // Magister Iuris
    'mag.med.vet.', // Magister Medicinae Veterinariae
    'mag.phil.', // Magister Philosophiae
    'mag.rer.nat.', // Magister Rerum Naturalium
    'mas', // Master of Applied Science
    'mba', // Master of Business Administration
    'md', // Doctor of Medicine
    'mib', // Master of International Business
    'mp', // Master of Public Administration
    'mph', // Master of Public Health
    'msc', // Master of Science
    'msw', // Master of Social Work
    'p.c.', // Professional Corporation
    'ph.d.', // Doctor of Philosophy
    'phd', // Doctor of Philosophy
    'prof', // Professor
    'professor', // Professor
    'snr', // Senior
    'sr', // Senior
    'v', // Fifth
  ];

  if (useLongLists) {
    prefixList = [
      'a',
      'ab',
      'antune',
      'ap',
      'abu',
      'al',
      'alm',
      'alt',
      'bab',
      'bäck',
      'bar',
      'bath',
      'bat',
      'beau',
      'beck',
      'ben',
      'berg',
      'bet',
      'bin',
      'bint',
      'birch',
      'björk',
      'björn',
      'bjur',
      'da',
      'dahl',
      'dal',
      'de',
      'degli',
      'dele',
      'del',
      'della',
      'der',
      'di',
      'dos',
      'du',
      'e',
      'ek',
      'el',
      'escob',
      'esch',
      'fleisch',
      'fitz',
      'fors',
      'gott',
      'griff',
      'haj',
      'haug',
      'holm',
      'ibn',
      'kauf',
      'kil',
      'koop',
      'kvarn',
      'la',
      'le',
      'lind',
      'lönn',
      'lund',
      'mac',
      'mhic',
      'mic',
      'mir',
      'na',
      'naka',
      'neder',
      'nic',
      'ni',
      'nin',
      'nord',
      'norr',
      'ny',
      'o',
      'ua',
      "ui'",
      'öfver',
      'ost',
      'över',
      'öz',
      'papa',
      'pour',
      'quarn',
      'skog',
      'skoog',
      'sten',
      'stor',
      'ström',
      'söder',
      'ter',
      'ter',
      'tre',
      'türk',
      'van',
      'väst',
      'väster',
      'vest',
      'von',
    ];
    titleList = [
      'mr',
      'mrs',
      'ms',
      'miss',
      'dr',
      'herr',
      'monsieur',
      'hr',
      'frau',
      'a v m',
      'admiraal',
      'admiral',
      'air cdre',
      'air commodore',
      'air marshal',
      'air vice marshal',
      'alderman',
      'alhaji',
      'ambassador',
      'baron',
      'barones',
      'brig',
      'brig gen',
      'brig general',
      'brigadier',
      'brigadier general',
      'brother',
      'canon',
      'capt',
      'captain',
      'cardinal',
      'cdr',
      'chief',
      'cik',
      'cmdr',
      'coach',
      'col',
      'col dr',
      'colonel',
      'commandant',
      'commander',
      'commissioner',
      'commodore',
      'comte',
      'comtessa',
      'congressman',
      'conseiller',
      'consul',
      'conte',
      'contessa',
      'corporal',
      'councillor',
      'count',
      'countess',
      'crown prince',
      'crown princess',
      'dame',
      'datin',
      'dato',
      'datuk',
      'datuk seri',
      'deacon',
      'deaconess',
      'dean',
      'dhr',
      'dipl ing',
      'doctor',
      'dott',
      'dott sa',
      'dr',
      'dr ing',
      'dra',
      'drs',
      'embajador',
      'embajadora',
      'en',
      'encik',
      'eng',
      'eur ing',
      'exma sra',
      'exmo sr',
      'f o',
      'father',
      'first lieutient',
      'first officer',
      'flt lieut',
      'flying officer',
      'fr',
      'frau',
      'fraulein',
      'fru',
      'gen',
      'generaal',
      'general',
      'governor',
      'graaf',
      'gravin',
      'group captain',
      'grp capt',
      'h e dr',
      'h h',
      'h m',
      'h r h',
      'hajah',
      'haji',
      'hajim',
      'her highness',
      'her majesty',
      'herr',
      'high chief',
      'his highness',
      'his holiness',
      'his majesty',
      'hon',
      'hr',
      'hra',
      'ing',
      'ir',
      'jonkheer',
      'judge',
      'justice',
      'khun ying',
      'kolonel',
      'lady',
      'lcda',
      'lic',
      'lieut',
      'lieut cdr',
      'lieut col',
      'lieut gen',
      'lord',
      'm',
      'm l',
      'm r',
      'madame',
      'mademoiselle',
      'maj gen',
      'major',
      'master',
      'mevrouw',
      'miss',
      'mlle',
      'mme',
      'monsieur',
      'monsignor',
      'mr',
      'mrs',
      'ms',
      'mstr',
      'nti',
      'pastor',
      'president',
      'prince',
      'princess',
      'princesse',
      'prinses',
      'prof',
      'prof dr',
      'prof sir',
      'professor',
      'puan',
      'puan sri',
      'rabbi',
      'rear admiral',
      'rev',
      'rev canon',
      'rev dr',
      'rev mother',
      'reverend',
      'rva',
      'senator',
      'sergeant',
      'sheikh',
      'sheikha',
      'sig',
      'sig na',
      'sig ra',
      'sir',
      'sister',
      'sqn ldr',
      'sr',
      'sr d',
      'sra',
      'srta',
      'sultan',
      'tan sri',
      'tan sri dato',
      'tengku',
      'teuku',
      'than puying',
      'the hon dr',
      'the hon justice',
      'the hon miss',
      'the hon mr',
      'the hon mrs',
      'the hon ms',
      'the hon sir',
      'the very rev',
      'toh puan',
      'tun',
      'vice admiral',
      'viscount',
      'viscountess',
      'wg cdr',
      'ind',
      'misc',
      'mx',
      'divers',
      'diverse',
      'diverses',
      'diversi',
      'diversos',
      'diversas',
    ];
  } else {
    prefixList = [
      'ab',
      'bar',
      'bin',
      'da',
      'dal',
      'de',
      'de la',
      'del',
      'della',
      'der',
      'di',
      'du',
      'ibn',
      "l'",
      'la',
      'le',
      'san',
      'st',
      'st.',
      'ste',
      'ter',
      'van',
      'van de',
      'van der',
      'van den',
      'vel',
      'ver',
      'vere',
      'von',
    ];
    titleList = [
      'dr',
      'miss',
      'mr',
      'mrs',
      'ms',
      'prof',
      'sir',
      'frau',
      'herr',
      'hr',
      'monsieur',
      'captain',
      'doctor',
      'judge',
      'officer',
      'professor',
      'ind',
      'misc',
      'mx',
      'divers',
      'diverse',
      'diverses',
      'diversi',
      'diversos',
      'diversas',
    ];
  }

  // Nickname: remove and store parts with surrounding punctuation as nicknames
  regex = /\s(?:[‘’']([^‘’']+)[‘’']|[“”"]([^“”"]+)[“”"]|\[([^\]]+)\]|\(([^\)]+)\)),?\s/g;
  partFound = (' ' + nameToParse + ' ').match(regex);
  if (partFound) partsFound = partsFound.concat(partFound);
  partsFoundCount = partsFound.length;
  if (partsFoundCount === 1) {
    parsedName.nick = partsFound[0].slice(2).slice(0, -2);
    if (parsedName.nick.slice(-1) === ',') {
      parsedName.nick = parsedName.nick.slice(0, -1);
    }
    nameToParse = (' ' + nameToParse + ' ').replace(partsFound[0], ' ').trim();
    partsFound = [];
  } else if (partsFoundCount > 1) {
    handleError(partsFoundCount + ' nicknames found');
    for (i = 0; i < partsFoundCount; i++) {
      nameToParse = (' ' + nameToParse + ' ').replace(partsFound[i], ' ').trim();
      partsFound[i] = partsFound[i].slice(2).slice(0, -2);
      if (partsFound[i].slice(-1) === ',') {
        partsFound[i] = partsFound[i].slice(0, -1);
      }
    }
    parsedName.nick = partsFound.join(', ');
    partsFound = [];
  }
  if (!nameToParse.trim().length) {
    const fixedName = fixParsedNameCase(parsedName, fixCase as number);
    if (partToReturn === 'all' || !partToReturn) {
      return fixedName;
    } else {
      return fixedName[partToReturn] as any;
    }
  }

  // Split remaining nameToParse into parts, remove and store preceding commas
  for (i = 0, n = nameToParse.split(' '), l = n.length; i < l; i++) {
    part = n[i];
    comma = null;
    if (part.slice(-1) === ',') {
      comma = ',';
      part = part.slice(0, -1);
    }
    nameParts.push(part);
    nameCommas.push(comma);
  }

  // Suffix: remove and store matching parts as suffixes
  for (l = nameParts.length, i = l - 1; i > 0; i--) {
    partToCheck = nameParts[i].slice(-1) === '.' ? nameParts[i].slice(0, -1).toLowerCase() : nameParts[i].toLowerCase();
    if (suffixList.indexOf(partToCheck) > -1 || suffixList.indexOf(partToCheck + '.') > -1) {
      // Check for suffixes that are also can be titles
      const otherNameParts = nameParts
        .map((value: string) => (value.slice(-1) === '.' ? value.slice(0, -1).toLowerCase() : value.toLowerCase()))
        .filter((_: string, index: number) => index !== i);

      const titleListToCheck = titleList.map((value: string) => value.toLowerCase());

      if (titleListToCheck.some((value: string) => otherNameParts.includes(value))) {
        partsFound = nameParts.splice(i, 1).concat(partsFound);
        if (nameCommas[i] === ',') {
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
    handleError(partsFoundCount + ' suffixes found');
    parsedName.suffix = partsFound.join(', ');
    partsFound = [];
  }
  if (!nameParts.length) {
    const fixedName = fixParsedNameCase(parsedName, fixCase as number);
    if (partToReturn === 'all' || !partToReturn) {
      return fixedName;
    } else {
      return fixedName[partToReturn] as any;
    }
  }

  // Title: remove and store matching parts as titles
  for (l = nameParts.length, i = l - 1; i >= 0; i--) {
    partToCheck = nameParts[i].slice(-1) === '.' ? nameParts[i].slice(0, -1).toLowerCase() : nameParts[i].toLowerCase();
    if (titleList.indexOf(partToCheck) > -1 || titleList.indexOf(partToCheck + '.') > -1) {
      partsFound = nameParts.splice(i, 1).concat(partsFound);
      if (nameCommas[i] === ',') {
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
    handleError(partsFoundCount + ' titles found');
    parsedName.title = partsFound.join(', ');
    partsFound = [];
  }
  if (!nameParts.length) {
    const fixedName = fixParsedNameCase(parsedName, fixCase as number);
    if (partToReturn === 'all' || !partToReturn) {
      return fixedName;
    } else {
      return fixedName[partToReturn] as any;
    }
  }

  // Join name prefixes to following names
  if (nameParts.length > 1) {
    for (i = nameParts.length - 2; i >= 0; i--) {
      if (prefixList.indexOf(nameParts[i].toLowerCase()) > -1) {
        nameParts[i] = nameParts[i] + ' ' + nameParts[i + 1];
        nameParts.splice(i + 1, 1);
        nameCommas.splice(i + 1, 1);
      }
    }
  }

  // Join conjunctions to surrounding names
  if (nameParts.length > 2) {
    for (i = nameParts.length - 3; i >= 0; i--) {
      if (conjunctionList.indexOf(nameParts[i + 1].toLowerCase()) > -1) {
        nameParts[i] = nameParts[i] + ' ' + nameParts[i + 1] + ' ' + nameParts[i + 2];
        nameParts.splice(i + 1, 2);
        nameCommas.splice(i + 1, 2);
        i--;
      }
    }
  }

  // Suffix: remove and store items after extra commas as suffixes
  nameCommas.pop();
  firstComma = nameCommas.indexOf(',');
  remainingCommas = nameCommas.filter((v: string | null) => v !== null).length;
  if (firstComma > 1 || remainingCommas > 1) {
    for (i = nameParts.length - 1; i >= 2; i--) {
      if (nameCommas[i] === ',') {
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
    parsedName.suffix = partsFound.join(', ');
    partsFound = [];
  }

  // Last name: remove and store last name
  if (remainingCommas > 0) {
    if (remainingCommas > 1) {
      handleError(remainingCommas - 1 + ' extra commas found');
    }
    // Remove and store all parts before first comma as last name
    const commaIndex = nameCommas.indexOf(',');
    if (commaIndex > 0) {
      parsedName.last = nameParts.splice(0, commaIndex).join(' ');
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
    if (partToReturn === 'all' || !partToReturn) {
      return fixedName;
    } else {
      return fixedName[partToReturn] as any;
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
    if (partToReturn === 'all' || !partToReturn) {
      return fixedName;
    } else {
      return fixedName[partToReturn] as any;
    }
  }

  // Middle name: store all remaining parts as middle name
  if (nameParts.length > 2) {
    handleError(nameParts.length + ' middle names');
  }
  parsedName.middle = nameParts.join(' ');

  const fixedName = fixParsedNameCase(parsedName, fixCase as number);
  return partToReturn === 'all' ? fixedName : fixedName[partToReturn as keyof ParsedName];
}
