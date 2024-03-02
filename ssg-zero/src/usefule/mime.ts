type DeepReadonly<T> = {
	readonly [K in keyof T]: DeepReadonly<T[K]>;
};

export type MimeInfo = {
	mimeType: string;
	encoding: BufferEncoding;
};

export const mime: DeepReadonly<Record<string, MimeInfo>> = {
	'.aac': { mimeType: 'audio/aac', encoding: 'base64' },
	'.abw': { mimeType: 'application/x-abiword', encoding: 'binary' },
	'.arc': { mimeType: 'application/x-freearc', encoding: 'binary' },
	'.avif': { mimeType: 'image/avif', encoding: 'base64' },
	'.avi': { mimeType: 'video/x-msvideo', encoding: 'base64' },
	'.azw': {
		mimeType: 'application/vnd.amazon.ebook',
		encoding: 'base64',
	},
	'.bin': { mimeType: 'application/octet-stream', encoding: 'base64' },
	'.bmp': { mimeType: 'image/bmp', encoding: 'base64' },
	'.bz': { mimeType: 'application/x-bzip', encoding: 'base64' },
	'.bz2': { mimeType: 'application/x-bzip2', encoding: 'base64' },
	'.cda': { mimeType: 'application/x-cdf', encoding: 'binary' },
	'.csh': { mimeType: 'application/x-csh', encoding: 'binary' },
	'.css': { mimeType: 'text/css', encoding: 'utf-8' },
	'.csv': { mimeType: 'text/csv', encoding: 'utf-8' },
	'.doc': { mimeType: 'application/msword', encoding: 'binary' },
	'.docx': {
		mimeType:
			'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
		encoding: 'binary',
	},
	'.eot': {
		mimeType: 'application/vnd.ms-fontobject',
		encoding: 'binary',
	},
	'.epub': { mimeType: 'application/epub+zip', encoding: 'binary' },
	'.gz': { mimeType: 'application/gzip', encoding: 'base64' },
	'.gif': { mimeType: 'image/gif', encoding: 'base64' },
	'.htm': { mimeType: 'text/html', encoding: 'utf-8' },
	'.html': { mimeType: 'text/html', encoding: 'utf-8' },
	'.ico': { mimeType: 'image/vnd.microsoft.icon', encoding: 'base64' },
	'.ics': { mimeType: 'text/calendar', encoding: 'utf-8' },
	'.jar': { mimeType: 'application/java-archive', encoding: 'base64' },
	'.jpeg': { mimeType: 'image/jpeg', encoding: 'base64' },
	'.jpg': { mimeType: 'image/jpeg', encoding: 'base64' },
	'.js': { mimeType: 'text/javascript', encoding: 'utf-8' },
	'.json': { mimeType: 'application/json', encoding: 'utf-8' },
	'.jsonld': { mimeType: 'application/ld+json', encoding: 'utf-8' },
	'.md': { mimeType: 'text/markdown', encoding: 'utf-8' },
	'.mid': { mimeType: 'audio/x-midi', encoding: 'binary' },
	'.midi': { mimeType: 'audio/x-midi', encoding: 'binary' },
	'.mjs': { mimeType: 'text/javascript', encoding: 'utf-8' },
	'.mp3': { mimeType: 'audio/mpeg', encoding: 'base64' },
	'.mp4': { mimeType: 'video/mp4', encoding: 'base64' },
	'.mpeg': { mimeType: 'video/mpeg', encoding: 'base64' },
	'.mpkg': {
		mimeType: 'application/vnd.apple.installer+xml',
		encoding: 'base64',
	},
	'.odp': {
		mimeType: 'application/vnd.oasis.opendocument.presentation',
		encoding: 'base64',
	},
	'.ods': {
		mimeType: 'application/vnd.oasis.opendocument.spreadsheet',
		encoding: 'base64',
	},
	'.odt': {
		mimeType: 'application/vnd.oasis.opendocument.text',
		encoding: 'base64',
	},
	'.oga': { mimeType: 'audio/ogg', encoding: 'base64' },
	'.ogv': { mimeType: 'video/ogg', encoding: 'base64' },
	'.ogx': { mimeType: 'application/ogg', encoding: 'base64' },
	'.opus': { mimeType: 'audio/opus', encoding: 'base64' },
	'.otf': { mimeType: 'font/otf', encoding: 'base64' },
	'.png': { mimeType: 'image/png', encoding: 'base64' },
	'.pdf': { mimeType: 'application/pdf', encoding: 'base64' },
	'.php': { mimeType: 'application/x-httpd-php', encoding: 'base64' },
	'.ppt': {
		mimeType: 'application/vnd.ms-powerpoint',
		encoding: 'base64',
	},
	'.pptx': {
		mimeType:
			'application/vnd.openxmlformats-officedocument.presentationml.presentation',
		encoding: 'base64',
	},
	'.rar': { mimeType: 'application/vnd.rar', encoding: 'base64' },
	'.rtf': { mimeType: 'application/rtf', encoding: 'base64' },
	'.sh': { mimeType: 'application/x-sh', encoding: 'base64' },
	'.svg': { mimeType: 'image/svg+xml', encoding: 'utf-8' },
	'.tar': { mimeType: 'application/x-tar', encoding: 'base64' },
	'.tif': { mimeType: 'image/tiff', encoding: 'base64' },
	'.tiff': { mimeType: 'image/tiff', encoding: 'base64' },
	'.ts': { mimeType: 'video/mp2t', encoding: 'base64' },
	'.ttf': { mimeType: 'font/ttf', encoding: 'base64' },
	'.txt': { mimeType: 'text/plain', encoding: 'utf-8' },
	'.vsd': { mimeType: 'application/vnd.visio', encoding: 'base64' },
	'.wav': { mimeType: 'audio/wav', encoding: 'base64' },
	'.weba': { mimeType: 'audio/webm', encoding: 'base64' },
	'.webm': { mimeType: 'video/webm', encoding: 'base64' },
	'.webp': { mimeType: 'image/webp', encoding: 'base64' },
	'.woff': { mimeType: 'font/woff', encoding: 'base64' },
	'.woff2': { mimeType: 'font/woff2', encoding: 'base64' },
	'.xhtml': { mimeType: 'application/xhtml+xml', encoding: 'utf-8' },
	'.xls': { mimeType: 'application/vnd.ms-excel', encoding: 'base64' },
};
