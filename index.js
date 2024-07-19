const express = require('express');
const path = require('path');
const exphbs = require('express-handlebars');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const nocache = require('nocache');
const bodyParser = require('body-parser');
const handlebarsHelpers = require('handlebars-helpers')();
const userRoutes = require('./routes/user');
const adminRoutes = require('./routes/admin');
require('./Database/DB');

const app = express();

// Register a custom Handlebars helper
const Handlebars = require('handlebars');

// Custom Handlebars helpers
Handlebars.registerHelper('multiply', (a, b) => (a * b).toFixed(2));
Handlebars.registerHelper('add', (a, b) => a + b);
Handlebars.registerHelper('subtract', (a, b) => a - b);
Handlebars.registerHelper('range', function(from, to, options) {
  let accum = '';
  for (let i = from; i <= to; ++i) {
    accum += options.fn(i);
  }
  return accum;
});

// Configure Handlebars engine
app.engine(
  'hbs',
  exphbs.engine({
    extname: 'hbs',
    defaultLayout: 'layout',
    layoutsDir: path.join(__dirname, 'views', 'layout'),
    partialsDir: path.join(__dirname, 'views', 'partial'),
    helpers: {
      ...handlebarsHelpers,
      multiply: (a, b) => (a * b).toFixed(2), // Ensure multiplication and format to 2 decimal places
      add: (a, b) => a + b,
      subtract: (a, b) => a - b,
      range: (from, to, options) => {
        let accum = '';
        for (let i = from; i <= to; ++i) {
          accum += options.fn(i);
        }
        return accum;
      }
    },
  })
);

app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(cookieParser());
app.use(
  session({
    secret: 'MyKey',
    resave: false,
    saveUninitialized: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/admin',express.static('public'));
app.use(nocache());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use('/', userRoutes);
app.use('/admin', adminRoutes);

app.get('*', function (req, res) {
  res.status(404).render('layout/page-404');
});

app.listen(5000, () => {
  console.log('Server is running on port 5000');
});
