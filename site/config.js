import * as pug from 'pug';
import { SSGBuilder, LogLevel } from 'ssg-zero';

const builder = new SSGBuilder();

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

export default builder
	.setInputDir('pages')
	.setOutputDir('www')
	.useDefaultLogger(LogLevel.Debug)
	.template('.pug', pugRenderer)
	.passthrough('.html')
	.build();
