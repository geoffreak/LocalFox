// includes/scrapers/mangareader/regex.js
// Regular expressions for Mangareader.net scraping
// LocalFox v4 © Joshua "geoffreak" DeVinney 2011

exports.title = {
	title: {
		rexp: /<h2 class="aname">(.*?)<\/h2>/i,
		results: 1
	},
	genres: {
		rexp: '<span class="genretags">(.*?)</span>',
		results: 1
	},
	description: {
		rexp: /<h2>Read .*? Manga Online<\/h2>[ \t\r\n]*<p>\s*([\s\S\r\n]*?)\s*<\/p>/im,
		results: 1
	},
	cover: {
		rexp: /src="(http:\/\/.*?.mangareader.net\/cover.*?\..*?)"/i,
		results: 1
	},
	status: {
		rexp: /<td class="propertytitle">Status:<\/td>[ \t\n\r]*<td>([completedongoing]+)[<\/td>,]/i,
		results: 1
	},
	chapters: {
		rexp: '<div class="chico_manga"></div>[ \t\n\r]*<a href="(.*?)">.*? ([\.0-9]+)</a> : (.*?)</td>[ \t\n\r]*<td>(.*?)</td>',
		results: {
			1: 'url',
			2: 'chapter',
			3: 'title',
			4: 'date'
		}
	}
}

exports.page = {
	image: {
		rexp: /<img id="img".*?src="(.*?)".*?\/>/,
		results: 1
	},
	nextPage: {
		rexp: /document\['nl'\] = '(.*?)';/i,
		results: 1
	},
	hasNextPage: {
		rexp: /document\['pu'\] = '(.*?)';/i,
		results: 1
	}
}

exports.search = {
	manga: {
		rexp: '([^\\|\\r\\n]*?)\\|([^\\|]*?)\\|[^\\|]*?\\|[^\\|]*?\\|([^\\|]*?)\\|[^\\|]*?',
		results: {
			1: 'title',
			2: 'cover',
			3: 'url'
		}
	},
}