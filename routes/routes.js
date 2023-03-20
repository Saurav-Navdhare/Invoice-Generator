const controllers = require('../controllers/controllers.js');
const Router = require('express').Router();

Router.post('/createAccount', controllers.createAccount);
Router.post('/createInvoice', controllers.createInvoice);
Router.get('/listInvoices', controllers.listInvoices);

module.exports = Router;