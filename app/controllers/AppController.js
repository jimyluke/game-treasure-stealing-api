/**
 * APP Controller
 */

const Option = require('../models/Option')
const Token = require('../cq-models/Token')
const DawnOfMan = require('../cq-models/DawnOfMan')
const User = require('../models/User');
const GameHelper = require('../GameHelper')

exports.dev = async (req, res) => {
	//const user = await User.findByPk(1);
	//const game_info = await user.getCalGameInfo();
	//console.log(game_info);
	const helper = new GameHelper();
	let data = await helper.PrizesDistribution();
	//let data = await helper.getHeroStatByToken('HT3nEQEVJDttyAEKiTSeK2xEkJtZg8ieSVsPDnohosmg');
	console.log(data);
	
	res.render('dev', { title: '4Dev' });
}