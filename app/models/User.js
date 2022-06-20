//Store
var {Sequelize, sequelize} = require('../../config/sequelize.js');

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

module.exports = User;