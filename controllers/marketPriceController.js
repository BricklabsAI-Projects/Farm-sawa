const marketPriceService = require('../services/marketPriceService');

exports.getMarketPrice = async (req, res) => {
    try {
        const { crop, location } = req.query;

        if (!crop || !location) {
            return res.status(400).send({ error: 'Crop and location are required' });
        }

        const marketPrice = await marketPriceService.getMarketPrice(crop, location);
        res.status(200).send(marketPrice);
    } catch (error) {
        res.status(500).send({ error: 'An error occurred while fetching the market price' });
    }
};