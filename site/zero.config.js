import * as pug from 'pug';
import { config } from 'ssg-zero';

/**
 * @type {import('ssg-zero').Renderer}
 */
const pugRenderer = {
	generates: '.html',
	render(content, data) {
		const template = pug.compile(content, { pretty: true });
		return template(data);
	},
};

export default config({
	inputDir: 'pages',
	outputDir: 'www',
	passthrough: ['.html'],
	templates: {
		'.pug': pugRenderer,
	},
});
