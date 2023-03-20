const express = require("express");
const app = express();
const mongoose = require("mongoose");
require("dotenv").config();
app.use(express.json());

const routes = require("./routes/routes.js");

app.use("/api", routes);



mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(()=>{
    const Port = process.env.PORT || 5000;
    app.listen(Port, (err)=>{
        if(err) throw err;
        console.log(`Server is running on port ${Port}`);
    });
}).catch( err => {
    throw err;
})