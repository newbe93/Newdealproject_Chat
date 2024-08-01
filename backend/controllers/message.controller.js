import { query } from "../db/connectToMySQLDB.js";
import Conversation from "../models/conversation.model.js";
import Message from "../models/message.model.js";
import { getReceiverSocketId, io } from "../socket/socket.js";

export const sendMessage = async (req, res) => {
    try {
        const {message} = req.body;
        const {id : chatRoomId} = req.params;
        console.log(req.user)
        const senderId = req.user.id
        
        // ChatMembership 테이블에서 chatRoomId에 해당하는 모든 활성 사용자 조회 (senderId 포함)
        const members = await query(
            `SELECT user_id FROM chat_membership 
             WHERE chat_room_id = ? AND is_active = TRUE`,
            [chatRoomId]
        );

        const participantIds = members.map(member => Number(member.user_id));  // Number로 변환
        console.log(message)
        // let conversation = await Conversation.findOne({
        //     participants : {$all : [senderId, receiverId]}
        // })

        // if(!conversation){
        //     conversation = await Conversation.create({
        //         participants: [senderId, receiverId]
        //     })
        // }

        // MongoDB: Conversation 찾기 또는 생성
        let conversation = await Conversation.findOne({
            chatRoom: Number(chatRoomId),
        });

        if (!conversation) {
            conversation = new Conversation({
                chatRoom: Number(chatRoomId),
                participants: participantIds
            });
        }

        const newMessage = new Message({
            senderId: Number(senderId),  // Number로 변환
            receiverIds: participantIds.filter(id => id !== senderId),  // 발신자를 제외한 모든 참가자
            message
        })

        if(newMessage){
            conversation.messages.push(newMessage._id)
        }

        

        // await conversation.save();
        // await newMessage.save();

        // this will run iin parallel
        await Promise.all([conversation.save(), newMessage.save()]);

        // SOCKET IO FUNCTIONALITY WILL GO HERE
        // const receiverSocketId = getReceiverSocketId(receiverId);
        // if(receiverSocketId){
        //     // io.to(<socket_id>).emit() used to send events to specific client
        //     io.to(receiverSocketId).emit("newMessage",newMessage)
        // }

        //
        newMessage.receiverIds.forEach(receiverId => {
            const receiverSocketIds = getReceiverSocketId(receiverId);
            receiverSocketIds.forEach(socketId => {
                io.to(socketId).emit("newMessage", newMessage);
            });
        });

        res.status(201).json(newMessage);
    } catch (error) {
        console.log("Error in sendMessage controller : ", error.message)
        res.status(500).json({error : "Internal server error"})
    }
}

export const getMessages = async (req, res) => {
    try {
        const {id : chatRoomId} = req.params;
        const senderId = req.user.id;
        console.log("getMessage에서 senderId : " + senderId)

        const conversation = await Conversation.findOne({
            chatRoom : Number(chatRoomId)
        }).populate("messages"); // NOT REFERENCE BUT ACTUAL MESSAGES

        if(!conversation) return res.status(404).json({ error: "채팅방을 찾을 수 없습니다."});

        // 현재 사용자가 참가자인지 확인
        if (!conversation.participants.includes(Number(senderId))) {
            return res.status(403).json({ error: "이 채팅방에 접근할 권한이 없습니다." });
        }

        const messages = conversation.messages

        res.status(200).json(messages);
    } catch (error) {
        console.log("Error in getMessage controller: ", error.message);
        res.status(500).json({error : "Internal server error"});
    }
}