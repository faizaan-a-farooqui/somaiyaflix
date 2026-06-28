const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true,
        required: true
    },
    password: {
        type: String,
        required: true
    },
    history: [
        {
            movieId: Number,
            movieName: String,
            watchedAt: {
                type: Date,
                default: Date.now
            }
        }
    ]
});

module.exports = mongoose.model("User", userSchema);