import express from 'express';
  
  const app = express();
  app.use(express.json());
  
  try {
    app.listen(process.env.PORT || 3000, () => {
      console.log(`Listening to port ${process.env.PORT || 3000}...`);
    });
  } catch(e){
    console.error('Error starting the server:', e);
  }