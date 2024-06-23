const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
    categoryName: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    }
}, {
    timestamps: true // Correct placement of timestamps option
});

const Category = mongoose.model('Category', categorySchema);

module.exports = Category;
