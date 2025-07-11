const mongoose = require('mongoose');
const { GROUP_STATUS, FREQUENCY_TYPE, getGroupStatusValues, getFrequencyTypeValues } = require('../enums');

const groupSchema = new mongoose.Schema({
  groupId: { 
    type: String, 
    required: true, 
    unique: true,
    index: true 
  },
  groupName: { 
    type: String, 
    required: true,
    maxlength: 100,
    trim: true
  },
  description: { 
    type: String,
    maxlength: 500,
    trim: true
  },
  treasurerId: { 
    type: String,
    required: true,
    index: true 
  },
  status: { 
    type: String, 
    enum: getGroupStatusValues(), 
    default: GROUP_STATUS.PENDING_ACTIVATION,
    index: true 
  },
  contributionAmount: { 
    type: Number, 
    required: true,
    min: [1000, 'Minimum contribution is 1000 NGN']
  },
  contributionFrequency: { 
    type: String, 
    enum: getFrequencyTypeValues(), 
    required: true 
  },
  requiredMembers: { 
    type: Number, 
    required: true,
    min: [2, 'Minimum 2 members required'],
    max: [50, 'Maximum 50 members allowed']
  },
  currentMembers: { 
    type: Number, 
    default: 1
  },
  maxMembers: { 
    type: Number, 
    required: true,
    min: [2, 'Minimum 2 members allowed'],
    max: [50, 'Maximum 50 members allowed']
  },
  currentCycle: { 
    type: Number, 
    default: 1
  },
  currentTurn: { 
    type: Number, 
    default: 1
  },
  totalContributions: { 
    type: Number, 
    default: 0
  },
  totalPayouts: { 
    type: Number, 
    default: 0
  },
  createdAt: { 
    type: Date, 
    default: Date.now 
  },
  updatedAt: { 
    type: Date, 
    default: Date.now 
  }
});


groupSchema.pre('save', function(next) {
  if (this.maxMembers < this.requiredMembers) {
    return next(new Error('Max members cannot be less than required members'));
  }
  
  this.updatedAt = new Date();
  next();
});

module.exports = mongoose.model('Group', groupSchema)