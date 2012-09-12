// includes/scrapers/mangafox/regex.js
// Regular expressions for Mangafox.com scraping
// LocalFox v4 © Joshua "geoffreak" DeVinney 2011

exports.title = {
	title: {
		rexp: /<title>(.*?) Manga/i,
		results: 1
	},
    license: {
        rexp: /(has been licensed, it is not available in Manga Fox)/i,
        results: 1
    },
	genres: {
		rexp: '<a href="http://[www\.]*mangafox\.[come]*/search/genres/[A-z %0-9]+/">([A-z ]+)</a>',
		results: 1
	},
	description: {
		rexp: /<p class="summary">([\s\S\r\n]*?)<\/p>/i,
		results: 1
	},
	cover: {
		rexp: /src="(.*?\/cover\.jpg.*?)"/i,
		results: 1
	},
	status: {
		rexp: /<h5>Status:<\/h5>[ \t\r\n]*<span>[ \t\r\n]*(completed|ongoing)/i,
		results: 1
	},
	chapters: {
		rexp: 'href="(http://[www\*]*mangafox\.[come]*/manga/.*?(/v([0-9A-z]+))*?/c([0-9\\.]+)/)(1\.html)*".*?tips.*?>.*?</a>[ \\t\\r\\n]*(<span class="title nowrap">(.*?)</span>)*',
		results: {
			1: 'url',
			3: 'volume',
			4: 'chapter',
			7: 'title'
		}
	}
};
exports.page = {
	page: {
		rexp: /<a href="(.*?)" onclick="return.*?"><img src="(.*?)"/i,
		results: {
			1: 'next',
			2: 'image'
		}
	}
};
exports.xml = {
	xml: {
		rexp: '<item>[\\w\\W]*?<link>(.*?)</link>[\\s\\S]*?<pubDate>(.*?)</pubDate>[\\s\\S]*?</item>',
		results: {
			1: 'url',
			2: 'date'
		}
	},
}
exports.searchNew = {
	manga: {
		rexp: /(x)/i,
		results: 1
	}
}
exports.search = {
	manga: {
		rexp: '<td><a href="http://[www\.]*mangafox\.[come]*/manga/(.+?)/" class="series_preview manga_([openclose]+)".*?>(.+?)</a>[ \t\r\n]+(<span.*?)*[ \t]*</td>[ \t\r\n]+<td><img.+?</td>[ \t\r\n]+<td>[0-9]+</td>[ \t\r\n]+<td>([0-9]+)</td>[ \t\r\n]+<td>[ \t\r\n]+(<a href.*?</a> on (.+?))*(None)*[ \t]*</td>',
		results: {
			1: 'uri',
			2: 'status', //will be open or close
			3: 'title',
			5: 'chapters', //count
			7: 'date' //ex: Nov 3, 2009 or empty string if no chapters
		}
	},
	count: { // if count > 100 then there are multiple pages of results
		rexp: /Total Manga Series: ([0-9]+)<\/div>/i,
		results: 1
	}
}