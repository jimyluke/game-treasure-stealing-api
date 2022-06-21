/**
 * APP Controller
 */

const Option = require('../models/Option')
const Token = require('../cq-models/Token')
const DawnOfMan = require('../cq-models/DawnOfMan')
const User = require('../models/User')

exports.dev = async (req, res) => {
	const user = await User.findByPk(1);
	const game_info = await user.getCalGameInfo();
	console.log(game_info);
	res.render('dev', { title: '4Dev' });
}