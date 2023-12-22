const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Types.ObjectId,
    ref: 'User',
    required: true
  },
  delivery_address:{
    type:Object,
    required:true
  },
  payment: {
    type: String,
    required: true,
    method: ['Cash on delivery', 'Razorpay']
  },
  products: [{
      productId: {
        type: mongoose.Types.ObjectId,
        ref: 'Product',
        required: true
      },
      quantity: {
        type: Number,
        required: true
      },
      price: {
        type: Number,
        required: true
      },
      totalPrice: {
      type: Number,
      default: 0
    }
  }],
  subtotal: {
    type: Number,
    required:true
  },
  status: {
    type: String,
    default: 'Attempted',
    status: ['Attempted', 'Success', 'Cancel', 'Failed']
  },
  isOrder: {
    type: Boolean,
    default: true
  },
  orderDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  cancelReason: {
    type: String
  }
})

const Order = mongoose.model('Orders', orderSchema)
module.exports =Order