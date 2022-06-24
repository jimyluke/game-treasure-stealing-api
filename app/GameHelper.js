/**
 * GameHelper Object Class
 */
var {Sequelize, sequelize, cq_sequelize} = require('../config/sequelize.js');
const Op = Sequelize.Op;
const { Option, Hero, QuantityLookup, HeroTierTicket, UserMeta } = require('./models');
const { Token, Character } = require('./cq-models');
var moment = require('moment');
const _ = require('lodash');

class GameHelper {

    constructor() {
        // Constructor
        this.unique_user_ids = [];
        this.total_user = 0;
        this.winning_users_count = 0;
    }

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

    // Stat for each hero
    async getHeroStatByToken(token){
        const query = `SELECT T.token_address, C.* FROM characters as C, tokens as T WHERE C.nft_id = T.id AND T.token_address = '${token}'`;
        const CharacterInfo = await cq_sequelize.query(query, { type: cq_sequelize.QueryTypes.SELECT});
        let stats = {
            DexWisExtraTix: 0,
            ConStrExtraTix: 0,
            IntChaExtraTix: 0
        };
        if(CharacterInfo){
            const info = CharacterInfo[0];
            stats.DexWisExtraTix = Math.round(((info.dexterity+info.wisdom-20)/24)*10);
            stats.ConStrExtraTix = Math.round(((info.constitution+info.strength-20)/24)*7);
            stats.IntChaExtraTix = Math.round(((info.intelligence+info.charisma-20)/24)*3);
        }
        return stats;
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
                let uid = parseInt(id);
                if(unique_user_ids.indexOf(uid) === -1){
                    unique_user_ids.push(uid);
                }
            });
            total_user = unique_user_ids.length;
        }

        this.unique_user_ids = unique_user_ids;
        this.total_user = total_user;

        const AVG_price_per_entry = 0.9;
        const hero_tier_nne = await HeroTierTicket.findOne({where: {tier: 'Non-NFT'}});
        const non_nft_entries = await UserMeta.findAll({where: {user_id: unique_user_ids, meta_key: 'non_nft_entries'}});
        let entry_total_nne = 0;
        let ticket_total_nne = 0;
        let TotalSpent_nne = 0;
        non_nft_entries.forEach( nne => {
            const nne_no = parseInt(nne.meta_value);
            entry_total_nne += nne_no;
            ticket_total_nne += nne_no * parseInt(hero_tier_nne.tickets);
            TotalSpent_nne += nne_no*AVG_price_per_entry;
        });

        const tokens = await Token.findAll({where: {token_address: tokens_address}});
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
            entry_calc.NoRakePrizePool = TotalSpent + TotalSpent_nne;
            entry_calc.PostRakePrizePool = PostRakePrizePool;
            entry_calc.entry_total = entry_total + entry_total_nne;
            entry_calc.ticket_total = ticket_total + ticket_total_nne;
            entry_calc.user_total = total_user;
            entry_calc.EstUsers = Math.round(entry_total/total_user);
            entry_calc.EstRakePerDay = TotalSpent - PostRakePrizePool;
        }

        // Update this will use for single user calc [PostRake EV, NoRake EV]
        Option._update('last_update_entry_calc', JSON.stringify(entry_calc));

        return entry_calc;
    }

    /**
     * [PrizeCalc description]
     */
    async PrizeCalc(){
        const entry_calc = await this.PrepareCalculation(); console.log(entry_calc);
        let users_count = entry_calc.user_total;
        let percent_of_user_paid = parseInt(await Option._get('percent_of_user_paid'));
        const winning_users = Math.round((users_count*percent_of_user_paid/100)+1);
        let max_prize = winning_users > 5? 5: winning_users;
        this.winning_users_count = winning_users;

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

        return prize_data;
    }

    /**
     * [PrizesDistribution description]
     * The function should just pull random tickets until all [winners] prizes are distributed
     */
    async PrizesDistribution(){
        const prize_data = await this.PrizeCalc();
        const user_ids = this.unique_user_ids;
        const winning_users_count = this.winning_users_count;
        console.log(prize_data);
        console.log(user_ids);
        console.log(winning_users_count);
        return true;
    }
}

module.exports = GameHelper;