## Currently

Global options in the cli module could be improved. Currently I would need to return 2 objects, 1 for the global options and one for the command specified options. Would be cool to only get one combined object.

- [ ] Options must be unique between command and globals, no silent override
    - [ ] provide nice error message for this case
- [ ] find a way to combine globals with command options

- [ ] move schema registry tests in to flag.test


## General

- [ ] Restructure Tests - test.only works when all suites and subtests in that branch are using test.only (most test files), but if nesting is avoided (cli/app.test.ts) the spec output is ugly
    - Solution 1: No nesting, Custom test reporter
    - Solution 2: Nesting and deal with it

- [ ] Improve naming in parse_args
- [ ] Work on templates in parallel
- [ ] Is there a way to hook into every fs call? -> caching for any templating language
- [ ] Have a way to manage version field in package.json
