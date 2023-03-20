const mongoose = require("mongoose");

const accountSchema = new mongoose.Schema({
    name: {
        type: String,
    },
    balances: [
        {
            year: String,
            balance: Number,
        }
    ]
});

module.exports = mongoose.model("Account", accountSchema);