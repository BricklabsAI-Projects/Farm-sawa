const diseaseService = require('../services/diseaseService');

exports.detectDisease = async (req, res) => {
    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).send({ error: 'Image is required' });
        }

        const diseaseInfo = await diseaseService.detectDisease(image);
        res.status(200).send(diseaseInfo);
    } catch (error) {
        res.status(500).send({ error: 'An error occurred while detecting the disease' });
    }
};