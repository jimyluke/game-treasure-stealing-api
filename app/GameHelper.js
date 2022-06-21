/**
 * GameHelper Object Class
 */
var {Sequelize, sequelize} = require('../config/sequelize.js');
const Op = Sequelize.Op;
const { Option, Hero, QuantityLookup, HeroTierTicket } = require('./models');
const { Token } = require('./cq-models');
var moment = require('moment');
const _ = require('lodash');

class GameHelper {

    async getWakePercent(){
        let percent = await Option._get('wake_percent');
        return percent / 100;
    }

    async getSleepPercent(){
        let percent = await Option._get('sleep_percent');
        return percent / 100;
    }

    async getRawRakePercent(){
        let percent = await Option._get('raw_rake_percent');
        return percent / 100;
    }

    async getEffectiveRakePercent(){
        return await this.getRawRakePercent() * await this.getWakePercent();
    }
    /**
     * Prepare for the result calculation
     * @return {object} [Results]
     */
	async PrepareCalculation(){
        let self = this;

        // Query all hero active of all user submitted a game today
        let now = moment().format('YYYY-MM-DD HH:mm:ss');
        let query = `SELECT h.* FROM heroes AS h,games_play AS gp WHERE h.user_id=gp.user_id AND h.active=1 AND gp.created_at::date=('${now}'::timestamp)::date AND gp.created_at<='${now}'::timestamp`;
        const heroes = await sequelize.query(query, { type: sequelize.QueryTypes.SELECT});
        let tokens_address = [];
        let total_user = 0;
        if(heroes){
            tokens_address = _.map(heroes, 'mint');
            let user_ids = _.map(heroes, 'user_id');
            let unique_user_ids = [];
            user_ids.forEach(id => {
                if(unique_user_ids.indexOf(id) === -1){
                    unique_user_ids.push(id);
                }
            });
            total_user = unique_user_ids.length;
        }

        const tokens = await Token.findAll({where: {token_address: tokens_address}});
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
            const EffectiveRake = await this.getEffectiveRakePercent();
            const PostRakePrizePool = (1-EffectiveRake)*TotalSpent;
            entry_cal.NoRakePrizePool = TotalSpent;
            entry_cal.PostRakePrizePool = PostRakePrizePool;
            entry_cal.entry_total = entry_total;
            entry_cal.ticket_total = ticket_total;
            entry_cal.user_total = total_user;
            entry_cal.EstUsers = Math.ceil(entry_total/total_user);
            entry_cal.EstRakePerDay = TotalSpent - PostRakePrizePool;
        }

        Option._update('last_update_entry_calc', JSON.stringify(entry_cal));
        //console.log(entry_cal);
        return entry_cal;
    }
}

module.exports = GameHelper;