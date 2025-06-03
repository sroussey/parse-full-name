import { parseFullName } from "../src/index.js";
import { describe, it, expect } from "bun:test";

interface NameParts {
  title: string;
  first: string;
  middle: string;
  last: string;
  nick: string;
  suffix: string;
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
  expect(nameToCheck.suffix).toBe(partsToCheck[5]);
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
        ["Dr.", "Hans", "", "Zimmer", "", "Dr.med.dent."],
        []
      );
      verifyName(
        parseFullName("dipl.-ing. Hans Zimmer", { fixCase: 1 }),
        ["", "Hans", "", "Zimmer", "", "Dipl.-Ing."],
        []
      );
    });
    it("parses unknown suffixes", function () {
      verifyName(
        parseFullName("John P. Doe-Ray, Jr., LUTC"),
        ["", "John", "P.", "Doe-Ray", "", "Jr., LUTC"],
        []
      );
      verifyName(
        parseFullName("Doe-Ray, John P., Jr., LUTC"),
        ["", "John", "P.", "Doe-Ray", "", "Jr., LUTC"],
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
        ["Frau", "Sophie", "", "Wagner", "", "Dr."],
        []
      );
      verifyName(parseFullName("Mr. Prof. John Doe"), ["Mr.", "John", "", "Doe", "", "Prof."], []);
      verifyName(parseFullName("Dr. Prof. John Doe"), ["Dr.", "John", "", "Doe", "", "Prof."], []);
      verifyName(
        parseFullName("Doctor Professor John Doe"),
        ["Doctor", "John", "", "Doe", "", "Professor"],
        []
      );
      verifyName(
        parseFullName("Dr. Prof. John Albert Doe"),
        ["Dr.", "John", "Albert", "Doe", "", "Prof."],
        []
      );
      verifyName(
        parseFullName("Dr. Dr. John Albert Doe"),
        ["Dr.", "John", "Albert", "Doe", "", "Dr."],
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
        ["Dr.", "Julia", "", "Storm", "", "B.A."],
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
          partToReturn: "suffix",
        })
      ).toBe("Jr.");
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
        ["", "John", "", "Smith", "", "Jr., Esq."],
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
      );
    });
  });
});
