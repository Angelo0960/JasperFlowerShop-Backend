import express from "express";
import cors from "cors";
import 'dotenv/config.js';
import SalesRouter from "./routers/SalesRouter.js";
import orderRouter from "./routers/OrderRouter.js";
import productRouter from "./routers/ProductRouter.js"; 
import reportRouter from './routers/ReportRouter.js';

const app = express();
app.use(express.json());
app.use(cors());

app.use("/sales", SalesRouter);
app.use("/orders", orderRouter);
app.use("/products", productRouter); 
app.use('/api/reports', reportRouter);



try {
    app.listen(process.env.PORT || 3000, () => {
        console.log(`Server running on port ${process.env.PORT || 3000}...`);
    });
} catch (e) {
    console.error('Error starting the server:', e);
}
