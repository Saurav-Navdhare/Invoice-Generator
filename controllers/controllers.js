const Account = require("../models/account");
const Invoice = require("../models/invoice");
async function createAccount(req, res) {
    const { name, balances } = req.body;

    if (!name) {
        return res.status(400).send("Please provide a name");
    }
    else if (!balances || balances.length === 0) {
        return res.status(400).send("Please provide a balance");
    }
    if (!checkBalance(balances)) {
        return res.status(400).send("Please provide a valid year and balance");
    }

    try {
        const account = new Account({
            name,
            balances
        })
        await account.save();
        return res.status(200).json({
            message: "Account created",
            account
        });
    } catch (err) {
        return res.status(400).json({
            message: err.message
        });
    }
}

function checkBalance(balances) {
    for (let i = 0; i < balances.length; i++) {
        if (!balances[i].year || !balances[i].balance) {
            return false;
        }
    }
    return true;
}

async function createInvoice(req, res) {
    const { date, customerId, accountArray, totalAmount, invoiceNumber, year } = req.body;
    if (!date || !customerId || !accountArray || accountArray.length == 0 || !totalAmount || !invoiceNumber || !year) {
        return res.status(400).send("Please provide all the required fields");
    }
    else if (!checkAccountArray(accountArray)) {
        return res.status(400).send("Please provide a valid account array");
    }
    else if (!validateAccountArray(accountArray, totalAmount)) {
        return res.status(400).send("Please provide a valid account array, Sum is not matching total amount");
    }
    const accountIds = accountArray.map(obj => obj.accountId);
    const accounts = await Account.find({ _id: { $in: accountIds } });
    if (accountIds.length !== accounts.length) {
        return res.status(400).json({ message: 'All accountId should be present in DB' });
    }
    const existingInvoice = await Invoice.findOne({ year, invoiceNumber });
    if (existingInvoice) {
        return res.status(400).json({ message: 'Same invoice number is already present for the same year' });
    }
    try {
        const invoice = new Invoice({
            date,
            customerId,
            accountArray,
            totalAmount,
            invoiceNumber,
            year
        });

        const customer = await Account.findOne({ _id: customerId });
        if (!customer) {
            return res.status(400).json({ message: 'Customer not found' });
        }
        const customerBalance = customer.balances.find(b => b.year === year);
        if (customerBalance) {
            customerBalance.balance -= parseInt(totalAmount);
        }
        else {
            customer.balances.push({ year, balance: -totalAmount });
        }
        await customer.save();
        for (let account of accounts) {
            const balance = account.balances.find(b => b.year === year);
            if (balance) {
                balance.balance += parseInt(accountArray.find(a => a.accountId.toString() === account._id.toString()).amount);
            } else {
                account.balances.push({ year, balance: accountArray.find(a => a.accountId.toString() === account._id.toString()).amount });
            }
            await account.save();
        }


        const savedInvoice = await invoice.save();
        res.status(201).json(savedInvoice);
    } catch (err) {
        console.log(err);
        return res.status(400).json({
            message: err.message
        });
    }
}

async function checkAccountArray(accountArray) {
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

function validateAccountArray(accountArray, totalAmount) {
    let sum = 0;
    for (let i = 0; i < accountArray.length; i++) {
        sum += accountArray[i].amount;
    }
    return (sum == totalAmount);
}


async function listInvoices(req, res) {
    let { skip, limit, searchText } = req.body;
    try {
        let skipInt = parseInt(skip) || 0;
        let limitInt = parseInt(limit) || 10;
        let invoices = [];
        if (!searchText) {
            invoices = await Invoice.find()
                .skip(skipInt)
                .limit(limitInt)
                .sort({ createdAt: -1 });
            res.json(invoices);

        } else {
            searchText = searchText.toLowerCase();
            invoices = Invoice.find().populate("accountArray.accountId").then((invoices) => {
                const invoice = invoices.filter((invoice)=>{
                    // try to match the invoice number with the search text or the account name with the search text or the amount with the search text
                    if(invoice.invoiceNumber.includes(searchText)) return true;
                    for(let i=0; i<invoice.accountArray.length; i++) {
                        if((invoice.accountArray[i].accountId.name).toLowerCase().includes(searchText)) return true;
                        else if((invoice.accountArray[i].amount).toString().includes(searchText)) return true;
                    }
                }).slice(skipInt, skipInt+limitInt);
                if(invoice.length === 0) return res.status(400).json({message: "No invoice found after applying the search criteria"});
                res.json(invoice);
            }).catch((err) => {
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