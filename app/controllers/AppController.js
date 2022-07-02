/**
 * APP Controller
 */

const Option = require('../models/Option');
const Token = require('../cq-models/Token');
const DawnOfMan = require('../cq-models/DawnOfMan');
const User = require('../models/User');
const Game = require('../models/Game');
const GameHelper = require('../GameHelper');
const GameSimulatorTest = require('../GameSimulatorTest');
var moment = require('moment');
const _ = require('lodash');

exports.dev = async (req, res) => {
	//const user = await User.findByPk(1);
	//const game_info = await user.getCalGameInfo();
	//console.log(game_info);
	
	const helper = new GameHelper();
	let data = await helper.PrizeCalc();
	console.log(data);
	// 
	// const day1 = moment().tz('UTC').subtract(1, 'd').format('YYYY-MM-DD 17:00:00');
	// const day2 = moment().tz('UTC').subtract(2, 'd').format('YYYY-MM-DD 17:00:00');

	//console.log(day1, day2);
	
	//const simulator = new GameSimulatorTest();
	//await simulator.createGameForAllUser();
	
	res.render('dev', { title: '4Dev' });
}

exports.getGameInfo = async (req, res) => {
	const now = moment().tz('UTC').format('YYYY-MM-DD HH:MM:SS');
	let date = moment().tz('UTC').format('YYYY-MM-DD');
	let wake_time = `${date} 17:00:00`;

	if(wake_time < now){
		date = moment().add(1,'d').tz('UTC').format('YYYY-MM-DD');
		wake_time = `${date} 17:00:00`;
	}

	var duration = moment.duration(moment(wake_time).tz('UTC').diff(now));
    const seconds = duration.asSeconds();
    const bonenosher_status = await Option._get('bonenosher_status');
    //let last_game = await Option._get('last_update_entry_calc');
    let last_game = await Game.getData();
    //last_game = JSON.parse(last_game);

    if(seconds < 0){

    }

	const game_info = {
		time_now: now,
		wake_time: wake_time,
		seconds: seconds,
		bonenosher_status: bonenosher_status,
		bonenosher_bounty: {
			total: last_game.NoRakePrizePool,
			loose: 0
		},
		queued_thieves: 0,
		active_thieves: 0,
		thieves_guide_standing: {
			active: 0,
			total: 0
		}
	};

	res.json({ 
		success: true,
		game_info: game_info
	});
}