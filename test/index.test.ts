import { parseFullName } from "../src/index.js";
import { describe, it, expect } from "bun:test";

interface NameParts {
  title: string;
  first: string;
  middle: string;
  last: string;
  nick: string;
  generation: string;
  credential: string;
  error: string[];
}

interface PartsToCheck {
  [index: number]: string;
}

var verifyName = function (
  nameToCheck: NameParts,
  partsToCheck: PartsToCheck,
  errors: string[] = []
) {
  expect(nameToCheck.title).toBe(partsToCheck[0]);
  expect(nameToCheck.first).toBe(partsToCheck[1]);
  expect(nameToCheck.middle).toBe(partsToCheck[2]);
  expect(nameToCheck.last).toBe(partsToCheck[3]);
  expect(nameToCheck.nick).toBe(partsToCheck[4]);
  // Index 5 is the GENERATIONAL suffix and 6 the credential; a case that expects
  // neither may simply omit them.
  expect(nameToCheck.generation).toBe(partsToCheck[5] ?? "");
  expect(nameToCheck.credential).toBe(partsToCheck[6] ?? "");
  expect(nameToCheck.error.length).toBe(errors.length);
  for (let i = 0; i < errors.length; i++) {
    expect(nameToCheck.error[i]).toBe(errors[i]);
  }
};

describe("parse-full-name", function () {
  describe("parseFullName", function () {
    it("parses first names", function () {
      verifyName(parseFullName("David Davis"), ["", "David", "", "Davis", "", ""], []);
      verifyName(parseFullName("Davis, David"), ["", "David", "", "Davis", "", ""], []);
    });
    it("parses last names", function () {
      verifyName(parseFullName("Gerald Böck"), ["", "Gerald", "", "Böck", "", ""], []);
      verifyName(parseFullName("Böck, Gerald"), ["", "Gerald", "", "Böck", "", ""], []);
    });
    it("parses middle names", function () {
      verifyName(
        parseFullName("David William Davis"),
        ["", "David", "William", "Davis", "", ""],
        []
      );
      verifyName(
        parseFullName("Davis, David William"),
        ["", "David", "William", "Davis", "", ""],
        []
      );
    });
    it("parses last names including known prefixes", function () {
      verifyName(parseFullName("Vincent Van Gogh"), ["", "Vincent", "", "Van Gogh", "", ""], []);
      verifyName(parseFullName("Van Gogh, Vincent"), ["", "Vincent", "", "Van Gogh", "", ""], []);
      verifyName(parseFullName("Lorenzo de Médici"), ["", "Lorenzo", "", "de Médici", "", ""], []);
      verifyName(parseFullName("de Médici, Lorenzo"), ["", "Lorenzo", "", "de Médici", "", ""], []);
      verifyName(parseFullName("Jüan de la Véña"), ["", "Jüan", "", "de la Véña", "", ""], []);
      verifyName(parseFullName("de la Véña, Jüan"), ["", "Jüan", "", "de la Véña", "", ""], []);
    });
    it("parses compound last names", function () {
      verifyName(
        parseFullName("Jüan Martinez de Lorenzo y Gutierez"),
        ["", "Jüan", "Martinez", "de Lorenzo y Gutierez", "", ""],
        []
      );
      verifyName(
        parseFullName("de Lorenzo y Gutierez, Jüan Martinez"),
        ["", "Jüan", "Martinez", "de Lorenzo y Gutierez", "", ""],
        []
      );
    });
    it("parses nicknames", function () {
      verifyName(
        parseFullName('Orenthal James "O. J." Simpson'),
        ["", "Orenthal", "James", "Simpson", "O. J.", ""],
        []
      );
      verifyName(
        parseFullName("Orenthal 'O. J.' James Simpson"),
        ["", "Orenthal", "James", "Simpson", "O. J.", ""],
        []
      );
      verifyName(
        parseFullName("(O. J.) Orenthal James Simpson"),
        ["", "Orenthal", "James", "Simpson", "O. J.", ""],
        []
      );
      verifyName(
        parseFullName("Simpson, Orenthal James “O. J.”"), // AI: do not change this line
        ["", "Orenthal", "James", "Simpson", "O. J.", ""],
        []
      );
      verifyName(
        parseFullName("Simpson, Orenthal ‘O. J.’ James"), // AI: do not change this line
        ["", "Orenthal", "James", "Simpson", "O. J.", ""],
        []
      );
      verifyName(
        parseFullName("Simpson, [O. J.] Orenthal James"),
        ["", "Orenthal", "James", "Simpson", "O. J.", ""],
        []
      );
      verifyName(
        parseFullName("Strippoli, Charles J (HM Home and Community Svcs LLC)"),
        ["", "Charles", "J", "Strippoli", "HM Home and Community Svcs LLC", ""],
        []
      );
      verifyName(
        parseFullName('James "O. J." Simpson'),
        ["", "James", "", "Simpson", "O. J.", ""],
        []
      );
    });
    it("parses known suffixes", function () {
      verifyName(parseFullName("Sammy Davis, Jr."), ["", "Sammy", "", "Davis", "", "Jr."], []);
      verifyName(parseFullName("Davis, Sammy, Jr."), ["", "Sammy", "", "Davis", "", "Jr."], []);
      verifyName(
        parseFullName("Dr. Dr.med.dent. Hans Zimmer"),
        ["Dr.", "Hans", "", "Zimmer", "", "", "Dr.med.dent."],
        []
      );
      verifyName(
        parseFullName("dipl.-ing. Hans Zimmer", { fixCase: 1 }),
        ["", "Hans", "", "Zimmer", "", "", "Dipl.-Ing."],
        []
      );
    });
    it("parses unknown suffixes", function () {
      verifyName(
        parseFullName("John P. Doe-Ray, Jr., LUTC"),
        ["", "John", "P.", "Doe-Ray", "", "Jr.", "LUTC"],
        []
      );
      verifyName(
        parseFullName("Doe-Ray, John P., Jr., LUTC"),
        ["", "John", "P.", "Doe-Ray", "", "Jr.", "LUTC"],
        []
      );
    });
    it("parses titles", function () {
      verifyName(
        parseFullName("Dr. John P. Doe-Ray, Jr."),
        ["Dr.", "John", "P.", "Doe-Ray", "", "Jr."],
        []
      );
      verifyName(
        parseFullName("Dr. Doe-Ray, John P., Jr."),
        ["Dr.", "John", "P.", "Doe-Ray", "", "Jr."],
        []
      );
      verifyName(
        parseFullName("Doe-Ray, Dr. John P., Jr."),
        ["Dr.", "John", "P.", "Doe-Ray", "", "Jr."],
        []
      );
    });

    it("parses titles with leading and trailing whitespace", function () {
      verifyName(
        parseFullName(" Dr. John  P. Doe-Ray,  Jr."),
        ["Dr.", "John", "P.", "Doe-Ray", "", "Jr."],
        []
      );
      verifyName(
        parseFullName("Dr.  Doe-Ray,  John  P.,   Jr. "),
        ["Dr.", "John", "P.", "Doe-Ray", "", "Jr."],
        []
      );
      verifyName(
        parseFullName(" Doe-Ray,  Dr.  John P. , Jr.  "),
        ["Dr.", "John", "P.", "Doe-Ray", "", "Jr."],
        []
      );
    });

    it("parse simple", function () {
      verifyName(parseFullName("John Smith Jr."), ["", "John", "", "Smith", "", "Jr."], []);
      verifyName(
        parseFullName("mary-jane o'connor"),
        ["", "Mary-Jane", "", "O'Connor", "", ""],
        []
      );
      verifyName(parseFullName("john smith dr."), ["Dr.", "John", "", "Smith", "", ""], []);
    });

    it("parses title & suffix mixes", function () {
      verifyName(
        parseFullName("Frau Dr. Sophie Wagner"),
        ["Frau", "Sophie", "", "Wagner", "", "", "Dr."],
        []
      );
      verifyName(parseFullName("Mr. Prof. John Doe"), ["Mr.", "John", "", "Doe", "", "", "Prof."], []);
      verifyName(parseFullName("Dr. Prof. John Doe"), ["Dr.", "John", "", "Doe", "", "", "Prof."], []);
      verifyName(
        parseFullName("Doctor Professor John Doe"),
        ["Doctor", "John", "", "Doe", "", "", "Professor"],
        []
      );
      verifyName(
        parseFullName("Dr. Prof. John Albert Doe"),
        ["Dr.", "John", "Albert", "Doe", "", "", "Prof."],
        []
      );
      verifyName(
        parseFullName("Dr. Dr. John Albert Doe"),
        ["Dr.", "John", "Albert", "Doe", "", "", "Dr."],
        []
      );
    });
    it("parses name parts in many different orders", function () {
      verifyName(
        parseFullName("Mr. Jüan Martinez (Martin) de Lorenzo y Gutierez Jr."),
        ["Mr.", "Jüan", "Martinez", "de Lorenzo y Gutierez", "Martin", "Jr."],
        []
      );
      verifyName(
        parseFullName("de Lorenzo y Gutierez, Mr. Jüan Martinez (Martin) Jr."),
        ["Mr.", "Jüan", "Martinez", "de Lorenzo y Gutierez", "Martin", "Jr."],
        []
      );
      verifyName(
        parseFullName("de Lorenzo y Gutierez, Mr. Jüan (Martin) Martinez Jr."),
        ["Mr.", "Jüan", "Martinez", "de Lorenzo y Gutierez", "Martin", "Jr."],
        []
      );
      verifyName(
        parseFullName("Mr. de Lorenzo y Gutierez, Jüan Martinez (Martin) Jr."),
        ["Mr.", "Jüan", "Martinez", "de Lorenzo y Gutierez", "Martin", "Jr."],
        []
      );
      verifyName(
        parseFullName("Mr. de Lorenzo y Gutierez, Jüan (Martin) Martinez Jr."),
        ["Mr.", "Jüan", "Martinez", "de Lorenzo y Gutierez", "Martin", "Jr."],
        []
      );
      verifyName(
        parseFullName("Mr. de Lorenzo y Gutierez Jr., Jüan Martinez (Martin)"),
        ["Mr.", "Jüan", "Martinez", "de Lorenzo y Gutierez", "Martin", "Jr."],
        []
      );
      verifyName(
        parseFullName("Mr. de Lorenzo y Gutierez Jr., Jüan (Martin) Martinez"),
        ["Mr.", "Jüan", "Martinez", "de Lorenzo y Gutierez", "Martin", "Jr."],
        []
      );
      verifyName(
        parseFullName("Mr. de Lorenzo y Gutierez, Jr. Jüan Martinez (Martin)"),
        ["Mr.", "Jüan", "Martinez", "de Lorenzo y Gutierez", "Martin", "Jr."],
        []
      );
      verifyName(
        parseFullName("Mr. de Lorenzo y Gutierez, Jr. Jüan (Martin) Martinez"),
        ["Mr.", "Jüan", "Martinez", "de Lorenzo y Gutierez", "Martin", "Jr."],
        []
      );
    });
    it("automatically fixes all upper and all lowercase names", function () {
      verifyName(
        parseFullName("MR. JÜAN MARTINEZ (MARTIN) DE LORENZO Y GUTIEREZ JR."),
        ["Mr.", "Jüan", "Martinez", "de Lorenzo y Gutierez", "Martin", "Jr."],
        []
      );
      verifyName(
        parseFullName("mr. jüan martinez (martin) de lorenzo y gutierez jr."),
        ["Mr.", "Jüan", "Martinez", "de Lorenzo y Gutierez", "Martin", "Jr."],
        []
      );
    });
    it("manually fixes case, or not, when specified", function () {
      verifyName(
        parseFullName("Mr. JÜAN MARTINEZ (MARTIN) DE LORENZO Y GUTIEREZ Jr."),
        ["Mr.", "JÜAN", "MARTINEZ", "DE LORENZO Y GUTIEREZ", "MARTIN", "Jr."],
        []
      );
      verifyName(
        parseFullName("Mr. JÜAN MARTINEZ (MARTIN) DE LORENZO Y GUTIEREZ JR.", {
          fixCase: 1,
        }),
        ["Mr.", "Jüan", "Martinez", "de Lorenzo y Gutierez", "Martin", "Jr."],
        []
      );
      verifyName(
        parseFullName("Dr. b.a. Julia Storm", {
          fixCase: 1,
        }),
        ["Dr.", "Julia", "", "Storm", "", "", "B.A."],
        []
      );
      verifyName(
        parseFullName("mr. jüan martinez (martin) de lorenzo y gutierez jr.", {
          fixCase: 0,
        }),
        ["mr.", "jüan", "martinez", "de lorenzo y gutierez", "martin", "jr."],
        []
      );
    });
    it("handles leading or trailing whitespace", function () {
      verifyName(parseFullName("Ezekiel Johnson "), ["", "Ezekiel", "", "Johnson", "", ""], []);
      verifyName(parseFullName("  Ezekiel Johnson"), ["", "Ezekiel", "", "Johnson", "", ""], []);
    });
    it("returns a single part, when specified", function () {
      expect(
        parseFullName("Mr. Jüan Martinez (Martin) de Lorenzo y Gutierez Jr.", {
          partToReturn: "title",
        })
      ).toBe("Mr.");
      expect(
        parseFullName("Mr. Jüan Martinez (Martin) de Lorenzo y Gutierez Jr.", {
          partToReturn: "first",
        })
      ).toBe("Jüan");
      expect(
        parseFullName("Mr. Jüan Martinez (Martin) de Lorenzo y Gutierez Jr.", {
          partToReturn: "middle",
        })
      ).toBe("Martinez");
      expect(
        parseFullName("Mr. Jüan Martinez (Martin) de Lorenzo y Gutierez Jr.", {
          partToReturn: "last",
        })
      ).toBe("de Lorenzo y Gutierez");
      expect(
        parseFullName("Mr. Jüan Martinez (Martin) de Lorenzo y Gutierez Jr.", {
          partToReturn: "nick",
        })
      ).toBe("Martin");
      expect(
        parseFullName("Mr. Jüan Martinez (Martin) de Lorenzo y Gutierez Jr.", {
          partToReturn: "generation",
        })
      ).toBe("Jr.");
      expect(
        parseFullName("Troy A. Hering CPA", { partToReturn: "credential" })
      ).toBe("CPA");
    });
    it("continues processing, even when fed garbage input", function () {
      verifyName(
        parseFullName(
          "as;dfkj ;aerha;sfa ef;oia;woeig hz;sofi hz;oifj;zoseifj zs;eofij z;soeif jzs;oefi jz;osif z;osefij zs;oif jz;soefihz;sodifh z;sofu hzsieufh zlsiudfh zksefiulzseofih ;zosufh ;oseihgfz;osef h:OSfih lziusefhaowieufyg oaweifugy"
        ),
        [
          "",
          "as;dfkj",
          ";aerha;sfa ef;oia;woeig hz;sofi hz;oifj;zoseifj zs;eofij z;soeif jzs;oefi jz;osif z;osefij zs;oif jz;soefihz;sodifh z;sofu hzsieufh zlsiudfh zksefiulzseofih ;zosufh ;oseihgfz;osef h:OSfih lziusefhaowieufyg",
          "oaweifugy",
          "",
          "",
        ],
        ["Error: 19 middle names"]
      );
    });

    it("normalize", function () {
      verifyName(
        parseFullName("John Smith jr", { fixCase: 1 }),
        ["", "John", "", "Smith", "", "Jr"],
        []
      );
      verifyName(
        parseFullName("John Smith 2nd", { fixCase: 1 }),
        ["", "John", "", "Smith", "", "2nd"],
        []
      );
      verifyName(
        parseFullName("John Smith II", { fixCase: 1 }),
        ["", "John", "", "Smith", "", "II"],
        []
      );
      verifyName(
        parseFullName("john smith dr", { fixCase: 1 }),
        ["Dr", "John", "", "Smith", "", ""],
        []
      );
    });

    it("returns warnings for null/undefined names", function () {
      // @ts-ignore
      verifyName(parseFullName(null), ["", "", "", "", "", ""], ["Error: No input"]);
      // @ts-ignore
      verifyName(parseFullName(), ["", "", "", "", "", ""], ["Error: No input"]);
    });
    it("will throw errors, when specified", function () {
      expect(() => parseFullName("")).not.toThrow();
      expect(() => parseFullName("", { fixCase: -1, stopOnError: 1 })).toThrow();
    });

    it("normalizes name parts when normalize option is enabled", function () {
      // Test suffix normalization with recognized suffixes
      verifyName(
        parseFullName("John Smith jr", { normalize: 1 }),
        ["", "John", "", "Smith", "", "Jr."],
        []
      );
      verifyName(
        parseFullName("John Smith junior", { normalize: 1 }),
        ["", "John", "", "Smith", "", "Jr."],
        []
      );
      verifyName(
        parseFullName("John Smith sr", { normalize: 1 }),
        ["", "John", "", "Smith", "", "Sr."],
        []
      );
      verifyName(
        parseFullName("John Smith senior", { normalize: 1 }),
        ["", "John", "", "Smith", "", "Sr."],
        []
      );
      verifyName(
        parseFullName("John Smith II", { normalize: 1 }),
        ["", "John", "", "Smith", "", "Jr."],
        []
      );
      verifyName(
        parseFullName("John Smith 2nd", { normalize: 1 }),
        ["", "John", "", "Smith", "", "Jr."],
        []
      );
      verifyName(
        parseFullName("John Smith iii", { normalize: 1 }),
        ["", "John", "", "Smith", "", "III"],
        []
      );

      // Test title normalization
      verifyName(
        parseFullName("dr John Smith", { normalize: 1 }),
        ["Dr.", "John", "", "Smith", "", ""],
        []
      );
      verifyName(
        parseFullName("doctor John Smith", { normalize: 1 }),
        ["Dr.", "John", "", "Smith", "", ""],
        []
      );
      verifyName(
        parseFullName("prof John Smith", { normalize: 1 }),
        ["Prof.", "John", "", "Smith", "", ""],
        []
      );
      verifyName(
        parseFullName("professor John Smith", { normalize: 1 }),
        ["Prof.", "John", "", "Smith", "", ""],
        []
      );
      verifyName(
        parseFullName("mr John Smith", { normalize: 1 }),
        ["Mr.", "John", "", "Smith", "", ""],
        []
      );

      // Test multiple suffixes normalization
      verifyName(
        parseFullName("John Smith jr, esq", { normalize: 1 }),
        ["", "John", "", "Smith", "", "Jr.", "Esq."],
        ["Error: 2 suffixes found"]
      );
    });

    it("does not normalize when normalize option is disabled", function () {
      verifyName(
        parseFullName("John Smith jr", { normalize: 0, fixCase: 0 }),
        ["", "John", "", "Smith", "", "jr"],
        []
      );
      verifyName(
        parseFullName("dr John Smith", { normalize: 0, fixCase: 0 }),
        ["dr", "John", "", "Smith", "", ""],
        []
      );    });

    it("does not let a surname-shaped suffix eat the surname", function () {
      // "ma" is in the suffix list as Master of Arts, and is also one of the
      // most common Chinese surnames. Stripping it here left a single name
      // part, which parsed as a last name with NO first name — and a consumer
      // that requires both then drops the person entirely.
      verifyName(parseFullName("Jack Ma"), ["", "Jack", "", "Ma", "", ""], []);
      verifyName(parseFullName("Yo-Yo Ma"), ["", "Yo-Yo", "", "Ma", "", ""], []);
      verifyName(parseFullName("Ana Ba"), ["", "Ana", "", "Ba", "", ""], []);
      // A title is removed in a later pass, so it is still among the parts when
      // the suffix pass runs and must not be miscounted as the surviving name.
      verifyName(parseFullName("Dr. Jack Ma"), ["Dr.", "Jack", "", "Ma", "", ""], []);
      // Still a genuine suffix once a first and last name survive without it.
      verifyName(parseFullName("Wei Li MA"), ["", "Wei", "", "Li", "", "", "MA"], []);
      verifyName(parseFullName("Ann Ma MD"), ["", "Ann", "", "Ma", "", "", "MD"], []);
      verifyName(parseFullName("Robert Ma Jr."), ["", "Robert", "", "Ma", "", "Jr."], []);
    });

    it("uses capitalization as a one-directional signal on ambiguous suffixes", function () {
      // A degree is written "MA" or "M.A.", never "Ma" — so a title-cased token
      // is DEFINITELY not a suffix and the collision is settled outright.
      verifyName(parseFullName("Wei Li Ma"), ["", "Wei", "Li", "Ma", "", ""], []);
      verifyName(parseFullName("John Smith Ma"), ["", "John", "Smith", "Ma", "", ""], []);
      // All-caps proves nothing in the other direction, because an all-caps
      // document renders the surname as "MA" too. It stays a suffix only where
      // a first and last name survive without it...
      verifyName(parseFullName("Wei Li MA"), ["", "Wei", "", "Li", "", "", "MA"], []);
      verifyName(parseFullName("John Smith MA"), ["", "John", "", "Smith", "", "", "MA"], []);
      // ...and the length guard still catches the all-caps two-part case, which
      // is exactly how EDGAR writes a conformed name.
      verifyName(parseFullName("JACK MA"), ["", "Jack", "", "Ma", "", ""], []);
      verifyName(parseFullName("MA, JACK"), ["", "Jack", "", "Ma", "", ""], []);
      // The dotted form is unambiguous regardless of the surrounding name.
      verifyName(parseFullName("Jack Ma, M.A."), ["", "Jack", "", "Ma", "", "", "M.A."], []);
    });

    it("keeps an unambiguous suffix on a mononym", function () {
      // The guard above must stay scoped to surname-shaped entries: a blanket
      // "always keep two parts" rule turns the "Jr." into the first name.
      verifyName(parseFullName("Smith, Jr."), ["", "", "", "Smith", "", "Jr."], []);
      verifyName(parseFullName("Jones, Sr."), ["", "", "", "Jones", "", "Sr."], []);
      verifyName(parseFullName("Public, III"), ["", "", "", "Public", "", "III"], []);
    });

    it("parses professional certifications as suffixes", function () {
      // CFP/ChFC/CLU were already listed; CPA and CFA were missing, so the
      // credential was taken as the surname instead ("Troy A. Hering CPA" gave
      // last="Cpa" with "A. Hering" buried in the middle name).
      verifyName(
        parseFullName("Troy A. Hering CPA"),
        ["", "Troy", "A.", "Hering", "", "", "CPA"],
        []
      );
      verifyName(parseFullName("Susan Chen CFA"), ["", "Susan", "", "Chen", "", "", "CFA"], []);
      verifyName(parseFullName("Susan Chen, C.P.A."), ["", "Susan", "", "Chen", "", "", "C.P.A."], []);
    });

    it("returns generation and credential as separate parts", function () {
      // The whole point of the split: a caller identifying people keys on
      // `generation` and ignores `credential`, with no classification of its own.
      const both = parseFullName("John Smith Jr., CPA");
      expect(both.generation).toBe("Jr.");
      expect(both.credential).toBe("CPA");
      expect((both as Record<string, unknown>).suffix).toBeUndefined();

      const plain = parseFullName("Jane Doe");
      expect(plain.generation).toBe("");
      expect(plain.credential).toBe("");

      // Several of one kind stay comma-joined within their own field.
      expect(parseFullName("Gbola Amusa, M.D., CFA").credential).toBe("M.D., CFA");
    });

    it("keeps a bare middle initial out of the title", function () {
      // "m" was in the title list as the French Monsieur, so a lone "M." was
      // stripped as a title and `middle` came back empty — which made
      // "Joseph M. Taylor" and "Joseph Taylor" the same parsed name, and any
      // caller deduplicating on the parts merged two different people. A bare
      // "M." is an initial far more often than it is Monsieur, and the entry
      // bought nothing that "monsieur" does not already cover, so it is gone.
      verifyName(parseFullName("Joseph M. Taylor"), ["", "Joseph", "M.", "Taylor", "", ""], []);
      verifyName(parseFullName("Joseph M Taylor"), ["", "Joseph", "M", "Taylor", "", ""], []);
      verifyName(parseFullName("Taylor, Joseph M."), ["", "Joseph", "M.", "Taylor", "", ""], []);
      verifyName(parseFullName("JOSEPH M. TAYLOR"), ["", "Joseph", "M.", "Taylor", "", ""], []);
      // A real title in front no longer collides with it — this used to report
      // "2 titles found" and join them into title="Dr., M.".
      verifyName(
        parseFullName("Dr. Joseph M. Taylor"),
        ["Dr.", "Joseph", "M.", "Taylor", "", ""],
        []
      );
      verifyName(
        parseFullName("Joseph M. Taylor Jr."),
        ["", "Joseph", "M.", "Taylor", "", "Jr."],
        []
      );
      // Leading, it is an initial too — which is also the reading that leaves a
      // usable name, where Monsieur left first="" and a caller requiring both
      // parts dropped the person.
      verifyName(parseFullName("M. Dupont"), ["", "M.", "", "Dupont", "", ""], []);
      verifyName(parseFullName("Dupont, M."), ["", "M.", "", "Dupont", "", ""], []);
      // The spelled-out title is untouched.
      verifyName(parseFullName("Monsieur Dupont"), ["Monsieur", "", "", "Dupont", "", ""], []);
    });

    it("keeps a bare middle initial out of the suffix", function () {
      // "v" is in the suffix list as the fifth. A suffix trails the name, so a
      // "V." with a surname after it cannot be one; read as a suffix it both
      // lost the initial and invented a generation, which splits one person
      // into two rather than merging two into one.
      verifyName(parseFullName("Joseph V. Taylor"), ["", "Joseph", "V.", "Taylor", "", ""], []);
      verifyName(parseFullName("Joseph V Taylor"), ["", "Joseph", "V", "Taylor", "", ""], []);
      verifyName(parseFullName("John V. Smith Jr."), ["", "John", "V.", "Smith", "", "Jr."], []);
      // Trailing, it is still the generational suffix it has always been.
      verifyName(parseFullName("John Smith V"), ["", "John", "", "Smith", "", "V"], []);
      // The guard is scoped to letters: "2" is a generation and never an initial.
      verifyName(parseFullName("John Smith 2"), ["", "John", "", "Smith", "", "2"], []);
    });

    it("places the one-letter suffix by the comma, not by the end of the name", function () {
      // Inverting the name moves the suffix with the surname it belongs to, so
      // the position that licenses a one-letter suffix moves too: it is the
      // token before the comma, and the token at the END is a middle initial.
      verifyName(parseFullName("Smith V, John"), ["", "John", "", "Smith", "", "V"], []);
      verifyName(parseFullName("Smith V., John"), ["", "John", "", "Smith", "", "V."], []);
      verifyName(parseFullName("SMITH V, JOHN"), ["", "John", "", "Smith", "", "V"], []);
      verifyName(parseFullName("Smith, John V."), ["", "John", "V.", "Smith", "", ""], []);
      verifyName(parseFullName("SMITH, JOHN V"), ["", "John", "V", "Smith", "", ""], []);
      // A comma of its own still marks it a suffix — the extra-comma pass takes
      // it, which is what keeps the two inverted forms distinguishable.
      verifyName(parseFullName("Smith, John, V"), ["", "John", "", "Smith", "", "V"], []);
      // Longer suffixes never depended on this and must not shift.
      verifyName(parseFullName("Smith Jr., John"), ["", "John", "", "Smith", "", "Jr."], []);
      verifyName(parseFullName("Smith, John, Jr."), ["", "John", "", "Smith", "", "Jr."], []);
      verifyName(
        parseFullName("Doe-Ray, John P., Jr."),
        ["", "John", "P.", "Doe-Ray", "", "Jr."],
        []
      );
    });

    it("recognizes generational suffixes past V", function () {
      // These were absent from the suffix list, so the numeral was taken as the
      // SURNAME — the same failure as the "Ma" collision, just rarer.
      verifyName(parseFullName("John Smith VI"), ["", "John", "", "Smith", "", "VI"], []);
      verifyName(parseFullName("John Smith VII"), ["", "John", "", "Smith", "", "VII"], []);
      verifyName(parseFullName("John Smith VIII"), ["", "John", "", "Smith", "", "VIII"], []);
      // "Vi" is also a given name, so it carries the same surname guard as "Ma":
      // it may not consume the last remaining name part.
      verifyName(parseFullName("Jane Vi"), ["", "Jane", "", "Vi", "", ""], []);
    });
  });
});
