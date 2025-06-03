import express from 'express';
import { 
  getMedicines,
  updateMedicines
} from '../controllers/medicine.js';

const router = express.Router();

router.get('/', getMedicines);
router.put('/', updateMedicines);

export default router;