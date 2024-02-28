import * as pug from 'pug';
import { SSGBuilder } from 'ssg-zero';

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
	.template('.pug', pugRenderer)
	.passthrough('.html')
	.build();
