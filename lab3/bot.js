import dotenv from 'dotenv'
import ModelClient, { isUnexpected } from '@azure-rest/ai-inference'
import { AzureKeyCredential } from '@azure/core-auth'
import TelegramBot from 'node-telegram-bot-api'
import express from 'express'

dotenv.config()

const token = process.env.BOT_TOKEN
const gpt_token = process.env.GPT_API_KEY
const endpoint = 'https://models.github.ai/inference'
const model = 'openai/gpt-4.1'

if (!gpt_token) {
  console.error('GPT_API_KEY не знайдено в .env файлі!')
  process.exit(1)
}

const client = ModelClient(endpoint, new AzureKeyCredential(gpt_token))

if (!token) {
  console.error('BOT_TOKEN не знайдено в .env файлі!')
  process.exit(1)
}

const bot = new TelegramBot(token, { polling: true })

const userStates = new Map()

const mainMenuKeyboard = {
  reply_markup: {
    keyboard: [
      [{ text: '📚 Студент' }, { text: '💻 IT-технології' }],
      [{ text: '📞 Контакти' }, { text: '🤖 Запит до GPT' }],
    ],
    resize_keyboard: true,
    one_time_keyboard: false,
  },
}

const backKeyboard = {
  reply_markup: {
    keyboard: [[{ text: '🔙 Назад до меню' }]],
    resize_keyboard: true,
    one_time_keyboard: false,
  },
}

bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id
  const welcomeMessage = `Привіт, ${msg.from.first_name}! 👋

Це простий телеграм-бот з меню для лабораторної роботи №3.

Виберіть розділ з меню нижче:`

  bot.sendMessage(chatId, welcomeMessage, mainMenuKeyboard)
})

bot.on('message', (msg) => {
  const chatId = msg.chat.id
  const text = msg.text

  if (text === '/start') return

  switch (text) {
    case '📚 Студент':
      handleStudentSection(chatId)
      break
    case '💻 IT-технології':
      handleTechSection(chatId)
      break
    case '📞 Контакти':
      handleContactsSection(chatId)
      break
    case '🤖 Запит до GPT':
      handlePromptSection(chatId)
      break
    case '🔙 Назад до меню':
      userStates.delete(chatId)
      bot.sendMessage(chatId, 'Головне меню:', mainMenuKeyboard)
      break
    default:
      if (userStates.get(chatId) === 'prompt_mode') {
        handleGPTMessage(chatId, text)
      } else {
        bot.sendMessage(chatId, 'Будь ласка, виберіть опцію з меню 👇', mainMenuKeyboard)
      }
  }
})

function handleStudentSection(chatId) {
  const studentInfo = `
    📝 Прізвище: Бондаренко Олександр
    🎓 Група: ІМ-22
    📚 Предмет: Основи WEB-програмування
    🔬 Лабораторна робота: №3 - Telegram Bot`

  bot.sendMessage(chatId, studentInfo, backKeyboard)
}

function handleTechSection(chatId) {
  const techInfo = `💻 IT-технології`
  bot.sendMessage(chatId, techInfo, backKeyboard)
}

function handleContactsSection(chatId) {
  const contactInfo = `📞 Контактна інформація
    📱 Телефон: +380123456789
    📧 Email: bondarenko@example.com
`

  bot.sendMessage(chatId, contactInfo, backKeyboard)
}

function handlePromptSection(chatId) {
  userStates.set(chatId, 'prompt_mode')
  const promptInfo = `🤖 Ви увійшли в режим GPT чату!

Тепер надсилайте свої запитання, і я буду відповідати через GPT.

Щоб вийти з режиму чату, натисніть "🔙 Назад до меню"`

  bot.sendMessage(chatId, promptInfo, backKeyboard)
}

async function handleGPTMessage(chatId, message) {
  try {
    bot.sendMessage(chatId, '🤔 Обробляю ваш запит...')

    const response = await client.path('/chat/completions').post({
      body: {
        messages: [{ role: 'user', content: message }],
        model: model,
        temperature: 1,
        top_p: 1,
      },
    })

    const reply = response.body.choices[0].message.content
    bot.sendMessage(chatId, reply, backKeyboard)
  } catch (error) {
    console.error('GPT API Error:', error)
    bot.sendMessage(chatId, '❌ Виникла помилка при обробці запиту. Спробуйте ще раз.', backKeyboard)
  }
}

bot.on('polling_error', (error) => {
  console.log('Polling error:', error)
})

console.log('🤖 Бот запущено! Очікування повідомлень...')
console.log('📋 Доступні команди: /start')

// Express server for Render port binding
const app = express()
const PORT = process.env.PORT || 3000

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'Bot is running!', 
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  })
})

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', bot: 'running' })
})

// Start the server
app.listen(PORT, () => {
  console.log(`🌐 Server running on port ${PORT}`)
})
