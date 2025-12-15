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
