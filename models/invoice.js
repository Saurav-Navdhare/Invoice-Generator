const mongoose = require("mongoose");

const invoiceSchema = new mongoose.Schema({
    date: {
        type: Date,
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Account",
    },
    accountArray: [{
        accountId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Account",
        },
        amount: Number
    }],
    totalAmount: {
        type: Number,
    },
    invoiceNumber: {
        type: String,
    },
    year: {
        type: String,
    }
});

module.exports = mongoose.model("Invoice", invoiceSchema);