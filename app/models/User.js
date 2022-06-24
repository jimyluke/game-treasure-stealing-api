//Store
var {Sequelize, sequelize} = require('../../config/sequelize.js');
const { Op } = require("sequelize");
const { Hero, QuantityLookup, HeroTierTicket, UserMeta, Option } = require('./');
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

	// get Non-NFT
	let non_nft_entries = 0;
	let user_nne = await UserMeta._get(user_id, 'non_nft_entries', true);
	if(user_nne){
		non_nft_entries = parseInt(user_nne);
	}

	let entry_cal = {};
	let entry_total = 0;
	let ticket_total = 0;
	let TotalSpent = 0;
	let price_per_entry = 0;

	const getPricePerEntry = async (entry_total) => {
		const look = await QuantityLookup.findOne({where:{quantity_from: {[Op.lte]: entry_total}}, order: [['quantity_from', 'DESC']]});
		return look !== null? look.value: 0;
	}

	if(tokens && tokens.length > 0){
		let tokens_data = [];
		await Promise.all(tokens.map(async (token) => {
			let token_tmp = token;
			const token_info = await token.getExtraInfo();
			let entry_legacy = token_info.legacy;
			entry_total += parseInt(entry_legacy);
			token_tmp.token_info = token_info;
			tokens_data.push(token_tmp);
		}));

		entry_total += non_nft_entries; // addition Non-NFT amount
		price_per_entry = await getPricePerEntry(entry_total);

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
	}

	if(non_nft_entries > 0){
		price_per_entry = await getPricePerEntry(non_nft_entries);
		const hero_tier_nne = await HeroTierTicket.findOne({where: {tier: 'Non-NFT'}});
		ticket_total += non_nft_entries * parseInt(hero_tier_nne.tickets);
		entry_total += non_nft_entries;
		TotalSpent += price_per_entry*non_nft_entries;
	}

	let game_calc = await Option._get('last_update_entry_calc');
	game_calc = JSON.parse(game_calc);

	// Set data to property of object
	const ChanceOfWinning = ticket_total/game_calc.ticket_total;
	const ChanceNotWin = 1 - ChanceOfWinning;
	const NoRakeEV = (ChanceOfWinning*game_calc.NoRakePrizePool)+(-ChanceNotWin*TotalSpent);
	const PostRakeEV = (ChanceOfWinning*game_calc.PostRakePrizePool)+(-ChanceNotWin*TotalSpent);

	entry_cal.TotalSpent = TotalSpent;
	entry_cal.entry_total = entry_total;
	entry_cal.ticket_total = ticket_total;
	entry_cal.ChanceOfWinning = ChanceOfWinning;
	entry_cal.ChanceNotWin = ChanceNotWin;
	entry_cal.NoRakeEV = NoRakeEV;
	entry_cal.PostRakeEV = PostRakeEV;
	//console.log(entry_cal);

	return entry_cal;
}

module.exports = User;