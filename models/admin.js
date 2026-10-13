const moonoose = require('mongoose');
const AdminSchema = new moonoose.Schema({
 
  email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role:{
      type:String,default:"Admin"
    }

}, { timestamps: true });

module.exports = moonoose.model('Admin', AdminSchema);