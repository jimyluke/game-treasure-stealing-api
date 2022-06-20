//Store
var {Sequelize, sequelize} = require('../../config/sequelize.js');

var GamePlay = sequelize.define('GamePlay', {
	id: {
		type: Sequelize.BIGINT,
		allowNull: false,
		autoIncrement: true,
		primaryKey: true
	},
	user_id 		: Sequelize.BIGINT,
	data          	: Sequelize.JSON,
	won				: Sequelize.INTEGER,
	bonus			: Sequelize.INTEGER,
	note			: Sequelize.TEXT
},{
	tableName    	: 'games_play',
	createdAt    	: 'created_at',
	updatedAt    	: 'updated_at',
	timestamps   	: true,
	underscored  	: true
});

module.exports = GamePlay;