/**
 * Class Solana
 * Author: os.solutionvn@gmail.com <Be Duc Tai>
 */

const parseArgs = require('minimist');
const web3 = require('@solana/web3.js');
const SOLANA_DECIMAL = 9;
const commitment = "confirmed";
let nodeType = "testnet";
const axios = require('axios').default;
const Option = require('../models/Option');

class Solana {
	constructor(){
		this.connection = null;
		this.rateURL = '';
		this.sol_usd_rate = 33.91;
	}

	getConnection() {
	    if (!this.connection) {
	        this.connection = new web3.Connection(
	            web3.clusterApiUrl(nodeType),
	            commitment,
	        );
	    }
	    return this.connection;
	}

	async getRemoteRate(type){
		if(typeof type === 'undefined'){
			type = 'usd-sol';
		}

		let type_arr = type.split('-');
		const to_currency = type_arr[0] || 'usd';
		this.rateURL = `https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=${to_currency}`;
		let rate = this.sol_usd_rate;
		try{
			const result = await axios.get(this.rateURL);
			rate = result.data.solana.usd;
		}catch(err){
			// Hanlde errors
		}
		return rate;
	}

	async getRate(){
		return parseFloat(await Option._get('sol_usd_rate')) || this.sol_usd_rate;
	}

	async convert(amount, type){
		let rate = await this.getRate(type);
		return 1/rate*amount;
	}

	async updateSolRate(){
		const rate = await this.getRemoteRate();
		return await Option._update('sol_usd_rate', rate);
	}

	async showSolBalance(accountAddr) {
	    let connection = this.getConnection();
	    let account = new web3.PublicKey(accountAddr);
	    let accountBalance = await connection.getBalance(account);
	    let balance = (accountBalance/10**SOLANA_DECIMAL).toFixed(6);
	    return balance;
	}

	async requestAirdrop(address) {
	    let connection = this.getConnection();
	    let account = new web3.PublicKey(address);

	    // Airdrop some SOL to the sender's wallet, so that it can handle the txn fee
	    var airdropSignature = await connection.requestAirdrop(
	        account,
	        web3.LAMPORTS_PER_SOL,
	    );

	    // Confirming that the airdrop went through
	    let resp = await connection.confirmTransaction(airdropSignature);
	    return resp;
	}

	// Transfer solana between accounts
	async transferSOL(fromPrivateKey, toAddress, amount) {
	    let connection = getConnection();
	    let fromAccount = web3.Keypair.fromSeed(new Uint8Array(Buffer.from(fromPrivateKey, "hex")));
	    let toAccount = new web3.PublicKey(toAddress);
	    let lamports = (amount*web3.LAMPORTS_PER_SOL).toFixed(0);

	    // Add transfer instruction to transaction
	    var transaction = new web3.Transaction().add(
	        web3.SystemProgram.transfer({
	            fromPubkey: fromAccount.publicKey,
	            toPubkey: toAccount,
	            lamports: lamports,
	        })
	    );

	    // Sign transaction, broadcast, and confirm
	    var signature = await web3.sendAndConfirmTransaction(
	        connection,
	        transaction,
	        [fromAccount]
	    );
	    
	    return signature;
	}
}

module.exports = Solana;