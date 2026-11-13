const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cookieParser = require("cookie-parser");

const mongoSanitize = require('@exortek/express-mongo-sanitize');
const helmet = require('helmet');
const { xss } = require('express-xss-sanitizer');
const hpp = require('hpp');
const cors = require('cors');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');

dotenv.config({ path: "./config/config.env" });
require('./config/checkEnv')();

connectDB();

const hotels = require("./routes/hotels");
const auth = require("./routes/auth");
const bookings = require('./routes/bookings');
const chat = require('./routes/chat');
const PORT = process.env.PORT || 8080;
const app = express();

const swaggerOptions = {
    swaggerDefinition: {
        openapi: '3.0.0',
        info: {
            title: 'Hotel Booking API',
            version: '1.0.0',
            description: 'Hotel Booking API',
        },
        servers: [
            {
                url: `http://localhost:${PORT}/api/v1`
            }
        ],
    },
    apis: ['./routes/*.js'],
};
const swaggerDocs = swaggerJsDoc(swaggerOptions);
app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerDocs));



app.set('query parser', 'extended');
// Only trust X-Forwarded-For from this many proxy hops (0 = none), so clients cannot spoof their IP for rate limiting
app.set('trust proxy', Number(process.env.TRUST_PROXY) || 0);
// 10kb JSON bodies everywhere except the chatbot, which parses its own (larger) conversation body after auth
const jsonBody = express.json({ limit: '10kb' });
app.use((req, res, next) => (req.path.startsWith('/api/v1/chat') ? next() : jsonBody(req, res, next)));
app.use(cookieParser());
// CORS first, so even error responses (e.g. a 429 from the limiter) reach the browser.
// exposedHeaders lets the frontend read Retry-After on a 429 to tell the user how long to wait.
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true, exposedHeaders: ['Retry-After', 'RateLimit-Reset'] }));

const { globalLimiter } = require('./middleware/rateLimit');
app.use(mongoSanitize());
app.use(helmet());
app.use(xss());
app.use(globalLimiter);

app.use((req, res, next) => {
    Object.defineProperty(req, 'query', { value: { ...req.query }, writable: true });
    next();
});
app.use(hpp());

app.get('/', (req, res) => {
    res.status(200).send('API is running successfully');
});

app.use('/api/v1/hotels', hotels);
app.use('/api/v1/auth', auth);
app.use('/api/v1/bookings', bookings);
app.use('/api/v1/chat', chat);





const server = app.listen(PORT, console.log(`Server running in  `, process.env.NODE_ENV, " mode on port ", PORT));

process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
})







