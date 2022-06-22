/**
 * GameHelper Object Class
 */
var {Sequelize, sequelize} = require('../config/sequelize.js');
const Op = Sequelize.Op;
const { Option, Hero, QuantityLookup, HeroTierTicket, UserMeta } = require('./models');
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
        let unique_user_ids = [];
        if(heroes){
            tokens_address = _.map(heroes, 'mint');
            let user_ids = _.map(heroes, 'user_id');
            user_ids.forEach(id => {
                if(unique_user_ids.indexOf(id) === -1){
                    unique_user_ids.push(id);
                }
            });
            total_user = unique_user_ids.length;
        }

        const non_nft_entries = await UserMeta.findAll({where: {user_id: unique_user_ids, meta_key: 'non_nft_entries'}});
        console.log(unique_user_ids);
        console.log(non_nft_entries);

        const tokens = await Token.findAll({where: {token_address: tokens_address}});
        const AVG_price_per_entry = 0.9;
        let entry_calc = {};
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

            // Get hero tier ticket data
            const hero_tier_data = await HeroTierTicket.findAll();
            tokens_data.forEach( token => {
                var var_of_hero_tier = _.chain(hero_tier_data).filter(function (h) { return h.tier === token.hero_tier }).first().value();
                const token_info = token.token_info;
                const legacy = token_info.legacy;
                let spent_per_hero = AVG_price_per_entry*legacy;
                let extra_tix = legacy*var_of_hero_tier.tix_from_stats;
                let ticket_per_hero = legacy*var_of_hero_tier.tickets + extra_tix;
                TotalSpent += spent_per_hero;
                ticket_total += ticket_per_hero;
            });

            // Set data to property of object
            const EffectiveRake = await this.getEffectiveRakePercent();
            const PostRakePrizePool = (1-EffectiveRake)*TotalSpent;
            entry_calc.NoRakePrizePool = TotalSpent;
            entry_calc.PostRakePrizePool = PostRakePrizePool;
            entry_calc.entry_total = entry_total;
            entry_calc.ticket_total = ticket_total;
            entry_calc.user_total = total_user;
            entry_calc.EstUsers = Math.round(entry_total/total_user);
            entry_calc.EstRakePerDay = TotalSpent - PostRakePrizePool;
        }

        Option._update('last_update_entry_calcc', JSON.stringify(entry_calc));

        return entry_calc;
    }

    /**
     * [PrizeCalc description]
     */
    async PrizeCalc(){
        const entry_calc = await this.PrepareCalculation();
        let users_count = entry_calc.user_total; console.log(users_count);
        let percent_of_user_paid = parseInt(await Option._get('percent_of_user_paid'));
        const winning_users = Math.round((users_count*percent_of_user_paid/100)+1);
        let max_prize = users_count > 5? 5: users_count;

        let prize_data = {};
        let percent_of_winning_users = [1/users_count*100,1.1364,3.79,6.95,87.73];
        let percent_of_bounty = [25,15,17,10,33];

        for(var i=0; i<max_prize; i++){
            let no_of_winning_wallets = i === 0? percent_of_winning_users[i]/100*winning_users: Math.round(percent_of_winning_users[i]/100*winning_users);
            let bounty = percent_of_bounty[i]/100*entry_calc.NoRakePrizePool;
            let prize = 0;
            if(no_of_winning_wallets !== 0){
                prize = i === 0? bounty: bounty/no_of_winning_wallets;
            }
            prize_data[`pos_${i+1}`] = {
                prize: prize,
                bounty: Math.round(bounty),
                no_of_winning_wallets: no_of_winning_wallets,
                percent_of_winning_users: percent_of_winning_users[i],
                percent_of_bounty: percent_of_bounty[i]
            }
        }

        return {
            winning_users_count: winning_users,
            prize: prize_data
        }
    }
}

module.exports = GameHelper;