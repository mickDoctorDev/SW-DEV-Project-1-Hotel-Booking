const express = require("express");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const cookieParser = require("cookie-parser");

const mongoSanitize = require('@exortek/express-mongo-sanitize');
const helmet = require('helmet');
const { xss } = require('express-xss-sanitizer');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cors = require('cors');
const swaggerJsDoc = require('swagger-jsdoc');
const swaggerUI = require('swagger-ui-express');

dotenv.config({ path: "./config/config.env" });

connectDB();

const hotels = require("./routes/hotels");
const auth = require("./routes/auth");
const bookings = require('./routes/bookings');
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
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

const limiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 100

});
app.use(mongoSanitize());
app.use(helmet());
app.use(xss());
app.use(limiter);

app.use((req, res, next) => {
    Object.defineProperty(req, 'query', { value: { ...req.query }, writable: true });
    next();
});
app.use(hpp());
app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173', credentials: true }));

app.get('/', (req, res) => {
    res.status(200).send('API is running successfully');
});

app.use('/api/v1/hotels', hotels);
app.use('/api/v1/auth', auth);
app.use('/api/v1/bookings', bookings);





const server = app.listen(PORT, console.log(`Server running in  `, process.env.NODE_ENV, " mode on port ", PORT));

process.on('unhandledRejection', (err, promise) => {
    console.log(`Error: ${err.message}`);
    server.close(() => process.exit(1));
})







