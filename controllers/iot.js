import { db } from '../config/firebase-config.js';
import { 
  collection,
  query,
  where,
  getDocs,
  doc,
  orderBy,
  limit,
  updateDoc,
  addDoc,
  deleteDoc,
  increment,
  writeBatch
} from 'firebase/firestore';

export const addHistory = async (req, res) => {
  try {
    const { history_title, action, medicine, scheduled_time, taken_time } = req.body;

    // Validate required fields
    if (!medicine || !scheduled_time) {
      return res.status(400).json({
        status: "error",
        message: "Medicine and scheduled_time are required"
      });
    }

    // Validate scheduled_time ISO format
    const scheduleDate = new Date(scheduled_time);
    if (isNaN(scheduleDate.getTime())) {
      return res.status(400).json({
        status: "error",
        message: "Invalid scheduled_time format. Please use ISO 8601."
      });
    }

    let status = 'on process';

    if (taken_time) {
      const takenDate = new Date(taken_time);
      if (isNaN(takenDate.getTime())) {
        return res.status(400).json({
          status: "error",
          message: "Invalid taken_time format. Please use ISO 8601."
        });
      }

      // Calculate time difference in minutes
      const diffInMs = takenDate - scheduleDate;
      const diffInMinutes = Math.abs(diffInMs / 60000);

      if (diffInMs <= 0) {
        status = 'taken on time';
      } else if (diffInMinutes <= 5) {
        status = 'taken on time';
      } else {
        status = 'taken late';
      }
    }

    // Get current Manila time in ISO format for created_at
    const manilaTimeStr = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
    const createdAt = new Date(manilaTimeStr).toISOString();

    // Insert into Firestore
    await addDoc(collection(db, 'history'), {
      history_title: history_title || null,
      action: action || null,
      medicine,
      scheduled_time,
      taken_time: taken_time || null,
      status,
      created_at: createdAt
    });

    res.status(201).json({
      status: "success",
      message: "History record created!"
    });

  } catch (error) {
    console.error('🔥 Error inserting history:', error);
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

export const getHistory = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;

    // Convert to numbers
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    if (isNaN(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        status: "error",
        message: "Invalid page number"
      });
    }

    if (isNaN(limitNumber) || limitNumber < 1) {
      return res.status(400).json({
        status: "error",
        message: "Invalid limit value"
      });
    }

    // Get full list of history
    const historyCollection = collection(db, 'history');
    const historySnapshot = await getDocs(historyCollection);
    const historyList = [];

    historySnapshot.forEach((doc) => {
      historyList.push({ id: doc.id, ...doc.data() });
    });

    // Sort by created_at descending (latest first)
    const sortedHistory = historyList.sort((a, b) => {
      const dateA = new Date(a.created_at);
      const dateB = new Date(b.created_at);
      return dateB - dateA;
    });

    // Pagination logic
    const total = sortedHistory.length;
    const startIndex = (pageNumber - 1) * limitNumber;
    const paginatedHistory = sortedHistory.slice(startIndex, startIndex + limitNumber);

    res.status(200).json({
      status: "success",
      message: "History fetched successfully",
      data: paginatedHistory,
      pagination: {
        total,
        page: pageNumber,
        limit: limitNumber,
        total_pages: Math.ceil(total / limitNumber),
        has_next: startIndex + limitNumber < total,
        has_prev: pageNumber > 1
      }
    });

  } catch (error) {
    console.error('🔥 Error fetching history:', error);
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

export const deviceHandler = async (req, res) => {
  try {
    // Get current time in Asia/Manila timezone
    const manilaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
    const currentTime = new Date(manilaTime);
    const currentISOTime = currentTime.toISOString();
    
    console.log('⏰ Current Manila time:', currentTime.toString());

    // Get all active automations
    const automationsQuery = query(
      collection(db, 'automations'),
      where('status', '==', 'on')
    );
    const automationsSnapshot = await getDocs(automationsQuery);
    
    if (automationsSnapshot.empty) {
      return res.status(200).json({
        status: "success",
        message: "No active automations found",
        triggered: false
      });
    }
    
    // Process each automation
    const promises = [];
    const triggeredAutomations = [];
    
    automationsSnapshot.forEach((automationDoc) => {
      const automation = { id: automationDoc.id, ...automationDoc.data() };
      const scheduledTime = new Date(automation.schedule_time);
      
      // Convert scheduled time to Manila timezone
      const scheduledManilaTime = new Date(scheduledTime.toLocaleString("en-US", { timeZone: "Asia/Manila" }));
      
      // Check if current Manila date matches scheduled Manila date
      const isSameDay = currentTime.getDate() === scheduledManilaTime.getDate() &&
                       currentTime.getMonth() === scheduledManilaTime.getMonth() &&
                       currentTime.getFullYear() === scheduledManilaTime.getFullYear();
      
      if (!isSameDay) return;

      // STRICT TIME MATCHING (no window)
      const isSameHour = currentTime.getHours() === scheduledManilaTime.getHours();
      const isSameMinute = currentTime.getMinutes() === scheduledManilaTime.getMinutes();
      
      if (isSameHour && isSameMinute) {
        triggeredAutomations.push(automation);
        
        // Update medicine count
        const medicineField = automation.medicine;
        const medicineRef = doc(db, 'medicines', 'novWjoQV588azhCbLsyD');
        
        promises.push(
          updateDoc(medicineRef, {
            [medicineField]: increment(-1),
            lastUpdated: currentISOTime
          })
        );
        
        // Insert history record
        const historyData = {
          history_title: automation.automation_title || null,
          action: automation.action || null,
          medicine: automation.medicine,
          scheduled_time: automation.schedule_time,
          taken_time: "",
          status: "pending",
          created_at: currentISOTime
        };
        
        promises.push(addDoc(collection(db, 'history'), historyData));
        
        // Update automation
        promises.push(
          deleteDoc(doc(db, 'automations', automation.id))
        );
      }
    });
    
    await Promise.all(promises);
    
    if (triggeredAutomations.length > 0) {
      return res.status(200).json({
        status: "success",
        message: `${triggeredAutomations.length} automation(s) triggered`,
        triggered: true,
        automations: triggeredAutomations
      });
    } else {
      return res.status(200).json({
        status: "success",
        message: "No automations matched current time",
        triggered: false
      });
    }
    
  } catch (error) {
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      details: error.message
    });
  }
};

export const updateTakenStatus = async (req, res) => {
  try {
    // Get current Manila time
    const manilaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
    const currentTime = new Date(manilaTime);
    const currentISOTime = currentTime.toISOString();

    // 1. Find the most recent pending history record (taken_time == "")
    const historyQuery = query(
      collection(db, 'history'),
      where('taken_time', '==', ''),
      orderBy('created_at', 'desc'),
      limit(1)
    );

    const historySnapshot = await getDocs(historyQuery);

    if (historySnapshot.empty) {
      return res.status(200).json({
        status: "success",
        message: "No pending history records found",
        updated: false
      });
    }

    const historyDoc = historySnapshot.docs[0];
    const history = historyDoc.data();
    const historyId = historyDoc.id;

    // 2. Calculate status based on scheduled time (from history)
    const scheduledTime = new Date(history.scheduled_time);
    const timeDiff = currentTime - scheduledTime;
    const timeDiffMinutes = timeDiff / (1000 * 60);
    const timeDiffHours = timeDiffMinutes / 60;

    let status;
    if (timeDiffMinutes <= 0) {
      // Taken early or exactly on time
      status = "on_time";
    } else if (timeDiffMinutes <= 5) {
      // Taken within 5 minutes after scheduled time = on time
      status = "on_time";
    } else if (timeDiffMinutes <= 10) {
      // Taken late, but less than or equal to 10 mins late
      status = "late";
    } else if (timeDiffHours <= 24) {
      status = "missed";
    } else {
      status = "expired";
    }

    // 3. Prepare updates
    const updates = {
      taken_time: currentISOTime,
      status: status,
      updated_at: currentISOTime
    };

    // 4. Update ONLY the history document
    await updateDoc(doc(db, 'history', historyId), updates);

    return res.status(200).json({
      status: "success",
      message: "Medication intake recorded successfully",
      updated: true,
      data: {
        history_id: historyId,
        scheduled_time: history.scheduled_time,
        taken_time: currentISOTime,
        status: status,
        time_difference_minutes: timeDiffMinutes.toFixed(2)
      }
    });

  } catch (error) {
    console.error('🔥 ERROR:', error);
    return res.status(500).json({
      status: "error",
      message: "Failed to update records",
      details: error.message
    });
  }
};

export const instantMedicine = async (req, res) => {
  try {
    const { medicine } = req.body;

    // Validate medicine parameter
    const allowedMedicines = ['medicine_1', 'medicine_2', 'medicine_3'];
    if (!medicine || !allowedMedicines.includes(medicine.trim())) {
      return res.status(400).json({
        status: "error",
        message: `Medicine must be one of: ${allowedMedicines.join(', ')}`
      });
    }

    // Get current Manila time ISO string
    const manilaTime = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });
    const currentTime = new Date(manilaTime);
    const currentISOTime = currentTime.toISOString();

    // Prepare automation data
    const automationData = {
      automation_title: "Instant Medicine",
      action: "Take medicine",   
      medicine: medicine.trim(),
      schedule_time: currentISOTime,
      taken_time: "",
      status: "on",
      created_at: currentISOTime,
      updated_at: currentISOTime
    };

    // Insert automation document
    await addDoc(collection(db, 'automations'), automationData);

    res.status(201).json({
      status: "success",
      message: "Instant medicine automation added successfully!",
      data: automationData
    });
  } catch (error) {
    console.error('Error inserting instant medicine automation:', error);
    res.status(500).json({
      status: "error",
      message: "Internal server error",
      ...(process.env.NODE_ENV === 'development' && { details: error.message })
    });
  }
};
