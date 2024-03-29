## General

- add .prettierignore for the markdown files in the benchmark folder
- wtf is happening in my git hooks?

why is the stream variant so slow, I probably doing something bad...
I need `_writev` because:

> All calls to writable.write() that occur between the time writable._write() is called and the callback is called will cause the written data to be buffered. When the callback is invoked, the stream might emit a 'drain' event. If a stream implementation is capable of processing multiple chunks of data at once, the writable._writev() method should be implemented.

## Benchmarks
- heap profiles must `.heapprofile` files or are rejected by chrome
- remove measurement results from all branches but main
- maybe reject commits that would add measurement results to branches that are not main?
