## Currently

- [ ] Add extensive tests for new parser implementation
- [ ] Make FlagSchema generic to provide nice type checking for decorator - default and valueType should match
- [ ] don't use constructor of schema directly use, assert that given constructor adheres to interface
- [ ] what should I check to assert a correct appMeta in parser?
- [ ] add description decorator

## General

- [ ] Restructure Tests - test.only works when all suites and subtests in that branch are using test.only (most test files), but if nesting is avoided (cli/app.test.ts) the spec output is ugly
    - Solution 1: No nesting, Custom test reporter
    - Solution 2: Nesting and deal with it

- [ ] Improve naming in parse_args
- [ ] Work on templates in parallel
- [ ] Is there a way to hook into every fs call? -> caching for any templating language
- [ ] Have a way to manage version field in package.json
