import mongoose from "mongoose";

const conversationSchema = new mongoose.Schema({
    chatRoom : {
        type : Number,
        require : true
    },
    participants : [
        {
            type : Number,
            ref : 'true'
        }
    ],
    messages : [
        {
            type : mongoose.Schema.Types.ObjectId,
            ref : 'Message',
            default : []
        }
    ]
},{timestamps : true})

const Conversation = mongoose.model("Conversation", conversationSchema);

export default Conversation;