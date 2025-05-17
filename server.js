require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { PORT } = require('./config');

const userRoutes = require('./routes/userRoutes');
const customChatRoutes = require('./routes/customChatRoutes');
const whatsappRoutes = require('./routes/whatsappRoute');
const marketPriceRoutes = require('./routes/marketPriceRoutes');
const diseaseRoutes = require('./routes/diseaseRoutes');
const nlpRoutes = require('./routes/nlpRoutes');

const app = express();

const allowedOrigins = ['https://zp1v56uxy8rdx5ypatb0ockcb9tr6a-oci3--5173--4d9fd228.local-credentialless.webcontainer-api.io', 'https://idyllic-zuccutto-cb3669.netlify.app','http://localhost:5173'];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use('/users', userRoutes);
app.use('/custom-chat', customChatRoutes);
app.use('/whatsapp', whatsappRoutes);
app.use('/market-prices', marketPriceRoutes);
app.use('/disease', diseaseRoutes);
app.use('/nlp', nlpRoutes);

app.use((err, req, res, next) => {
    console.error('Error handling request', err);
    res.status(500).send({ error: 'Something went wrong' });
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});