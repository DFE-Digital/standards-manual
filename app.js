
require('dotenv').config();

const express = require('express');
const nunjucks = require('nunjucks');
const dateFilter = require('nunjucks-date-filter');
const markdown = require('nunjucks-markdown');
const marked = require('marked');
const bodyParser = require('body-parser');
const path = require('path');
const config = require('./app/config');
const forceHttps = require('express-force-https');
const compression = require('compression');
const routes = require('./app/routes');
const session = require('express-session');
const favicon = require('serve-favicon');
const PageIndex = require('./app/middleware/pageIndex');
const pageIndex = new PageIndex(config);
const app = express();

app.use(compression());




app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(favicon(path.join(__dirname, 'public/assets/images', 'favicon.ico')));

app.set('view engine', 'html');

app.locals.serviceName = "Standards manual";

// Set up Nunjucks as the template engine
var nunjuckEnv = nunjucks.configure(
  [
    'app/views',
    'node_modules/govuk-frontend/dist/',
    'node_modules/dfe-frontend/packages/components',
  ],
  {
    autoescape: true,
    express: app,
  },
);

nunjuckEnv.addFilter('date', dateFilter);
markdown.register(nunjuckEnv, marked.parse);
nunjuckEnv.addFilter('formatNumber', function (number) {
  return number.toLocaleString();
});

nunjuckEnv.addFilter('hyphen', function (str) {
  return str.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
});

nunjuckEnv.addFilter('slugify', function (str) {
  return str
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')   // Replace spaces with -
    .replace(/[^\w\-]+/g, '')   // Remove all non-word chars
    .replace(/\-\-+/g, '-');  // Replace multiple - with single -
});

app.use(forceHttps);


// Set up static file serving for the app's assets
app.use('/assets', express.static('public/assets'))

app.use((req, res, next) => {
  if (req.url.endsWith('/') && req.url.length > 1) {
    const canonicalUrl = req.url.slice(0, -1)
    res.set('Link', `<${canonicalUrl}>; rel="canonical"`)
  }
  next()
})

app.get('/downloads/:filename', (req, res) => {
  const filename = req.params.filename

  if (!/^[a-zA-Z0-9-_]+\.(docx|pdf|xlsx)$/.test(filename)) {
    return res.status(400).send('Invalid file name')
  }

  const filePath = path.join(__dirname, 'app/assets/downloads', filename)

  if (!filePath.startsWith(path.join(__dirname, 'app/assets/downloads'))) {
    return res.status(400).send('Invalid file path')
  }
  res.setHeader('Content-Disposition', `attachment; filename=${filename}`)

  // Send the file
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('File send error:', err)
      res.status(500).send('Server error')
    }
  })
})


app.use('/', routes)



app.get('/robots.txt', function (req, res) {
  res.type('text/plain');
  res.send("User-agent: *\nDisallow: /");
});

// Render sitemap.xml in XML format
app.get('/sitemap.xml', (_, res) => {
  res.set({ 'Content-Type': 'application/xml' });
  res.render('sitemap.xml')
})



if (config.env !== 'development') {
  setTimeout(() => {
    pageIndex.init()
  }, 2000)
}



app.get(/\.html?$/i, function (req, res) {
  var path = req.path;
  var parts = path.split('.');
  parts.pop();
  path = parts.join('.');
  res.redirect(path);
});

app.get(/^([^.]+)$/, function (req, res, next) {
  matchRoutes(req, res, next);
});

// Handle 404 errors
app.use(function (req, res, next) {
  res.status(404).render('error.html');
});

// Handle 500 errors
app.use(function (err, req, res, next) {
  console.error(err.stack);
  res.status(500).render('error.html');
});

// Try to match a request to a template, for example a request for /test
// would look for /app/views/test.html
// and /app/views/test/index.html

function renderPath(path, res, next) {
  // Try to render the path
  res.render(path, function (error, html) {
    if (!error) {
      // Success - send the response
      res.set({ 'Content-type': 'text/html; charset=utf-8' });
      res.end(html);
      return;
    }
    if (!error.message.startsWith('template not found')) {
      // We got an error other than template not found - call next with the error
      next(error);
      return;
    }
    if (!path.endsWith('/index')) {
      // Maybe it's a folder - try to render [path]/index.html
      renderPath(path + '/index', res, next);
      return;
    }
    // We got template not found both times - call next to trigger the 404 page
    next();
  });
}

matchRoutes = function (req, res, next) {
  var path = req.path;

  // Remove the first slash, render won't work with it
  path = path.substr(1);

  // If it's blank, render the root index
  if (path === '') {
    path = 'index';
  }

  renderPath(path, res, next);
};

app.listen(config.port);