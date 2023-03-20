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

        const customer = await Account.findOne({_id:customerId});
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

function checkAccountArray(accountArray) {
    for (let i = 0; i < accountArray.length; i++) {
        if (!accountArray[i].accountId || !accountArray[i].amount) {
            return false;
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
    let { skip, limit, searchText } = req.query;
    if (!skip) skip = 0;
    if (!limit) limit = 10;
    if (!searchText) searchText = "";
    if (parseInt(skip) < 0 || parseInt(limit) < 0) {
        return res.status(400).send("Please provide a valid skip and/or limit");
    }
    try {
        // const invoices = await Invoice.aggregate([
        //     {
        //         $match: {
        //             $or: [                  // Will return any invoice that matches any of the following conditions, to make it all, use $and
        //                 { invoiceNumber: { $regex: searchText, $options: 'i' } },
        //                 { 'accountArray.accountName': { $regex: searchText, $options: 'i' } },
        //                 { 'accountArray.amount': { $regex: searchText, $options: 'i' } },
        //             ],
        //         }
        //     }
        // ],
        //     {
        //         $skip: parseInt(skip) || 0,
        //         $limit: parseInt(limit) || 10,
        //         $sort: { createdAt: -1 }
        //     })
        // res.json(invoices);

        ///////////// Fix this \\\\\\\\\\\\\\\\\\\\
        const invoices = await Invoice.find({
            $or: [                  // Will return any invoice that matches any of the following conditions, to make it all, use $and
                { invoiceNumber: { $regex: searchText, $options: 'i' } },
                { 'accountArray.accountName': { $regex: searchText, $options: 'i' } },
                { 'accountArray.amount': { $regex: searchText, $options: 'i' } },
            ],
            
        })
            .skip(parseInt(skip) || 0)
            .limit(parseInt(limit) || 10)
            .sort({ createdAt: -1 });
        res.json(invoices);
    } catch (err) {
        console.log(err);
        return res.status(400).json({
            message: err.message
        });
    }
    // try {
    //     const invoices = await Invoice.find({
    //         $or: [                  // Will return any invoice that matches any of the following conditions, to make it all, use $and
    //             { invoiceNumber: { $regex: searchText, $options: 'i' } },
    //             { 'accountArray.accountName': { $regex: searchText, $options: 'i' } },
    //             { 'accountArray.amount': { $regex: searchText, $options: 'i' } },
    //         ],
    //     })
    //         .skip(parseInt(skip) || 0)
    //         .limit(parseInt(limit) || 10)
    //         .sort({ createdAt: -1 });

    //     res.json(invoices);
    // } catch (error) {
    //     console.log(error);
    //     res.status(500).json({ message: 'Server Error' });
    // }
}
module.exports = {
    createAccount,
    createInvoice,
    listInvoices
}