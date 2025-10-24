const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema({
    executor: {
        type: String,
        required: [true, 'Виконавець є обов\'язковим полем'],
        trim: true,
        minlength: [5, 'Ім\'я виконавця повинно містити мінімум 5 символів'],
        maxlength: [100, 'Ім\'я виконавця не може перевищувати 100 символів']
    },
    document: {
        type: String,
        required: [true, 'Назва документа є обов\'язковим полем'],
        trim: true,
        minlength: [5, 'Назва документа повинна містити мінімум 5 символів'],
        maxlength: [200, 'Назва документа не може перевищувати 200 символів']
    },
    dateGiven: {
        type: Date,
        required: [true, 'Дата передачі є обов\'язковим полем'],
        validate: {
            validator: function(date) {
                return date <= new Date();
            },
            message: 'Дата передачі не може бути в майбутньому'
        }
    },
    dateReturned: {
        type: Date,
        default: null,
        validate: {
            validator: function(date) {
                if (date && this.dateGiven) {
                    return date >= this.dateGiven;
                }
                return true;
            },
            message: 'Дата повернення не може бути раніше дати передачі'
        }
    }
}, {
    timestamps: true
});

// Віртуальне поле для статусу
documentSchema.virtual('status').get(function() {
    return this.dateReturned ? 'returned' : 'active';
});

// Включити віртуальні поля в JSON
documentSchema.set('toJSON', { virtuals: true });

// Індекси для оптимізації пошуку
documentSchema.index({ executor: 1 });
documentSchema.index({ dateGiven: -1 });
documentSchema.index({ dateReturned: 1 });

module.exports = mongoose.model('Document', documentSchema);