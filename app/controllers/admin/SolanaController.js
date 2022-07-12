/**
 * Settings Controller
 */
const _ = require('lodash');
const Option = require('../../models/Option');
const AdminWallet = require('../../models/AdminWallet');
const { SolanaWallet } = require('../../solana');

exports.loadWallets = async (req, res) => {
	const walles = await AdminWallet.findAll({order: [['id', 'DESC']]});
	const primary_wallet = await Option._get('primary_wallet');
	let settings = {};
	let walles_data = [];

	walles.forEach( wallet => {
		let _wallet = wallet.dataValues;
		let is_primary = (primary_wallet === _wallet.wallet_address)? true: false;
		_wallet.is_primary = is_primary;
		walles_data.push(_wallet);
	});

	settings = await Option._get('solana_settings');
	let sol_usd_rate = await Option._get('sol_usd_rate');
	sol_usd_rate = parseFloat(sol_usd_rate);

	if(!settings){
		settings = {
			auto_update_rate: true,
			node_type: 'testnet',
			sol_usd_rate: ''
		}
	}

	settings.sol_usd_rate = sol_usd_rate;

	res.json({ 
		success: true,
		settings: settings,
		walles: walles_data
	});
}

exports.generateWallet = async (req, res) => {
	const SW = new SolanaWallet();
	const wallet_data = await SW.generateWallet();

	await AdminWallet.create({
		wallet_address: wallet_data.wallet,
		mnemonic: wallet_data.mnemonic,
		private_key: wallet_data.private_key,
		private_key_arr: wallet_data.private_key_arr
	});

	res.json({ 
		success: true,
		wallet_data: wallet_data
	});
}

exports.setPrimaryWallet = async (req, res) => {
	const id = req.body.id || 0;
	const wallet_data = await AdminWallet.findByPk(id);
	const wallet_address = wallet_data.wallet_address || '';
	if(wallet_address){
		await Option._update('primary_wallet', wallet_address);
	}

	res.json({ 
		success: true,
		id: id
	});
}

exports.updateSettings = async (req, res) => {
	let settings = req.body.settings || {};
	if(!_.isEmpty(settings)){
		await Option._update('solana_settings', settings);
	}

	res.json({ 
		success: true
	});
}