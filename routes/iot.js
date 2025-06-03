import express from 'express';
import { 
  addHistory,
  getHistory,
  deviceHandler,
  updateTakenStatus
} from '../controllers/iot.js';

const router = express.Router();

router.post('/', addHistory);
router.get('/', getHistory);
router.get('/handler', deviceHandler);
router.put('/handler', updateTakenStatus);

export default router;