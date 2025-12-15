import express from 'express';
import {
  generateSalesReport,
  getSavedReports,
  getReportById,
  deleteReport,
  generateCustomReport,
  exportReportAsCSV
} from '../controllers/ReportController.js';

const router = express.Router();

router.get('/sales', generateSalesReport);
router.post('/custom', generateCustomReport);
router.get('/', getSavedReports);
router.get('/:id', getReportById);
router.delete('/:id', deleteReport);
router.get('/:id/export', exportReportAsCSV); 

export default router;