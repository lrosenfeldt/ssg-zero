const lastModifiedDate = new Date('October 21, 2015 07:28:00 GMT');

// Create a formatter with the appropriate options
const dateFormatter = new Intl.DateTimeFormat('en-US', {
  weekday: 'short', // Short day name (e.g., Sun)
  day: 'numeric',    // Numeric day (e.g., 06)
  month: 'short',    // Short month name (e.g., Nov)
  year: 'numeric',   // Numeric year (e.g., 1994)
  hour: 'numeric',   // Numeric hour (e.g., 08)
  minute: 'numeric', // Numeric minute (e.g., 49)
  second: 'numeric', // Numeric second (e.g., 37)
  timeZone: 'GMT',   // Set the time zone to GMT
});

console.log(dateFormatter.format(lastModifiedDate));
