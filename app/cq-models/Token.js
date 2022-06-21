//Store
var {Sequelize, cq_sequelize} = require('../../config/sequelize.js');

var Token = cq_sequelize.define('Token', {
	id: {
		type: Sequelize.BIGINT,
		allowNull: false,
		autoIncrement: true,
		primaryKey: true
	},
	token_address   : Sequelize.STRING,
	mint_name       : Sequelize.STRING,
	tome          	: Sequelize.STRING,
	mint_number		: Sequelize.INTEGER,
	token_number	: Sequelize.INTEGER,
	stat_points		: Sequelize.INTEGER,
	cosmetic_points	: Sequelize.INTEGER,
	stat_tier 		: Sequelize.STRING,
	cosmetic_tier 	: Sequelize.STRING,
	hero_tier 		: Sequelize.STRING
},{
	tableName    	: 'tokens',
	createdAt    	: 'created_at',
	updatedAt    	: 'updated_at',
	timestamps   	: true,
	underscored  	: true
});

module.exports = Token;