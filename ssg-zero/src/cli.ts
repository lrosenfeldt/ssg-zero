console.log(
	'Hello, you passed in: ',
	process.argv
		.slice(2)
		.map(str => `'${str}'`)
		.join('  '),
)

console.log('Done')
