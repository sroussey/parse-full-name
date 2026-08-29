/**
 * GENERATED FILE - do not edit by hand.
 * Regenerate with `bun run derive`.
 *
 * Surname stems that follow an elided apostrophe prefix, keyed by the letter
 * that elides: "brien" under "o" is O'Brien, which a system that rejects
 * apostrophes stores as "O Brien". Lowercase, and matched against the token
 * after the letter - see `isElidedSurnamePrefix` in ./index.ts.
 *
 * 231 stems, counted from English Wikipedia page titles that read like a
 * person's name <https://dumps.wikimedia.org/enwiki/latest/enwiki-latest-all-titles-in-ns0.gz>.
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
  // Italian, French, Catalan, Goan and Maltese di/de - D'Angelo, D'Souza
  // 97 stems. Commonest: D'arcy, D'souza, D'angelo.
  d: new Set(
    ("abernon abo acquisto adda addario aeth afflitto agata agostin agostino albertis alberto " +
     "albiac albrook alembert alesandro alessandro alessio algy alibard allesandro aloia aloisio " +
     "alton alvise amato amboise ambrosi ambrosio amelio amico amore amour amours ancona andrea " +
     "angelo aniello anjou annunzio antoni antuono anvers apuzzo aquila aquin aquisto arbanville " +
     "arblay arby arcangelo arco arcy arcy-irvine arienzo arrigo artega artois asaro ascenzo ath " +
     "aubigny auria auvergne avenant aversa avigdor-goldsmid elia eramo errico este ewes haese " +
     "haeseleer hondt ignazio israeli mello oench onofrio or ora orazio oriano oriola oro orsay " +
     "orsi orso ovidio oyly rozario souza urfey urso utassy zurilla").split(" ")
  ),
  // French, Italian and Catalan le/la - L'Heureux
  // 18 stems. Commonest: L'estrange, L'heureux, L'amour.
  l: new Set(
    ("abbe ami amour arronge ecuyer enfant esperance estrange estrange-corbet herminier hermite " +
     "heureux hommedieu hopital hote huillier ouverture vov").split(" ")
  ),
  // Irish and Scottish Gaelic O/Ua - O'Brien
  // 116 stems. Commonest: O'brien, O'connor, O'neill.
  o: new Set(
    ("banion bannon beirne billovich boyle bree brian brien bryan bryen byrne callaghan carroll " +
     "chee clery clock connell conner connor conor dea dell doherty donaghue donahue donell donnel " +
     "donnell donoghue donohoe donohue donovan dowd dowda driscoll dwyer fallon faolain farrell " +
     "farril farrill feeney ferrall flaherty flanagan flynn gara gorman gowan grady hagan hair " +
     "halleran halloran hanlon hanrahan hara hare hea hearn hehir herlihy hern higgins hora kane " +
     "keefe keeffe kelly lachlan laughlin leary linn loan loghlen loghlin lone loughlin mahoney " +
     "mahony malley mara meally meara melia nan neal neale neall neel neil neill neills niell " +
     "nions pake quin rahilly rawe rear ree regan reilly reily rielly riordan rorke rourke shane " +
     "shaughnessey shaughnessy shea shiel steen sullivan toole").split(" ")
  ),
};
