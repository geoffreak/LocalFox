LocalFox, Version 4
================================
by Josh DeVinney

Keep your manga reading up-to-date. Includes Mangafox.com and Mangareader.net as sources. Responsive and dark UI allows for easy night-time and mobile reading.

Preview images can be found in the previews directory.

*Note*: This is a single-user installation and is not intended to have multiple users use it.

*Warning*: This script downloads the images and caches the files locally. If you follow a lot of manga, you will need to allocate around 1-3GB per 100 manga on average.


Install Instructions
-------------------------

* Clone repo or download zip file
* Install mongodb (mongodb.org or from your package manager)
* Install node.js (nodejs.org or from your package manager)
* Run the following command in your terminal window: "NODE_ENV=production node app.js"


Usage Instructions
-------------------------
* If the application is not already running, run the following command in your terminal window: "NODE_ENV=production node app.js"
* Open the following URL in your browser: http://localhost:3333
* Search for manga to add by name using the search box at the top right of the page
* Add desired manga from search results by clicking "Add to LocalFox" next to the desired manga
* The manga will begin downloading and chapters will be available to read as they finish downloading

Licensing
-------------------------
All of the included source code and images are under the MIT license except the modules in the node_modules directory, jQuery, Twitter Bootstrap, and the Bootstrap theme, which are under their creators' respective licenses.