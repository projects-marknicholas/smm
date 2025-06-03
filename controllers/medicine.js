import { db } from '../config/firebase-config.js';
import { 
  doc, 
  getDoc,
  updateDoc
} from 'firebase/firestore';

export const getMedicines = async (req, res) => {
  try {
    // Reference to a specific document that contains medicine_1 and medicine_2 fields
    const docRef = doc(db, 'medicines', 'novWjoQV588azhCbLsyD');
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      return res.status(404).json({
        status: "error",
        message: "Medicine settings document not found"
      });
    }

    const data = docSnap.data();
    const medicine1 = data.medicine_1;
    const medicine2 = data.medicine_2;
    const medicine3 = data.medicine_3;

    if (medicine1 === undefined || medicine2 === undefined || medicine3 === undefined) {
      return res.status(400).json({
        status: "error",
        message: "Required medicine fields not found in document",
        missingFields: [
          ...(medicine1 === undefined ? ["medicine_1"] : []),
          ...(medicine2 === undefined ? ["medicine_2"] : []),
          ...(medicine3 === undefined ? ["medicine_3"] : [])
        ]
      });
    }

    res.status(200).json({
      status: "success",
      message: "Medicine values retrieved successfully",
      data: {
        medicine_1: medicine1,
        medicine_2: medicine2,
        medicine_3: medicine3
      }
    });

  } catch (error) {
    console.error('Error fetching medicine values:', error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      ...(process.env.NODE_ENV === 'development' && { 
        details: error.message,
        stack: error.stack
      })
    });
  }
};

export const updateMedicines = async (req, res) => {
  try {
    const { medicine_1: addMedicine1, medicine_2: addMedicine2, medicine_3: addMedicine3 } = req.body;
    const docRef = doc(db, 'medicines', 'novWjoQV588azhCbLsyD');
    const MAX_CAPACITY = 10;

    // Get current values first
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return res.status(404).json({
        status: "error",
        message: "Medicine settings not found"
      });
    }

    const currentData = docSnap.data();
    const currentMedicine1 = currentData.medicine_1 || 0;
    const currentMedicine2 = currentData.medicine_2 || 0;
    const currentMedicine3 = currentData.medicine_3 || 0;

    // Calculate new totals
    const newMedicine1 = currentMedicine1 + (addMedicine1 || 0);
    const newMedicine2 = currentMedicine2 + (addMedicine2 || 0);
    const newMedicine3 = currentMedicine3 + (addMedicine3 || 0);

    // Validate medicine_1 doesn't exceed maximum capacity
    if (newMedicine1 > MAX_CAPACITY) {
      return res.status(400).json({
        status: "error",
        message: `Cannot add ${addMedicine1} to Medicine 1 (current: ${currentMedicine1}) - would exceed ${MAX_CAPACITY}`,
        current: currentMedicine1,
        attempted_add: addMedicine1,
        would_be: newMedicine1,
        max_allowed: MAX_CAPACITY
      });
    }

    // Validate medicine_2 doesn't exceed maximum capacity
    if (newMedicine2 > MAX_CAPACITY) {
      return res.status(400).json({
        status: "error",
        message: `Cannot add ${addMedicine2} to Medicine 2 (current: ${currentMedicine2}) - would exceed ${MAX_CAPACITY}`,
        current: currentMedicine2,
        attempted_add: addMedicine2,
        would_be: newMedicine2,
        max_allowed: MAX_CAPACITY
      });
    }

    // Validate medicine_3 doesn't exceed maximum capacity
    if (newMedicine3 > MAX_CAPACITY) {
      return res.status(400).json({
        status: "error",
        message: `Cannot add ${addMedicine3} to Medicine 3 (current: ${currentMedicine3}) - would exceed ${MAX_CAPACITY}`,
        current: currentMedicine3,
        attempted_add: addMedicine3,
        would_be: newMedicine3,
        max_allowed: MAX_CAPACITY
      });
    }

    // Update the document with new summed values
    await updateDoc(docRef, {
      medicine_1: newMedicine1,
      medicine_2: newMedicine2,
      medicine_3: newMedicine3,
      lastUpdated: new Date()
    });

    res.status(200).json({
      status: "success",
      message: "Medicines added successfully",
      data: {
        previous: {
          medicine_1: currentMedicine1,
          medicine_2: currentMedicine2,
          medicine_3: currentMedicine3
        },
        added: {
          medicine_1: addMedicine1 || 0,
          medicine_2: addMedicine2 || 0,
          medicine_3: addMedicine3 || 0
        },
        new_total: {
          medicine_1: newMedicine1,
          medicine_2: newMedicine2,
          medicine_3: newMedicine3
        },
        remaining_capacity: {
          medicine_1: MAX_CAPACITY - newMedicine1,
          medicine_2: MAX_CAPACITY - newMedicine2,
          medicine_3: MAX_CAPACITY - newMedicine3
        }
      }
    });

  } catch (error) {
    console.error('Error updating medicines:', error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      ...(process.env.NODE_ENV === 'development' && {
        details: error.message
      })
    });
  }
};