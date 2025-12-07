 require('dotenv').config()
const express = require('express')
const cors = require('cors')
const port = process.env.PORT || 3000

const app = express()
// middleware
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'http://localhost:5174',
      
    ],
    credentials: true,
    optionSuccessStatus: 200,
  })
)
app.use(express.json())








app.get('/', (req, res) => {
  res.send('Hello from Server..')
})

app.listen(port, () => {
  console.log(`Server is running on port ${port}`)
})