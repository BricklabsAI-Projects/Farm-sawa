const supplierService = require('../services/supplierService');

exports.getSuppliers = async (req, res) => {
    try {
        const { product, location } = req.query;
        if (!product || !location) {
            return res.status(400).json({ message: 'Product and location are required' });
        }

        const suppliers = await supplierService.getSuppliersByProductAndLocation(product, location);
        res.status(200).json(suppliers);
    } catch (error) {
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};