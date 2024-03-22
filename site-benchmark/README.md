# Site Benchmark

This package only exist to optimize performance on this synthetic benchmark. The benchmark only
compiles a large amount of markdown files and is originally based on [github.com/zachleat/bench-framework-markdown](https://github.com/zachleat/bench-framework-markdown).

## How to run

For full debugging capbilities run:
```sh
node --inspect --inspect-brk zero.config.js
```

Generate V8 profiling output:
```sh
node --prof zero.config.js
# v8_prof_file will be named something like isolate-xxx.log
node --prof-process v8_prof_file > diagnostic/v8_processed.txt
```

Generate heap profile:
```sh
node --heap-prof --diagnostic-dir=diagnostic zero.config.js
# upload it in the chrome dev tools (memory tab)
```

Generate cpu profile:
```sh
node --cpu-prof --diagnostic-dir=diagnostic zero.config.js
# upload it in the chrome dev tools (performance tab)
```

## Noteworthy

Using `NODE_OPTIONS='--inspect --inspect-brk'` on a `npm exec TOOL` run is not of great use. The exec command starts a child process that will not be connected to the debugger.
