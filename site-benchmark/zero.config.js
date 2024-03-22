import markdownit from 'markdown-it';
import { config } from 'ssg-zero';

const INPUT_DIR = 'pages/4000';

const md = markdownit();
/**
 * @type {import('ssg-zero').Renderer}
 */
const mdRenderer = {
	generates: '.html',
	render(content) {
		return md.render(content);
	},
};

const ssg = config({
	inputDir: INPUT_DIR,
	outputDir: 'www',
	includesDir: '_includes',
	passthrough: ['.html'],
	templates: {
		'.md': mdRenderer,
	},
});

await ssg.build();
