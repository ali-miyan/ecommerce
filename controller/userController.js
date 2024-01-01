const express = require('express');
const mongoose = require('mongoose');
const config = require('../config/config');
const bcrypt = require('bcrypt');
const nodemailer = require('nodemailer');
const session = require('express-session');
const auth = require('../middleware/auth');
const userController=require('../controller/userController')
const userVerification=require('../models/userOTP');
const User = require('../models/userModel');
const userOTP = require('../models/userOTP');
const dotenv = require('dotenv')
dotenv.config()
config.connectDB();
const Product=require("../models/productModel");
const addressModel = require('../models/addressModel');
const orderModel = require('../models/orderModal');


//route to home page
const loadHome=async(req,res)=>{
    try {
        res.render('home')

    } catch (error) {
        console.log(error);
    }
}

//shop page
const loadShop=async(req,res)=>{
    try {
        const product=await Product.find({})
        res.render('shop',{product:product})
    } catch (error) {
        console.log(error);
    }
}

//signup page
const loadSignup=async(req,res)=>{
    try {
        res.render('signup')
    } catch (error) {
        console.log(error);
    }
}
//profile page
const loadProfile = async (req, res) => {
    try {
        if (req.session.user_id) {
            console.log("profile session" + req.session.user_id);
            const user = await User.findOne({ _id: req.session.user_id });
            const address = await addressModel.findOne({ user: req.session.user_id });
            const order = await orderModel.find({ user: req.session.user_id })
            .populate('products.productId')
        
            res.render('profile', { user, address, order });
        } else {
            res.redirect('/login');
        }
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};


//login page
const loadLogin=async(req,res)=>{
    try {
        const loginmessage=req.query.loginmessage
        res.render('login',{loginmessage})
    } catch (error) {
        console.log(error);
    }
}

//signup and storing data to database
const signupPost = async (req, res) => {
    try {
        let { name, email,mobile,password } = req.body;
            const userExists = await User.findOne({ email });

            if (userExists) {
                res.render('signup', { message: 'User with provided email already exists' });
                console.log(userExists);
            } else {
                const hashedPassword = await securePassword(password);
                const newUser = new User({
                    name: req.body.name,
                    email: req.body.email,
                    mobile: req.body.mobile,
                    password: hashedPassword,
                    verified: false,
                    isAdmin:0
                });

                const result = await newUser.save();
                console.log(result);
                sendOTPverification(result, res);
            }
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};


//rendering otp page
const verifyOTP=async (req, res) => {
    try {
        req.session.user_id = req.query.id; 
        console.log("Session ID set:", req.session.user_id);   
        console.log("Session ID set:", req.query.id);
        res.render('otp');
    } catch (error) {
        console.log("Error setting session:", error.message);
    }
};

//verifying otp
const verifyPost=async(req,res)=>{
    try {
      const otp= req.body.otp
      const userId=req.session.user_id
      console.log("Session ID:", userId);
        
            const userOTPVerificationrecord=await userVerification.find({user_id:userId})
            console.log(userOTPVerificationrecord);            

            if (userOTPVerificationrecord.length==0) {
                res.render('otp',{message:"record doesn't exist or has been verified already"})
            }else{
                const {expiresAt}=userOTPVerificationrecord[0];
                const hashedOTP=userOTPVerificationrecord[0].otp;

                if(expiresAt<Date.now()){
                    await userOTPVerificationrecord.deleteMany({userId});
                    res.render('otp',{message:"your otp has been expired"})                    
                }else{
                    const validOTP=await bcrypt.compare(otp,hashedOTP);
                    if(!validOTP){
                        res.render('otp',{message:"Invalid code"})
                    }else{
                       await User.updateOne({_id:userId},{verfied:true});
                       await userVerification.deleteMany({userId});

                    res.redirect(`/`)
                    }
                }
            }
        
    } catch (error) {
        console.log(error.message);
    }
}


//hashing password
const securePassword=async(password)=>{
    try {
        const hashedPassword=bcrypt.hash(password,10)
        return hashedPassword;
    } catch (error) {
        console.log(error.message);
    }
}

//sending otp
const sendOTPverification=async({_id,email},res)=>{
    try {
        const otp=`${Math.floor(1000+Math.random()*900)}`
        const mailOption={
            from:process.env.user_email,
            to:email,
            subject:"Verify Your Email",
            html:`<p>Enter ${otp} to verify your email Address
            this code will expires in 1 hour`
        }

        //hashing the otp
    const hashedOTP=await bcrypt.hash(otp,10);
    
    const newOTP = await new userOTP({
        user_id:_id,
        otp:hashedOTP,
        createAt:Date.now(),
        expiresAt:Date.now()+36000,
    })

    //save otp records
    await newOTP.save();
    await transporter.sendMail(mailOption);
    res.redirect(`/verifyOTP?id=${_id}`);
    
    } catch (error) {
        throw new Error;
    }
}

//node mailer
let transporter=nodemailer.createTransport({
    host:"smtp.gmail.com",
    auth:{
        user:process.env.user_email,
        pass:process.env.user_password
    }
})


//login the user
let loginPost=async(req,res)=>{
    try {
        const email=req.body.email;
        const password=req.body.password;
    
        const validUser=await User.findOne({email:email})
        console.log(validUser);
        if(validUser){
            const passwordMatch=await bcrypt.compare(password,validUser.password)
            if(passwordMatch){
                req.session.user_id=validUser._id;
                res.redirect('/')
            }else{
                res.render('login',{message:'incorrect password'})
            }
        }else{
            res.render('login',{message:'ivalid email or password'})

        }
    } catch (error) {
        console.log(error);
    }

}

//user logout
const userLogout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log("Error destroying session:", err.message);
            } else {
                console.log("Session destroyed");

                res.redirect('/');
            }
        });
    } catch (error) {
        console.log(error.message);
    }
}

const detailShop=async(req,res)=>{
    try {
        const id=req.query.id;
        const data=await Product.findOne({_id:id})
        console.log(data);
        res.render('detailshop',{data:data})
    } catch (error) {
        console.log(error.message);
    }
  
  }

  const addressform=async (req, res) => {
    try {
      const userId=req.session.user_id;
      const data = {
        name: req.body.name,
        address: req.body.address,
        landmark: req.body.landmark,
        state: req.body.state,
        city: req.body.city,
        pincode: req.body.pincode,
        phone: req.body.phone,
        email: req.body.email
    };
    console.log(data);
  
        const findAddress = await addressModel.findOneAndUpdate(
        { user: userId },
        { $push: { address: data } },
        { upsert: true, new: true }
      )
        res.json({ add: true});
  
    } catch (error) {
        console.error(error);
        res.status(500).json({ add: false, error: "Internal Server Error" });
    }
  }

  const editAddress= async (req, res) => {
    const { editAddressId, editName, editAddress, editLandmark, editState, editCity, editPincode, editPhone, editEmail } = req.body;
  
    try {
      console.log(editAddressId);
      const user = await addressModel.findOne({ 'address._id': editAddressId })
      console.log(user);
  
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
  
        const addressToUpdate = user.address.id(editAddressId);
  
        if (!addressToUpdate) {
            return res.status(404).json({ success: false, message: 'Address not found' });
        }
  
        addressToUpdate.name = editName;
        addressToUpdate.address = editAddress;
        addressToUpdate.landmark = editLandmark;
        addressToUpdate.state = editState;
        addressToUpdate.city = editCity;
        addressToUpdate.pincode = editPincode;
        addressToUpdate.phone = editPhone;
        addressToUpdate.email = editEmail;
  
        await user.save();
  
        res.json({ success: true });
        
    } catch (error) {
        console.error('Error updating address:', error);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
  }

  const deleteAddress=async(req,res)=>{
    try {
      console.log('helooooooooooooooo');
      const user_id=req.session.user_id
      const addressId = req.body.addressId
  
      await addressModel.updateOne({user:user_id},{$pull:{address:{_id:addressId}}})
  
     res.json({success:true})
  
   } catch (error) {
       console.log(error.message);
       res.render('500Error')
   }
  }

  const detailOrder=async(req,res)=>{
    try {
      const user_id = req.session.user_id
      const order_id = req.query.id
      console.log(order_id);
      const orderData = await orderModel.findOne({_id:order_id}).populate('products.productId')
      await orderData.populate('products.productId.categoryId')
      console.log(orderData,"idddddddddddd");
      res.render('orderdetails',{orderData,user_id})
    } catch (error) {
      console.log(error.message);
    }
  }
  
  const cancelOrder = async (req, res) => {
    try {
        const user_id = req.session.user_id;
        const orderId = req.body.orderId;
        const productId = req.body.productId;
        console.log("hrlooooooooooooooo", orderId, productId);
        const count = req.body.count;
        const cancelReason = req.body.cancelReason;
        const productDetails = await Product.findById(productId).populate('categoryId');
        const orderData = await orderModel.findOneAndUpdate(
            { _id: orderId, 'products.productId': productId },
            {
                $inc: {
                    'products.$.quantity': -count,
                },
            },
            { new: true }
        );

        if (orderData.products.length > 0 && orderData.products[0].quantity > 0) {
            await orderModel.findOneAndUpdate(
                { _id: orderId },
                {
                    $push: {
                        cancelledProduct: {
                            quantity: count,
                            productStatus: 'Cancelled',
                            cancelReason: cancelReason,
                            productDetails: productDetails,
                        },
                    },
                    $pull: {
                        products: { productId: productId, quantity: 0 },
                    },
                }
            );
        } else {
            await orderModel.findOneAndUpdate(
                { _id: orderId },
                {
                    $push: {
                        cancelledProduct: {
                            productId: productId,
                            quantity: count,
                            productStatus: 'Cancelled',
                            cancelReason: cancelReason,
                            productDetails: productDetails,
                        },
                    },
                    $pull: {
                        products: { productId: productId },
                    },
                }
            );
        }

        console.log("dtaaaaaa", orderData);

        for (let i = 0; i < orderData.products.length; i++) {
            let productId = orderData.products[i].productId;
            await Product.updateOne({ _id: productId }, { $inc: { quantity: count } });
        }

        res.json({ success: true });
    } catch (error) {
        console.log(error.message);
        res.render('500Error');
    }
};

  const editUser=async(req,res)=>{
    try {
      const userData = await User.findById(req.session.user_id)
  
         await User.findOneAndUpdate(
              { email: userData.email,  },
              {
                  $set: {
                      name:req.body.editname,
                      mobile:req.body.editmobile,
                      email:req.body.editemail,
                  },
              },
              { new: true }
          );
          res.redirect('/profile')
    } catch (error) {
      console.log(error.message);
    }
  }

module.exports={
    verifyOTP,
    verifyPost,
    loadHome,
    signupPost,
    loginPost,
    userLogout,
    loadSignup,
    loadProfile,
    loadLogin,
    loadShop,
    detailShop,
    addressform,
    editAddress,
    deleteAddress,
    detailOrder,
    cancelOrder,
    editUser,
}