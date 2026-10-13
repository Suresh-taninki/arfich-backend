const mongoose = require('mongoose');

const connectDB = async () => {
  try {

     const conn = await mongoose.connect("mongodb+srv://hloxpat-admin:ehw8tmhwxCZmRqPU@hloxpat.sa5jj4x.mongodb.net/hloxpat-dev?appName=hloxpat", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

  


    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

module.exports = connectDB;
