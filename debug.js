import { parseFullName } from "./src/index.js";

console.log("Testing: parseFullName('John Smith jr', { normalize: 1 })");
const result = parseFullName("John Smith jr", { normalize: 1 });
console.log("Result:", JSON.stringify(result, null, 2));

console.log("\nExpected by test:");
console.log('["", "John", "", "Smith", "", "Jr."]');

console.log("\nActual result array:");
console.log([result.title, result.first, result.middle, result.last, result.nick, result.suffix]);

// Let's also test all the failing cases from the normalize test
const testCases = [
  "John Smith jr",
  "John Smith junior",
  "John Smith sr",
  "John Smith senior",
  "John Smith II",
  "John Smith 2nd",
  "John Smith iii",
];

console.log("\n--- All test cases ---");
testCases.forEach((testCase) => {
  const res = parseFullName(testCase, { normalize: 1 });
  console.log(`${testCase} =>`, [res.title, res.first, res.middle, res.last, res.nick, res.suffix]);
});
