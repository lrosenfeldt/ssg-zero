import { Liquid } from 'liquidjs';
import { config } from 'ssg-zero';
import postcss from 'postcss';
import postcssAtImport from 'postcss-import';

const postcssProcessor = postcss().use(postcssAtImport());

/**
 * @type {import('ssg-zero').Renderer}
 */
const cssRenderer = {
	generates: '.css',
	async render(content, _data, meta) {
		const result = await postcssProcessor.process(content, {
			from: meta.input,
		});
		return result.css;
	},
};

const liquid = new Liquid();
/**
 * @type {import('ssg-zero').Renderer}
 */
const liquidRenderer = {
	generates: '.html',
	render(content, data) {
		return liquid.parseAndRender(content, data);
	},
};

export default config({
	inputDir: 'pages',
	outputDir: 'www',
	includesDir: '_includes',
	passthrough: ['.html'],
	templates: {
		'.liquid': liquidRenderer,
		'.postcss': cssRenderer,
	},
});
