//const Tools = require('../app/Tools'); 
const AppController = require('../app/controllers/AppController');
const Option = require('../app/models/Option')
const Token = require('../app/cq-models/Token')
const DawnOfMan = require('../app/cq-models/DawnOfMan')

exports.config = function(app, _prefix){
  if(typeof _prefix === 'undefined'){
    _prefix = ''
  }

  app.get('/', function(req, res, next) {
	  res.render('index', { title: 'Game' });
	});

  app.get('/dev', async function(req, res, next) {
    // const dom = await DawnOfMan.findAll();
    // console.log(dom)
    // let pass = await Tools.passwordGenerator('stdev@123456');
    // console.log(pass);
    Option._update('test_key', 'OK');

    res.render('dev', { title: 'Dev' });
  });
}