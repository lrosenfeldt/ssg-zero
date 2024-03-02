const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const months = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec',
];

export function toHttpDate(date: Date): string {
	return (
		days[date.getUTCDay()] +
		', ' +
		date.getUTCDate().toString().padStart(2, '0') +
		' ' +
		months[date.getUTCMonth()] +
		' ' +
		date.getUTCFullYear().toString().padStart(2, '0') +
		' ' +
		date.getUTCHours().toString().padStart(2, '0') +
		':' +
		date.getUTCMinutes().toString().padStart(2, '0') +
		':' +
		date.getUTCSeconds().toString().padStart(2, '0') +
		// I use UTC parts, should be without timezone
		' GMT'
	);
}
