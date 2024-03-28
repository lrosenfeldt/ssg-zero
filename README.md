# ssg-zero

A static site generator powered powered by Node.js to build your templates in a simple way while not depending on anything but Node.js*.

<small>\*: *For development TypeScript and Prettier are used, I'm not that crazy*</small>

## How does it work

`ssg-zero` scans all files in an input directory, for each file one of 3 actions is carried out based on the file extension:

1. If the file extension is unknown to your config, the file is ignored 
1. If the file extension is listend in `passthrough`, the file is copied to the out directory
1. If for the file extension a renderer is listed in `templates`, its used to render the template. The content may be placed in the layout provided in the json frontmatter.

## Why tho?

At the time this project started I was frustrated with missing documentation on how to build plugins for the static site generator I used back then. I also didn't want to orchestrate dozens of plugins as dependency. So I took the challenge to build my own static site generator.
