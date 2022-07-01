//Store
var {Sequelize, sequelize} = require('../../config/sequelize.js');
const Op = Sequelize.Op;
const _ = require('lodash');
var moment = require('moment');

var Game = sequelize.define('Game', {
	id: {
		type: Sequelize.BIGINT,
		allowNull: false,
		autoIncrement: true,
		primaryKey: true
	},
	data          	: Sequelize.JSON,
	result          : Sequelize.STRING,
	back_pot		: Sequelize.FLOAT,
	end				: Sequelize.INTEGER,
	note			: Sequelize.TEXT
},{
	tableName    	: 'games',
	createdAt    	: 'created_at',
	updatedAt    	: 'updated_at',
	timestamps   	: true,
	underscored  	: true
});

Game.getTodayGame = async function(){
	const TODAY_START = moment().tz('UTC').startOf('day');
	const NOW = moment().tz('UTC');
	
	const game = await Game.findOne({where: {
      	created_at: { 
        	[Op.gt]: TODAY_START,
        	[Op.lt]: NOW
      	},
      	end: 0
    }});

    return game;
}

// Get current game today
Game.getCurrentId = async function(){
	const game = await Game.getTodayGame();
    return game !== null? parseInt(game.id): 0;
}

Game.getData = async function(){
	const game = await Game.getTodayGame();
	return game !== null? game.data: {};
}

// Update game data
Game.updateData = async function(data, current_game_id){
	if(typeof current_game_id === 'undefined'){
		current_game_id = await Game.getCurrentId();
	}
	return await Game.update({data: data}, {where: {id: current_game_id}});
}

module.exports = Game;