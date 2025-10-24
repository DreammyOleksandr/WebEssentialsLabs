require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const path = require('path')
const Document = require('./models/Document')

const app = express()
const PORT = process.env.PORT
const MONGODB_URI = process.env.MONGODB_URI

app.use(express.json())
app.use(express.static(path.join(__dirname, 'public')))

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('Підключено до MongoDB')
    seedDatabase()
  })
  .catch((err) => {
    console.error('Помилка підключення до MongoDB:', err)
    process.exit(1)
  })

async function seedDatabase() {
  try {
    const count = await Document.countDocuments()
    if (count === 0) {
      await Document.insertMany([
        {
          executor: 'Іванов Іван Іванович',
          document: 'Договір оренди приміщення №125',
          dateGiven: new Date('2024-10-20'),
          dateReturned: null,
        },
        {
          executor: 'Петрова Марія Олексіївна',
          document: 'Технічна документація проекту А-15',
          dateGiven: new Date('2024-10-18'),
          dateReturned: new Date('2024-10-22'),
        },
      ])
      console.log('Тестові дані додано до бази')
    }
  } catch (error) {
    console.error('Помилка заповнення бази даних:', error)
  }
}

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'))
})

app.get('/api/documents', async (req, res) => {
  try {
    const documents = await Document.find().sort({ dateGiven: -1 })
    res.json(documents)
  } catch (error) {
    console.error('Error fetching documents:', error)
    res.status(500).json({ error: 'Помилка читання документів' })
  }
})

app.post('/api/documents', async (req, res) => {
  try {
    const { executor, document, dateGiven, dateReturned } = req.body

    const newDocument = new Document({
      executor,
      document,
      dateGiven: new Date(dateGiven),
      dateReturned: dateReturned ? new Date(dateReturned) : null,
    })

    const savedDocument = await newDocument.save()
    res.status(201).json(savedDocument)
  } catch (error) {
    console.error('Error creating document:', error)

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err) => err.message)
      return res.status(400).json({ error: validationErrors.join(', ') })
    }

    res.status(500).json({ error: 'Помилка створення документа' })
  }
})

app.put('/api/documents/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { executor, document, dateGiven, dateReturned } = req.body

    const updateData = {
      executor,
      document,
      dateGiven: new Date(dateGiven),
      dateReturned: dateReturned ? new Date(dateReturned) : null,
    }

    const updatedDocument = await Document.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })

    if (!updatedDocument) {
      return res.status(404).json({ error: 'Документ не знайдено' })
    }

    res.json(updatedDocument)
  } catch (error) {
    console.error('Error updating document:', error)

    if (error.name === 'ValidationError') {
      const validationErrors = Object.values(error.errors).map((err) => err.message)
      return res.status(400).json({ error: validationErrors.join(', ') })
    }

    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Невірний формат ID документа' })
    }

    res.status(500).json({ error: 'Помилка оновлення документа' })
  }
})

app.delete('/api/documents/:id', async (req, res) => {
  try {
    const { id } = req.params

    const deletedDocument = await Document.findByIdAndDelete(id)

    if (!deletedDocument) {
      return res.status(404).json({ error: 'Документ не знайдено' })
    }

    res.json({ message: 'Документ успішно видалено' })
  } catch (error) {
    console.error('Error deleting document:', error)

    if (error.name === 'CastError') {
      return res.status(400).json({ error: 'Невірний формат ID документа' })
    }

    res.status(500).json({ error: 'Помилка видалення документа' })
  }
})

app.listen(PORT, () => {
  console.log(`Сервер запущено на порті ${PORT}`)
  console.log(`Відкрийте http://localhost:${PORT} у браузері`)
})
