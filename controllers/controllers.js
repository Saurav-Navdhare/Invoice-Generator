const Account = require("../models/account");
const Invoice = require("../models/invoice");

async function createAccount(req, res) {        // Path: controllers\controllers.js
    const { name, balances } = req.body;

    if (!name) {
        return res.status(400).send("Please provide a name");       // If the name is not provided, return a 400 status code and a message
    }
    else if (!balances || balances.length === 0) {
        return res.status(400).send("Please provide a balance");    // If the balance is not provided, return a 400 status code and a message
    }
    if (!checkBalance(balances)) {
        return res.status(400).send("Please provide a valid year and balance"); // If the year or balance object is not provided, return a 400 status code and a message
    }

    try {
        const account = new Account({     // Create a new account
            name,
            balances
        })
        await account.save(); // Save the account to the database
        return res.status(200).json({       // Return a 200 status code and a message
            message: "Account created",
            account
        });
    } catch (err) {  // If there is an error, return a 400 status code and a message
        return res.status(400).json({
            message: err.message
        });
    }
}

function checkBalance(balances) {  // Helper Function
    for (let i = 0; i < balances.length; i++) {
        if (!balances[i].year || !balances[i].balance) {
            return false;
        }
    }
    return true;
}

async function createInvoice(req, res) {  // Path: controllers\controllers.js
    const { date, customerId, accountArray, totalAmount, invoiceNumber, year } = req.body;
    if (!date || !customerId || !accountArray || accountArray.length == 0 || !totalAmount || !invoiceNumber || !year) { 
        // If any of the required fields are not provided, return a 400 status code and a message
        return res.status(400).send("Please provide all the required fields");
    }
    else if (!checkAccountArray(accountArray)) {    // If the account array is not valid, return a 400 status code and a message
        return res.status(400).send("Please provide a valid account array");
    }
    else if (!validateAccountArray(accountArray, totalAmount)) {    // If the account array is not valid, return a 400 status code and a message
        return res.status(400).send("Please provide a valid account array, Sum is not matching total amount");
    }
    const accountIds = accountArray.map(obj => obj.accountId);  // Get the account ids from the account array
    const accounts = await Account.find({ _id: { $in: accountIds } }); // Get the accounts from the database
    if (accountIds.length !== accounts.length) { // If the account ids are not present in the database, return a 400 status code and a message
        return res.status(400).json({ message: 'All accountId should be present in DB' });
    }
    const existingInvoice = await Invoice.findOne({ year, invoiceNumber }); // Check if the invoice number is already present for the same year
    if (existingInvoice) {      // If the invoice number is already present for the same year, return a 400 status code and a message
        return res.status(400).json({ message: 'Same invoice number is already present for the same year' });
    }
    try {
        const invoice = new Invoice({       // Create a new invoice
            date,
            customerId,
            accountArray,
            totalAmount,
            invoiceNumber,
            year
        });

        const customer = await Account.findOne({ _id: customerId });        // Get the customer from the database
        if (!customer) {
            return res.status(400).json({ message: 'Customer not found' });     // If the customer is not present in the database, return a 400 status code and a message
        }
        const customerBalance = customer.balances.find(b => b.year === year);   // Get the customer balance for the given year
        if (customerBalance) {      // If the customer balance is present for the given year, update the balance
            customerBalance.balance -= parseInt(totalAmount);
        }
        else {      // If the customer balance is not present for the given year, create a new balance object
            customer.balances.push({ year, balance: -totalAmount });
        }
        await customer.save();      // Save the customer to the database
        for (let account of accounts) {     // Update the account balances
            const balance = account.balances.find(b => b.year === year);    // Get the account balance for the given year
            if (balance) {    // If the account balance is present for the given year, update the balance
                balance.balance += parseInt(accountArray.find(a => a.accountId.toString() === account._id.toString()).amount);
            } else {    // If the account balance is not present for the given year, create a new balance object
                account.balances.push({ year, balance: accountArray.find(a => a.accountId.toString() === account._id.toString()).amount });
            }
            await account.save();   // Save the account to the database
        }


        const savedInvoice = await invoice.save();  // Save the invoice to the database
        res.status(201).json(savedInvoice);   // Return a 201 status code and the saved invoice
    } catch (err) {    // If there is an error, return a 400 status code and a message
        console.log(err);
        return res.status(400).json({
            message: err.message
        });
    }
}

async function checkAccountArray(accountArray) {    // Helper Function
    for (let i = 0; i < accountArray.length; i++) {
        if (!accountArray[i].amount) {
            return false;
        }
        else{
            let account = await Account.findOne({ _id: accountArray[i].accountId });
            if (!account) {
                return false;
            }

        }
    }
    return true;
}

function validateAccountArray(accountArray, totalAmount) {  // Helper Function
    let sum = 0;
    for (let i = 0; i < accountArray.length; i++) {
        sum += accountArray[i].amount;
    }
    return (sum == totalAmount);
}


async function listInvoices(req, res) { // Path: controllers\controllers.js
    let { skip, limit, searchText } = req.body;
    try {
        let skipInt = parseInt(skip) || 0; // If skip is not provided, set it to 0
        let limitInt = parseInt(limit) || 10;   // If limit is not provided, set it to 10
        let invoices = [];  // Initialize the invoices array
        if (!searchText) {  // If the search text is not provided, return all the invoices
            invoices = await Invoice.find() // Get all the invoices from the database
                .sort({ date: -1 }) // Sort the invoices by date in descending order
                .skip(skipInt)  // Skip the first skipInt invoices
                .limit(limitInt);   // Limit the number of invoices to limitInt
            res.json(invoices); // Return the invoices

        } else {    
            searchText = searchText.toLowerCase();  // Convert the search text to lowercase
            invoices = Invoice.find().populate("accountArray.accountId").then((invoices) => {   // Get all the invoices from the database
                const invoice = invoices.filter((invoice)=>{    // Filter the invoices\
                    if(invoice.invoiceNumber.includes(searchText)) return true;     // If the invoice number matches (even partially), return true
                    for(let i=0; i<invoice.accountArray.length; i++) { 
                        // If the account name matches (even partially), return true
                        if((invoice.accountArray[i].accountId.name).toLowerCase().includes(searchText)) return true;  
                        // If the account amount matches (even partially), return true
                        else if((invoice.accountArray[i].amount).toString().includes(searchText)) return true;
                    }
                }).sort((a, b)=>{   // Sort the invoices by date in descending order
                    return new Date(b.date) - new Date(a.date);
                }).slice(skipInt, skipInt+limitInt);    // Skip the first skipInt invoices and limit the number of invoices to limitInt
                // If no invoice is found after applying the search criteria, return a 400 status code and a message
                if(invoice.length === 0) return res.status(400).json({message: "No invoice found after applying the search criteria"});
                res.json(invoice);  // Return the invoices
            }).catch((err) => { // If there is an error, return a 400 status code and a message
                console.log(err);   
                return res.status(400).json({
                    message: err.message
                });
            });

        }
    }catch (err) {
        console.log(err);
        return res.status(400).json({
            message: err.message
        });
    }
}
        module.exports = {
            createAccount,
            createInvoice,
            listInvoices
        }