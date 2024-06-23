const Handlebars = require('handlebars');

module.exports = () => {
  Handlebars.registerHelper('range', function(from, to, block) {
    let accum = '';
    for (let i = from; i <= to; ++i) {
      accum += block.fn(i);
    }
    return accum;
  });

  Handlebars.registerHelper('subtract', function(a, b) {
    return a - b;
  });

  Handlebars.registerHelper('add', function(a, b) {
    return a + b;
  });

  Handlebars.registerHelper('multiply', (a, b) => (a * b).toFixed(2));
};
