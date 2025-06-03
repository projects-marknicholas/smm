import express from 'express';
import { 
  addAutomation, 
  getAutomation, 
  updateAutomation,
  deleteAutomation
} from '../controllers/automation.js';

const router = express.Router();

router.post('/', addAutomation);
router.get('/', getAutomation);
router.put('/:id', updateAutomation);
router.delete('/:id', deleteAutomation);

export default router;