/**
 * Game simulator class for test
 */
const { GamePlay, Hero, UserMeta } = require('./models');
const User = require('./models/User');
const { Op } = require("sequelize");
var moment = require('moment');

class GameSimulatorTest{
	constructor() {

	}

	async createGameForAllUser(){
		console.log('Start')
		const users = await User.findAll();
		if(users){
			users.forEach( async user => {
				const user_id = parseInt(user.id);
				const game_info = await user.getCalGameInfo();

				const TODAY_START = moment().tz('UTC').startOf('day');
				const NOW = moment().tz('UTC');

				const game = await GamePlay.findOne({where: {
					user_id: user_id,
			      	created_at: { 
			        	[Op.gt]: TODAY_START,
			        	[Op.lt]: NOW
			      	},
			      	finished: 0
			    }});

				let json_data = game_info;
			    if(!game){
					await GamePlay.create({
						user_id: user_id,
						data: json_data,
						won: 0,
						bonus: 0,
						note: '',
						finished: 0
					});
				}

				const non_nft_entries = Math.floor(Math.random() * 100 + 1);
				UserMeta._update(user_id, 'non_nft_entries', non_nft_entries);
			});

			await Hero.update({active:1},{where: {active: 0}});
		}
	}
}

module.exports = GameSimulatorTest;