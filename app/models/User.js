//Store
var {Sequelize, sequelize} = require('../../config/sequelize.js');
const { Op } = require("sequelize");
const { Hero, QuantityLookup, HeroTierTicket } = require('./');
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

User.prototype.getCalGameInfo = async function() {
	const user_id = parseInt(this.id);
	const heroes = await Hero.findAll({where: {user_id: user_id, active: 1}});
	let user_token_address = [];
	if(heroes){
		user_token_address = _.map(heroes, 'mint');
	}

	const tokens = await Token.findAll({where: {token_address: user_token_address}});

	let entry_cal = {};
	if(tokens && tokens.length > 0){
		let entry_total = 0;
		let ticket_total = 0;
		let TotalSpent = 0;
		
		let tokens_data = [];
		await Promise.all(tokens.map(async (token) => {
			let token_tmp = token;
			const token_info = await token.getExtraInfo();
			let entry_legacy = token_info.legacy;
			entry_total += parseInt(entry_legacy);
			token_tmp.token_info = token_info;
			tokens_data.push(token_tmp);
		}));

		let price_per_entry = 0;
		const look = await QuantityLookup.findOne({where:{quantity_from: {[Op.lte]: entry_total}}, order: [['quantity_from', 'DESC']]});
		if(look){
			price_per_entry = look.value;
		}

		// Get hero tier ticket data
		const hero_tier_data = await HeroTierTicket.findAll();
		tokens_data.forEach( token => {
			var var_of_hero_tier = _.chain(hero_tier_data).filter(function (h) { return h.tier === token.hero_tier }).first().value();
			const token_info = token.token_info;
			const legacy = token_info.legacy;
			let spent_per_hero = price_per_entry*legacy;
			let ticket_per_hero = legacy*var_of_hero_tier.tickets;
			TotalSpent += spent_per_hero;
			ticket_total += ticket_per_hero;
		});

		// Set data to property of object
		entry_cal.TotalSpent = TotalSpent;
		entry_cal.entry_total = entry_total;
		entry_cal.ticket_total = ticket_total;
		entry_cal.ChanceOfWinning = 0;
		entry_cal.ChanceNotWin = 0;
		entry_cal.NoRakeEV = 0;
		entry_cal.PostRakeEV = 0;
	}

	return entry_cal;
}

module.exports = User;