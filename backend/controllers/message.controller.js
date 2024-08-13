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
        const sendername = req.user.username
        
        // ChatMembership 테이블에서 chatRoomId에 해당하는 모든 활성 사용자 조회 (senderId 포함)
        const members = await query(
            `SELECT user_id FROM chat_membership 
             WHERE chat_room_id = ? AND is_active = TRUE`,
            [chatRoomId]
        );

        console.log("ChatRoommembers = " + members)

        const participantIds = members.map(member => Number(member.user_id));  // Number로 변환
        for(const id in participantIds){
            console.log(id)
        }
        console.log("participants = " + participantIds)
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
            message,
            readBy: [{ userId: senderId, readAt: new Date() }]
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

        //=======================================================================
        // 이전 코드
        // newMessage.receiverIds.forEach(receiverId => {
        //     const receiverSocketIds = getReceiverSocketId(receiverId);
        //     receiverSocketIds.forEach(socketId => {
        //         io.to(socketId).emit("newMessage", newMessage);
        //     });
        // });
        //==========================================================================

          // 새로운 메시지 정보를 포함한 객체 생성
          const messageInfo = {
            chatRoomId: Number(chatRoomId),
            lastMessage: {
                _id: newMessage._id,
                senderId: newMessage.senderId,
                sendername : sendername,
                message: newMessage.message,
                createdAt: newMessage.createdAt
            },
            unreadCount: 1 // 새 메시지는 항상 읽지 않은 상태로 시작
        };

        // 메시지 수신자들에게 새 메시지 알림
        newMessage.receiverIds.forEach(receiverId => {
            const receiverSocketIds = getReceiverSocketId(receiverId);
            receiverSocketIds.forEach(socketId => {
                io.to(socketId).emit("newMessage", messageInfo);
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

        // MySQL에서 채팅방 존재 여부 확인
        const chatRoomExists = await query(
            'SELECT id FROM chat_room WHERE id = ?',
            [chatRoomId]
        );

        if (chatRoomExists.length === 0) {
            return res.status(404).json({ error: "채팅방을 찾을 수 없습니다." });
        }

        // MySQL에서 사용자의 채팅방 참여 여부 확인
        const userInChatRoom = await query(
            'SELECT * FROM chat_membership WHERE chat_room_id = ? AND user_id = ? AND is_active = TRUE',
            [chatRoomId, senderId]
        );

        if (userInChatRoom.length === 0) {
            return res.status(403).json({ error: "이 채팅방에 접근할 권한이 없습니다." });
        }

        const conversation = await Conversation.findOne({
            chatRoom : Number(chatRoomId)
        }).populate("messages"); // NOT REFERENCE BUT ACTUAL MESSAGES

        if (!conversation) {
            // 채팅방은 존재하지만 아직 메시지가 없는 경우
            return res.status(200).json([]);
        }

        const messages = conversation.messages;

        // 현재 시간 이전의 읽지 않은 메시지 찾기
        const currentTime = new Date();
        const unreadMessages = messages.filter(msg => 
            msg.senderId !== senderId && 
            msg.createdAt <= currentTime &&
            !msg.readBy.some(read => read.userId === senderId)
        );

         // 읽음 처리
         if (unreadMessages.length > 0) {
            await Message.updateMany(
                {
                    _id: { $in: unreadMessages.map(msg => msg._id) },
                    'readBy.userId': { $ne: senderId }
                },
                {
                    $addToSet: {
                        readBy: { userId: senderId, readAt: currentTime }
                    }
                }
            );
        }

        res.status(200).json(messages);
    } catch (error) {
        console.log("Error in getMessage controller: ", error.message);
        res.status(500).json({error : "Internal server error"});
    }
}

export const getLastMessageAndUnreadCount = async (req, res) => {
    try {
        const userId = req.user.id;
        const { chatRoomIds } = req.body;

        if (!Array.isArray(chatRoomIds) || chatRoomIds.length === 0) {
            return res.status(400).json({ error: "유효한 채팅방 ID 목록을 제공해주세요." });
        }

        // 각 채팅방의 마지막 메시지와 읽지 않은 메시지 수 조회
        const chatRoomDetails = await Promise.all(chatRoomIds.map(async (chatRoomId, index) => {
            const conversation = await Conversation.findOne({ chatRoom: chatRoomId })
                .populate({
                    path: 'messages',
                    options: { sort: { 'createdAt': -1 } }
                });

            if (!conversation) {
                return null; // 또는 적절한 오류 처리
            }

            // console.log(conversation)

            const lastMessage = conversation.messages[0];
            
           // 읽지 않은 메시지 수 계산
           const unreadCount = await Message.countDocuments({
            _id: { $in: conversation.messages },
            senderId: { $ne: userId },
            $or: [
                { readBy: { $exists: false } },
                { readBy: { $not: { $elemMatch: { userId: userId } } } }
            ]
        });

        console.log(`ChatRoom ${chatRoomId} - Unread Count: ${unreadCount}`);

            return {
                chatRoomId,
                // chatRoomName: conversation.name,  MongoDB에 저장된 채팅방 이름 사용
                lastMessage: lastMessage ? {
                    _id: lastMessage._id,
                    senderId: lastMessage.senderId,
                    message: lastMessage.message,
                    createdAt: lastMessage.createdAt
                } : null,
                unreadCount
            };
        }));

        // null 값 (존재하지 않는 채팅방) 필터링
        const validChatRoomDetails = chatRoomDetails.filter(detail => detail !== null);

        res.status(200).json(validChatRoomDetails);
    } catch (error) {
        console.log("Error in getLastMessageAndUnreadCount controller: ", error.message);
        res.status(500).json({ error: "Internal server error" });
    }
};