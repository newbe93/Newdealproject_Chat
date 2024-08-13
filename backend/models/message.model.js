import mongoose from "mongoose";

const messageSchema = new mongoose.Schema({
    senderId : {
        type: Number,
        required: true,
    },
    receiverIds: [{
        type: Number,
        required: true,
    }],
    message:{
        type: String,
        required: true,
    },
    readBy: [{
        userId: {
            type: Number,
            required: true,
        },
        readAt: {
            type: Date,
            default: null,
        }
    }]
    // createAt , updatedAt => message.createdAt 
}, {timestamps : true});

const Message = mongoose.model("Message", messageSchema);

export default Message;