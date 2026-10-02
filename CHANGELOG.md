# Changelog

## 3.1.1

### Features

- better handling of O Brien vs O Doe
- update parsing logic to handle generational suffixes and credentials
- add normalization feature and update version to 2.0.0 (breaking change in how options are passed)
- better casing
- adding title & suffix mix support - there is a check on suffix parsing if other nameParts exists which can be titles

### Bug Fixes

- enhance name parsing logic to retain ambiguous all-caps suffixes
- keep a name's first name when a particle, title or initial looks like something else
- drop "m" as a title, and place a one-letter suffix by the comma
- read a bare single-letter name part as an initial, not a title or suffix
- simple "John Smith Jr."
- ts issues
- parse first suffix then title, cause now suffix like dr/prof can be also title
- use dr./prof. also as title
- format

#### *

- add package-lock + change npm publish to node 18

### Refactors

- convert to typescript

### Chores

- update dependencies in package.json and bun.lock
- release @sroussey/parse-full-name@3.1.0
- increment package version to 3.0.2
- fix git ignore for macos
- reformat
- add some dev env settings
- update version to 1.0.10 and enhance whitespace handling in parseFullName function

## 3.1.0

### Bug Fixes

- keep a name's first name when a particle, title or initial looks like something else
