import { db } from '../config/firebase-config.js';
import { 
  collection, 
  query,
  where,
  doc, 
  addDoc, 
  getDoc,
  getDocs, 
  updateDoc,
  deleteDoc 
} from 'firebase/firestore';

export const addAutomation = async (req, res) => {
  try {
    console.log('Received request body:', req.body); 

    const { 
      automation_title, 
      action, 
      medicine, 
      schedule_time, 
      taken_time, 
      status 
    } = req.body;

    if (!automation_title || automation_title.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Automation title cannot be empty"
      });
    }

    if (!action || action.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Action cannot be empty"
      });
    }

    if (!medicine || medicine.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Medicine cannot be empty"
      });
    }

    if (!schedule_time || schedule_time.trim() === "") {
      return res.status(400).json({
        status: "error",
        message: "Schedule time cannot be empty"
      });
    }

    // Validate status
    if (status && !['on', 'off'].includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Status must be either 'on' or 'off'"
      });
    }

    // Validate schedule_time format
    const scheduleDate = new Date(schedule_time);
    if (isNaN(scheduleDate.getTime())) {
      return res.status(400).json({
        status: "error",
        message: "Invalid schedule_time format. Please use ISO 8601 format"
      });
    }

    // Validate taken_time format if provided
    if (taken_time && taken_time !== "") {
      const takenDate = new Date(taken_time);
      if (isNaN(takenDate.getTime())) {
        return res.status(400).json({
          status: "error",
          message: "Invalid taken_time format. Please use ISO 8601 format or leave empty"
        });
      }
    }

    // Check for duplicates using Firestore query for better performance
    const q = query(
      collection(db, 'automations'),
      where('automation_title', '==', automation_title.trim()),
      where('medicine', '==', medicine.trim()),
      where('schedule_time', '==', schedule_time)
    );
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return res.status(409).json({
        status: "error",
        message: "An automation with these details already exists"
      });
    }

    // Create automation document
    await addDoc(collection(db, 'automations'), {
      automation_title: automation_title.trim(),
      action: action.trim(),
      medicine: medicine.trim(),
      schedule_time: schedule_time,
      taken_time: taken_time || "", 
      status: status || "on",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
    
    res.status(201).json({ 
      status: "success",
      message: "Automation inserted successfully!"
    });
  } catch (error) {
    console.error('Error adding automation:', error);
    res.status(500).json({ 
      status: "error",
      message: "Internal server error",
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
};

export const getAutomation = async (req, res) => {
  try {
    const querySnapshot = await getDocs(collection(db, 'automations'));
    const automations = [];
    
    querySnapshot.forEach((doc) => {
      automations.push({ id: doc.id, ...doc.data() });
    });
    
    res.status(200).json(automations);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateAutomation = async (req, res) => {
  try {
    const automationId = req.params.id;

    if (!automationId) {
      return res.status(400).json({
        status: "error",
        message: "Automation ID is required"
      });
    }

    const { status } = req.body;

    if (!status || !['on', 'off'].includes(status)) {
      return res.status(400).json({
        status: "error",
        message: "Valid status ('on' or 'off') is required"
      });
    }

    const automationRef = doc(db, 'automations', automationId);
    const automationSnap = await getDoc(automationRef);

    if (!automationSnap.exists()) {
      return res.status(404).json({
        status: "error",
        message: "Automation not found"
      });
    }

    // ✅ Update only the status and timestamp
    await updateDoc(automationRef, {
      status,
      updated_at: new Date().toISOString()
    });

    res.status(200).json({
      status: "success",
      message: `Automation status set to "${status}"`,
      data: { id: automationId, status }
    });

  } catch (error) {
    console.error('🔥 Full Error Object:', error); // <-- Log full error
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

export const deleteAutomation = async (req, res) => {
  try {
    const automationId = req.params.id;
    await deleteDoc(doc(db, 'automations', automationId));
    res.status(200).json({ message: 'Automation deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};