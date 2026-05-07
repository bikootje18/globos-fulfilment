import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import ordersRouter from './routes/orders.js'
import productsRouter from './routes/products.js'
import scansRouter from './routes/scans.js'
import authRouter from './routes/auth.js'
import uploadRouter from './routes/upload.js'
import managerRouter from './routes/manager.js'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

app.get('/health', (req, res) => res.json({ status: 'ok' }))

app.use('/api/orders', ordersRouter)
app.use('/api/products', productsRouter)
app.use('/api/scans', scansRouter)
app.use('/api/auth', authRouter)
app.use('/api/upload', uploadRouter)
app.use('/api/manager', managerRouter)

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`)
})
