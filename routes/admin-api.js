const AdminAuthController = require('../app/controllers/AuthController');
const {authenticateToken} = require('../app/middlewares/admin-auth.middleware');

exports.config = function(app, _prefix){
  if(typeof _prefix === 'undefined'){
    _prefix = '/api/admin'
  }

  //Auth
	app.post(`${_prefix}/auth/login`, [AdminAuthController.login]);
	app.post(`${_prefix}/auth/refresh-token`, [AdminAuthController.refresh_token]);
	app.get(`${_prefix}/auth/info`, [authenticateToken, AdminAuthController.info]);
	app.post(`${_prefix}/auth/logout`, [authenticateToken, AdminAuthController.logout]);
}