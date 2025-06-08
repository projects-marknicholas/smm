import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';

// Routes
import automationRoutes from './routes/automation.js';
import iotRoutes from './routes/iot.js';
import medicineRoutes from './routes/medicine.js';

const app = express();
const PORT = process.env.PORT || 5000;

// CORS Configuration
const corsOptions = {
  origin: [
    'https://smart-medicine-monitoring.netlify.app',
    'http://localhost:3000'
  ],
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true,
  optionsSuccessStatus: 204
};

// Middleware
app.use(cors(corsOptions));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Routes
app.use('/api/v1/automation', automationRoutes);
app.use('/api/v1/iot', iotRoutes);
app.use('/api/v1/medicine', medicineRoutes);

// Health check route
app.get('/', (req, res) => {
  res.send('Smart Medicine Monitoring Backend is running!');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

export default app;
