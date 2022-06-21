//Store
var {Sequelize, sequelize} = require('../../config/sequelize.js');
const { Hero } = require('./');
const { Token } = require('../cq-models');
const _ = require('lodash');

var User = sequelize.define('User', {
	id: {
		type: Sequelize.BIGINT,
		allowNull: false,
		autoIncrement: true,
		primaryKey: true
	},
	fullname          	: Sequelize.STRING,
	wallet_address      : Sequelize.STRING,
	email           	: Sequelize.STRING,
	email_verified_at 	: Sequelize.DATE,
	password   			: Sequelize.STRING,
	active      	    : Sequelize.INTEGER,
	sol_balance       	: Sequelize.FLOAT,
	total_loot        	: Sequelize.FLOAT,
	total_loot_won      : Sequelize.FLOAT,
	loose_loost        	: Sequelize.FLOAT,
  	avatar_url   		: Sequelize.STRING,
  	uid   			    : Sequelize.STRING
},{
	tableName    	: 'users',
	createdAt    	: 'created_at',
	updatedAt    	: 'updated_at',
	timestamps   	: true,
	underscored  	: true
});

User.prototype.getGameInfo = async function() {
	const user_id = parseInt(this.id);
	const heroes = await Hero.findAll({where: {user_id: user_id, active: 1}});
	let user_token_address = [];
	if(heroes){
		user_token_address = _.map(heroes, 'mint');
		console.log(user_token_address);
	}

	const tokens = await Token.findAll({where: {token_address: user_token_address}});
	if(tokens && tokens.length > 0){
		tokens.forEach( async token => {
			const token_info = await token.getExtraInfo();
			console.log(token_info)
		})
	}

	return 1;
}

module.exports = User;