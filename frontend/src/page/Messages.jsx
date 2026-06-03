import styles from "./Messages.module.css";
import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

import {
    RiSearch2Line,
    RiMessage3Fill,
    RiGroupFill,
    RiUser3Fill,
    RiAttachment2,
    RiImage2Fill,
    RiSendPlaneFill,
    RiMore2Fill,
    RiCheckDoubleFill,
    RiEmotionHappyLine,
    RiDeleteBin6Line,
    RiShareForwardLine,
    RiReplyLine,
    RiWifiOffLine,
    RiWifiFill
} from "react-icons/ri";

function Messages() {

    const socketRef = useRef(null);

    const conversations = [
        {
            id: 1,
            type: "friend",
            name: "Hoàng Văn Đức",
            avatar: "/5.png",
            online: true,
            unread: 3,
            last_message: "Đã gửi file thiết kế",
            last_time: "10:30"
        },

        {
            id: 2,
            type: "group",
            name: "Frontend Team",
            avatar: "/group.png",
            online: false,
            unread: 0,
            last_message: "Leader đã cập nhật task",
            last_time: "09:15"
        },

        {
            id: 3,
            type: "friend",
            name: "Nguyễn Quang Hải",
            avatar: "/5.png",
            online: true,
            unread: 1,
            last_message: "Ok bro",
            last_time: "Hôm qua"
        }
    ];

    const [messages, setMessages] = useState([
        {
            id: 1,
            sender: "other",
            type: "text",
            content: "Bro check lại phần dashboard giúp mình nhé",
            time: "10:25"
        },

        {
            id: 2,
            sender: "me",
            type: "text",
            content: "Ok để mình sửa responsive luôn",
            time: "10:26",
            seen: true
        }
    ]);

    const [activeTab, setActiveTab] = useState("all");
    const [activeConversation, setActiveConversation] = useState(1);
    const [messageValue, setMessageValue] = useState("");
    const [connectionStatus, setConnectionStatus] = useState("connecting");

    const filteredConversations = conversations.filter((item) => {

        if (activeTab === "all") return true;

        if (activeTab === "friends") {
            return item.type === "friend";
        }

        if (activeTab === "groups") {
            return item.type === "group";
        }

        return true;
    });

    useEffect(() => {

        const socket = new WebSocket(
            "ws://127.0.0.1:8000/ws/chat/testroom/"
        );

        socketRef.current = socket;

        socket.onopen = () => {

            console.log("CONNECTED");

            setConnectionStatus("connected");
        };

        socket.onclose = () => {

            console.log("DISCONNECTED");

            setConnectionStatus("disconnected");
        };

        socket.onerror = (err) => {

            console.log("SOCKET ERROR:", err);

            setConnectionStatus("error");
        };

        socket.onmessage = (event) => {

            console.log("MESSAGE:", event.data);

            const data = JSON.parse(event.data);

            setMessages((prev) => [

                ...prev,

                {
                    id: Date.now(),
                    sender: "other",
                    type: "text",
                    content: data.message,
                    time: new Date().toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit"
                    })
                }
            ]);
        };

        return () => {
            socket.close();
        };

    }, []);

    const handleSendMessage = () => {

        if (!messageValue.trim()) return;

        if (
            !socketRef.current ||
            socketRef.current.readyState !== WebSocket.OPEN
        ) {
            console.log("Socket not connected");
            return;
        }

        socketRef.current.send(
            JSON.stringify({
                message: messageValue
            })
        );

        setMessages((prev) => [

            ...prev,

            {
                id: Date.now(),
                sender: "me",
                type: "text",
                content: messageValue,
                time: new Date().toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit"
                }),
                seen: true
            }
        ]);

        setMessageValue("");
    };

    const handleKeyDown = (e) => {

        if (e.key === "Enter" && !e.shiftKey) {

            e.preventDefault();

            handleSendMessage();
        }
    };

    return (
        <>
            <div className={styles.page}>

                {/* SIDEBAR */}
                <div className={styles.sidebar}>

                    <div className={styles.sidebar_header}>

                        <h2>Tin nhắn</h2>

                        <div className={styles.header_right}>

                            <div
                                className={`${styles.connection_badge}
                                ${
                                    connectionStatus === "connected"
                                        ? styles.connected
                                        : styles.disconnected
                                }`}
                            >

                                {
                                    connectionStatus === "connected"
                                        ? <RiWifiFill />
                                        : <RiWifiOffLine />
                                }

                                <span>
                                    {connectionStatus}
                                </span>

                            </div>

                            <button className={styles.header_icon_button}>
                                <RiMessage3Fill />
                            </button>

                        </div>

                    </div>

                    <div className={styles.search_container}>

                        <RiSearch2Line className={styles.search_icon} />

                        <input
                            type="text"
                            placeholder="Tìm kiếm cuộc trò chuyện..."
                        />

                    </div>

                    <div className={styles.tabs}>

                        <button
                            className={`${styles.tab_button} ${
                                activeTab === "all"
                                    ? styles.active_tab
                                    : ""
                            }`}
                            onClick={() => setActiveTab("all")}
                        >
                            Tất cả
                        </button>

                        <button
                            className={`${styles.tab_button} ${
                                activeTab === "friends"
                                    ? styles.active_tab
                                    : ""
                            }`}
                            onClick={() => setActiveTab("friends")}
                        >
                            <RiUser3Fill />
                            Bạn bè
                        </button>

                        <button
                            className={`${styles.tab_button} ${
                                activeTab === "groups"
                                    ? styles.active_tab
                                    : ""
                            }`}
                            onClick={() => setActiveTab("groups")}
                        >
                            <RiGroupFill />
                            Nhóm
                        </button>

                    </div>

                    <div className={styles.conversation_list}>

                        {filteredConversations.map((item, index) => (

                            <motion.div
                                key={item.id}
                                className={`${styles.conversation_card}
                                ${
                                    activeConversation === item.id
                                        ? styles.active_conversation
                                        : ""
                                }`}
                                onClick={() => setActiveConversation(item.id)}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{
                                    delay: index * 0.04,
                                    duration: 0.25
                                }}
                            >

                                <div className={styles.avatar_wrapper}>

                                    <img
                                        src={item.avatar}
                                        alt="avatar"
                                        className={styles.avatar}
                                    />

                                    {item.online && (
                                        <span className={styles.online_dot}></span>
                                    )}

                                </div>

                                <div className={styles.conversation_content}>

                                    <div className={styles.conversation_top}>
                                        <h4>{item.name}</h4>
                                        <span>{item.last_time}</span>
                                    </div>

                                    <div className={styles.conversation_bottom}>

                                        <p>{item.last_message}</p>

                                        {item.unread > 0 && (
                                            <div className={styles.unread_badge}>
                                                {item.unread}
                                            </div>
                                        )}

                                    </div>

                                </div>

                            </motion.div>
                        ))}

                    </div>
                </div>


                {/* CHAT PANEL */}
                <div className={styles.chat_panel}>

                    {/* HEADER */}
                    <div className={styles.chat_header}>

                        <div className={styles.chat_user}>

                            <div className={styles.avatar_wrapper}>

                                <img
                                    src="/5.png"
                                    alt="avatar"
                                    className={styles.avatar}
                                />

                                <span className={styles.online_dot}></span>

                            </div>

                            <div>

                                <h3>Hoàng Văn Đức</h3>

                                <span className={styles.status_text}>
                                    Đang hoạt động
                                </span>

                            </div>

                        </div>

                        <button className={styles.header_icon_button}>
                            <RiMore2Fill />
                        </button>

                    </div>


                    {/* MESSAGE LIST */}
                    <div className={styles.message_list}>

                        {messages.map((message) => (

                            <div
                                key={message.id}
                                className={`${styles.message_row}
                                ${
                                    message.sender === "me"
                                        ? styles.my_message
                                        : styles.other_message
                                }`}
                            >

                                <div className={styles.message_actions}>

                                    <button>
                                        <RiReplyLine />
                                    </button>

                                    <button>
                                        <RiShareForwardLine />
                                    </button>

                                    <button>
                                        <RiDeleteBin6Line />
                                    </button>

                                </div>

                                <div className={styles.message_bubble_wrapper}>

                                    <div className={styles.message_bubble}>
                                        {message.content}
                                    </div>

                                    <div className={styles.message_meta}>

                                        <span>{message.time}</span>

                                        {message.sender === "me" && (

                                            <span className={styles.seen_status}>

                                                <RiCheckDoubleFill />

                                                {message.seen && " Đã xem"}

                                            </span>
                                        )}

                                    </div>

                                </div>

                            </div>
                        ))}

                    </div>


                    {/* INPUT */}
                    <div className={styles.message_input_container}>

                        <div className={styles.input_actions}>

                            <button>
                                <RiAttachment2 />
                            </button>

                            <button>
                                <RiImage2Fill />
                            </button>

                            <button>
                                <RiEmotionHappyLine />
                            </button>

                        </div>

                        <textarea
                            placeholder="Nhập tin nhắn..."
                            value={messageValue}
                            onChange={(e) => setMessageValue(e.target.value)}
                            onKeyDown={handleKeyDown}
                        ></textarea>

                        <button
                            className={styles.send_button}
                            onClick={handleSendMessage}
                        >
                            <RiSendPlaneFill />
                        </button>

                    </div>

                </div>
            </div>
        </>
    );
}

export default Messages;

// import styles from "./Messages.module.css";
// import { motion } from "framer-motion";
// import { useState } from "react";

// import {
//     RiSearch2Line,
//     RiMessage3Fill,
//     RiGroupFill,
//     RiUser3Fill,
//     RiAttachment2,
//     RiImage2Fill,
//     RiSendPlaneFill,
//     RiMore2Fill,
//     RiCheckDoubleFill,
//     RiEmotionHappyLine,
//     RiDeleteBin6Line,
//     RiShareForwardLine,
//     RiReplyLine,
//     RiCloseCircleFill
// } from "react-icons/ri";

// function Messages() {

//     const conversations = [
//         {
//             id: 1,
//             type: "friend",
//             name: "Hoàng Văn Đức",
//             avatar: "/5.png",
//             online: true,
//             unread: 3,
//             last_message: "Đã gửi file thiết kế",
//             last_time: "10:30"
//         },

//         {
//             id: 2,
//             type: "group",
//             name: "Frontend Team",
//             avatar: "/group.png",
//             online: false,
//             unread: 0,
//             last_message: "Leader đã cập nhật task",
//             last_time: "09:15"
//         },

//         {
//             id: 3,
//             type: "friend",
//             name: "Nguyễn Quang Hải",
//             avatar: "/5.png",
//             online: true,
//             unread: 1,
//             last_message: "Ok bro",
//             last_time: "Hôm qua"
//         }
//     ];

//     const messages = [
//         {
//             id: 1,
//             sender: "other",
//             type: "text",
//             content: "Bro check lại phần dashboard giúp mình nhé",
//             time: "10:25"
//         },

//         {
//             id: 2,
//             sender: "me",
//             type: "text",
//             content: "Ok để mình sửa responsive luôn",
//             time: "10:26",
//             seen: true
//         },

//         {
//             id: 3,
//             sender: "other",
//             type: "image",
//             image: "/5.png",
//             time: "10:28"
//         },

//         {
//             id: 4,
//             sender: "me",
//             recalled: true,
//             time: "10:29"
//         }
//     ];

//     const [activeTab, setActiveTab] = useState("all");
//     const [activeConversation, setActiveConversation] = useState(1);
//     const [messageValue, setMessageValue] = useState("");
//     const [showAttachmentPreview, setShowAttachmentPreview] = useState(true);

//     const filteredConversations = conversations.filter((item) => {

//         if (activeTab === "all") return true;

//         if (activeTab === "friends") {
//             return item.type === "friend";
//         }

//         if (activeTab === "groups") {
//             return item.type === "group";
//         }

//         return true;
//     });

//     return (
//         <>
//             <div className={styles.page}>

//                 {/* SIDEBAR */}
//                 <div className={styles.sidebar}>

//                     <div className={styles.sidebar_header}>
//                         <h2>Tin nhắn</h2>

//                         <button className={styles.header_icon_button}>
//                             <RiMessage3Fill />
//                         </button>
//                     </div>

//                     <div className={styles.search_container}>
//                         <RiSearch2Line className={styles.search_icon} />

//                         <input
//                             type="text"
//                             placeholder="Tìm kiếm cuộc trò chuyện..."
//                         />
//                     </div>

//                     <div className={styles.tabs}>

//                         <button
//                             className={`${styles.tab_button} ${
//                                 activeTab === "all" ? styles.active_tab : ""
//                             }`}
//                             onClick={() => setActiveTab("all")}
//                         >
//                             Tất cả
//                         </button>

//                         <button
//                             className={`${styles.tab_button} ${
//                                 activeTab === "friends" ? styles.active_tab : ""
//                             }`}
//                             onClick={() => setActiveTab("friends")}
//                         >
//                             <RiUser3Fill />
//                             Bạn bè
//                         </button>

//                         <button
//                             className={`${styles.tab_button} ${
//                                 activeTab === "groups" ? styles.active_tab : ""
//                             }`}
//                             onClick={() => setActiveTab("groups")}
//                         >
//                             <RiGroupFill />
//                             Nhóm
//                         </button>
//                     </div>

//                     <div className={styles.conversation_list}>

//                         {filteredConversations.map((item, index) => (

//                             <motion.div
//                                 key={item.id}
//                                 className={`${styles.conversation_card} ${
//                                     activeConversation === item.id
//                                         ? styles.active_conversation
//                                         : ""
//                                 }`}
//                                 onClick={() => setActiveConversation(item.id)}
//                                 initial={{ opacity: 0, y: 20 }}
//                                 animate={{ opacity: 1, y: 0 }}
//                                 transition={{
//                                     delay: index * 0.04,
//                                     duration: 0.25
//                                 }}
//                             >

//                                 <div className={styles.avatar_wrapper}>
//                                     <img
//                                         src={item.avatar}
//                                         alt="avatar"
//                                         className={styles.avatar}
//                                     />

//                                     {item.online && (
//                                         <span className={styles.online_dot}></span>
//                                     )}
//                                 </div>

//                                 <div className={styles.conversation_content}>

//                                     <div className={styles.conversation_top}>
//                                         <h4>{item.name}</h4>
//                                         <span>{item.last_time}</span>
//                                     </div>

//                                     <div className={styles.conversation_bottom}>
//                                         <p>{item.last_message}</p>

//                                         {item.unread > 0 && (
//                                             <div className={styles.unread_badge}>
//                                                 {item.unread}
//                                             </div>
//                                         )}
//                                     </div>

//                                 </div>

//                             </motion.div>
//                         ))}

//                     </div>
//                 </div>


//                 {/* CHAT PANEL */}
//                 <div className={styles.chat_panel}>

//                     {/* HEADER */}
//                     <div className={styles.chat_header}>

//                         <div className={styles.chat_user}>

//                             <div className={styles.avatar_wrapper}>
//                                 <img
//                                     src="/5.png"
//                                     alt="avatar"
//                                     className={styles.avatar}
//                                 />

//                                 <span className={styles.online_dot}></span>
//                             </div>

//                             <div>
//                                 <h3>Hoàng Văn Đức</h3>
//                                 <span className={styles.status_text}>
//                                     Đang hoạt động
//                                 </span>
//                             </div>
//                         </div>

//                         <button className={styles.header_icon_button}>
//                             <RiMore2Fill />
//                         </button>
//                     </div>


//                     {/* MESSAGE LIST */}
//                     <div className={styles.message_list}>

//                         {messages.map((message) => (

//                             <div
//                                 key={message.id}
//                                 className={`${styles.message_row} ${
//                                     message.sender === "me"
//                                         ? styles.my_message
//                                         : styles.other_message
//                                 }`}
//                             >

//                                 <div className={styles.message_actions}>

//                                     <button>
//                                         <RiReplyLine />
//                                     </button>

//                                     <button>
//                                         <RiShareForwardLine />
//                                     </button>

//                                     <button>
//                                         <RiDeleteBin6Line />
//                                     </button>

//                                 </div>


//                                 <div className={styles.message_bubble_wrapper}>

//                                     {message.recalled ? (

//                                         <div className={styles.recalled_message}>
//                                             Tin nhắn đã được thu hồi
//                                         </div>

//                                     ) : (

//                                         <>
//                                             {message.type === "text" && (
//                                                 <div className={styles.message_bubble}>
//                                                     {message.content}
//                                                 </div>
//                                             )}

//                                             {message.type === "image" && (
//                                                 <img
//                                                     src={message.image}
//                                                     alt="message"
//                                                     className={styles.message_image}
//                                                 />
//                                             )}
//                                         </>
//                                     )}

//                                     <div className={styles.message_meta}>
//                                         <span>{message.time}</span>

//                                         {message.sender === "me" && (
//                                             <span className={styles.seen_status}>
//                                                 <RiCheckDoubleFill />
//                                                 {message.seen && " Đã xem"}
//                                             </span>
//                                         )}
//                                     </div>

//                                 </div>

//                             </div>
//                         ))}

//                     </div>


//                     {/* ATTACHMENT PREVIEW */}
//                     {showAttachmentPreview && (

//                         <div className={styles.attachment_preview_container}>

//                             <div className={styles.attachment_preview}>
//                                 <img src="/5.png" alt="preview" />

//                                 <button
//                                     className={styles.remove_attachment}
//                                     onClick={() => setShowAttachmentPreview(false)}
//                                 >
//                                     <RiCloseCircleFill />
//                                 </button>
//                             </div>

//                         </div>
//                     )}


//                     {/* INPUT */}
//                     <div className={styles.message_input_container}>

//                         <div className={styles.input_actions}>

//                             <button>
//                                 <RiAttachment2 />
//                             </button>

//                             <button>
//                                 <RiImage2Fill />
//                             </button>

//                             <button>
//                                 <RiEmotionHappyLine />
//                             </button>

//                         </div>


//                         <textarea
//                             placeholder="Nhập tin nhắn..."
//                             value={messageValue}
//                             onChange={(e) => setMessageValue(e.target.value)}
//                         ></textarea>


//                         <button className={styles.send_button}>
//                             <RiSendPlaneFill />
//                         </button>

//                     </div>

//                 </div>
//             </div>
//         </>
//     );
// }

// export default Messages;

