import { SSGBuilder, LogLevel } from 'ssg-zero';

const builder = new SSGBuilder();

export default builder
	.setInputDir('pages')
	.setOutputDir('web')
	.useDefaultLogger(LogLevel.Debug)
	.template('.html', content => {
		console.log(content);
		return content;
	})
	.build();
