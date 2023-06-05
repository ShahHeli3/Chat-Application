//configure cloudinary for file uploads
$.cloudinary.config({cloud_name: 'dhhzjlge9', api_key: '675879341691844'});

var allGroups = [];
var roomName = ''
var roomType = ''
var availableTags = [];
var groupMembersList = [];
var groupName = '';
var imageID = ''
var availableMembers = [];
var addMembersList = [];
var user = 0
var chatSocket = ''
var notificationSocket = ''

function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

//to get current logged-in user
$.ajax({
    method: "GET",
    url: '/get_current_user',
    success: function (response) {
        user = response['user']
        newWebSocket(user)
    }
})

//new ws connection
function newWebSocket(username) {
    if (window.location.protocol === "https:") {
        notificationSocket = new WebSocket(
            'wss://'
            + window.location.host
            + '/ws/notification/'
            + username
            + '/'
        );
    }
    if (window.location.protocol === "http:") {
        notificationSocket = new WebSocket(
            'ws://'
            + window.location.host
            + '/ws/notification/'
            + username
            + '/'
        );
    }


    notificationSocket.onopen = function () {
        notificationSocket.send(JSON.stringify({
            'user': username,
            'room': roomName,
            'room_type': roomType
        }));
    }

    notificationSocket.onmessage = function (e) {
        const data = JSON.parse(e.data);

        var notifications_list = data['notifications']

        for (let i = 0; i < notifications_list.length; i++) {
            $("#" + notifications_list[i][0]).append("<span class='badge' style='position: absolute;" +
                "  right: 10px; padding: 6px; background: blue !important;" +
                "  border-radius: 50%; color: white;'>" + notifications_list[i][1] + "</span>")

        }
    }
}

//on clicking the search bar for groups
$('#search-group').click(function () {
    $.ajax({
        method: "GET",
        url: "/get_all_groups",
        success: function (response) {
            allGroups = response
            startAutoComplete(response)
        }
    })

    function startAutoComplete(availableGroups) {
        $("#search-group").autocomplete({
            source: availableGroups
        });
    }
})

//on clicking the group button to display group rooms
$('#group-chat').click(function () {
    document.getElementById('searchuser').style.display = 'none'
    document.getElementById('search-group').style.display = 'block'

    document.getElementById('btn-chat').style.display = 'none'
    document.getElementById('btn-open-group').style.display = 'block'
})

//on clicking the chat function to display personal rooms
$('#chat-bar').click(function () {
    document.getElementById('searchuser').style.display = 'block'
    document.getElementById('search-group').style.display = 'none'

    document.getElementById('btn-chat').style.display = 'block'
    document.getElementById('btn-open-group').style.display = 'none'
})

//on clicking the open button after selecting group
$('#btn-open-group').click(function () {
    var group_name = document.getElementById('search-group').value;
    document.getElementById('search-bar-message').innerHTML = ''

    if (allGroups.includes(group_name)) {

        $.ajax({
            method: 'GET',
            url: '/get_room_from_group_name',
            data: {
                'group': group_name
            },
            success: function (response) {
                var room = response['room']
                updateGroupChat(room, group_name)
            }
        })

    } else {
        $('#search-bar-message').append(('<h6> No such group exists.<br>Select an existing group or create a new group</h6>'))
    }
})

//on clicking the search bar to search users
$('#searchuser').click(function () {
    $.ajax({
        method: "GET",
        url: "/get_all_users",
        success: function (response) {
            startAutoComplete(response)
        }
    })
})

//for suggestions while searching
function startAutoComplete(availableUsers) {
    $("#searchuser").autocomplete({
        source: availableUsers
    });
}

//on clicking the chat button after selecting a user
$('#btn-chat').click(function () {
    var receiver = document.getElementById("searchuser").value;
    document.getElementById('search-bar-message').innerHTML = ''
    updateMessage(receiver)
});

//to update messages in personal chat room
function updateMessage(receiver) {
    document.getElementById('user-chat').style.display = 'block'
    document.getElementById('home-image').style.display = 'none'
    $.ajax(
        {
            method: "POST",
            url: "/get_or_create_room",
            headers: {
                "X-CSRFToken": getCookie("csrftoken")
            },
            data: {
                "receiver": receiver,
            },
            success: function (data) {
                document.getElementById('chat-message-input-box').style.display = 'none'

                if (data['message']) {
                    $("#search-bar-message").append('<h6>' + data['message'] + '</h6')
                } else {
                    if (data['new_room']) {
                        $('#user-chat-list .simplebar-wrapper .simplebar-mask .simplebar-offset .simplebar-content-wrapper .simplebar-content').append(
                            "<li class='active' onclick=updateMessage('" + receiver + "')>" +
                            "<a href=\"javascript: void(0);\">\n" +
                            "<div class=\"d-flex\">\n" +
                            "<div class=\"flex-shrink-0 align-self-center me-3\">\n" +
                            "<img src='https://res.cloudinary.com/dhhzjlge9/image/upload/v1659008891/" + data['receiver_profile'] + "' class='rounded-circle avatar-xs'></div>" +
                            "<div class=\"flex-grow-1 overflow-hidden\">\n" +
                            "<h5 class=\"text-truncate font-size-14 mb-1\">\n" +
                            data['receiver_name'] + "</h5></div></div></a></li></ul>"
                        )
                    }
                    roomName = data['room_name']

                    $.ajax({
                        method: "GET",
                        url: "/get_room_type",
                        data: {
                            'room_name': roomName
                        },
                        success: function (response) {
                            roomType = response['room_type']
                            room_id = response['room_id']
                            var spanTag = document.getElementById("room-" + room_id).getElementsByTagName('span')
                            for (let i = 0; i < spanTag.length; i++) {
                                document.getElementById("room-" + room_id).getElementsByTagName('span')[i].style.display = "none"
                            }
                        }
                    })

                    $.ajax(
                        {
                            method: "GET",
                            url: "/get_messages",
                            data: {
                                "room": roomName
                            },
                            success: function (d) {
                                var receiver = d['receiver'];
                                var receiver_user = d['receiver_user'];
                                var sender_user = d['sender_user'];
                                var sender_user_id = d['sender_user_id'];
                                var imageSource = 'https://res.cloudinary.com/dhhzjlge9/image/upload/v1659071861/' + d['profile_image']

                                document.getElementById("receiver_name").innerText = receiver;
                                document.getElementById("receiver-image").src = imageSource;
                                document.getElementById("receiver-profile-image").href = imageSource;
                                document.getElementById("chat-messages").innerHTML = "";

                                for (let i = 0; i < d['json'].length; i++) {
                                    if (d['json'][i]['message_type'] === 'text') {
                                        var message_data = "<p>" + d['json'][i]['message'] + "</p>"
                                    } else if (d['json'][i]['message_type'] === 'image') {
                                        var message_data = "<a href='" + d['json'][i]['message'] + "' target='_blank'><img src='" + d['json'][i]['message'] + "' width='250' height='200'></a>"
                                    } else if (d['json'][i]['message_type'] === 'video') {
                                        var message_data = "<video width='250' height='200' controls><source src='" + d['json'][i]['message'] + "' type='video/mp4'></video>"
                                    } else if (d['json'][i]['message_type'] === 'file') {
                                        var message_data = "<h6><b>File : </b><a href='" + d['json'][i]['message'] + "' target='_blank'>Download File</a></h6>"
                                    } else if (d['json'][i]['message_type'] === 'audio') {
                                        var message_data = "<h6><b>File : </b><a href='" + d['json'][i]['message'] + "' target='_blank'>Download Audio</a></h6>"
                                    }

                                    if (d['json'][i]['id'] in d['replied_messages']) {

                                        var message = d['replied_messages'][d['json'][i]['id']]['reply_to_message']
                                        const message_type = d['replied_messages'][d['json'][i]['id']]['reply_to_message_type']

                                        if (message_type === 'image') {
                                            message = "<img src='" + message + "' style='height: 80px; width: 80px'>"
                                        } else if (message_type === 'video') {
                                            message = "<video src='" + message + "' style='height: 80px; width: 80px'>"
                                        } else if (message_type === 'audio') {
                                            message = "Audio File"
                                        } else if (message_type === 'file') {
                                            message = "File"
                                        }

                                        if (receiver_user === d['json'][i]['username']) {
                                            $("#chat-messages").append("<li><div class='conversation-list' style='opacity: 75%; margin-bottom: 0px; cursor: pointer' onclick=replyToScroll('message-" + d['replied_messages'][d['json'][i]['id']]['reply_to'] + "') id='replied-msg-" + d['json'][i]['id'] + "'>" +
                                                "<div class='ctext-wrap' style='margin-top: 0px'><p style='font-weight: bold; font-size: 10px; margin-bottom: 0'>Replied</p><div class='conversation-name'>" +
                                                d['replied_messages'][d['json'][i]['id']]['reply_to_sender'] + "</div>" + message + "</div></div></li>")
                                        } else {
                                            $("#chat-messages").append("<li class='right'><div class='conversation-list' style='opacity: 75%; margin-bottom: 0px; cursor: pointer' onclick=replyToScroll('message-" + d['replied_messages'][d['json'][i]['id']]['reply_to'] + "') id='replied-msg-" + d['json'][i]['id'] + "'>" +
                                                "<div class='ctext-wrap' style='margin-top: 0px'><p style='font-weight: bold; font-size: 10px; margin-bottom: 0'>Replied</p><div class='conversation-name'>" +
                                                d['replied_messages'][d['json'][i]['id']]['reply_to_sender'] + "</div>" + message + "</div></div></li>")
                                        }
                                    }

                                    if (receiver_user === d['json'][i]['username']) {
                                        $("#chat-messages").append("<li><div class='conversation-list' id='message-" + d['json'][i]['id'] + "'>" +
                                            "<div class='dropdown'><a class='dropdown-toggle' href='#' role='button' data-bs-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>\n" +
                                            "<i class='bx bx-dots-vertical-rounded'></i>\n</a><div class='dropdown-menu'>\n" +
                                            "<a class=\"dropdown-item\" href=\"#\" onclick='replyMessage(" + d['json'][i]['id'] + ")'>Reply</a>\n" +
                                            "<a class=\"dropdown-item\" href=\"#\" onclick='deleteMessage(" + d['json'][i]['id'] + ")'>Delete</a>\n" +
                                            "</div></div>" +
                                            "<div class='ctext-wrap'><div class='conversation-name'>" +
                                            d['json'][i]['full_name'] + "</div>" + message_data +
                                            "<p class='chat-time mb-0'><i class='bx bx-time-five align-middle me-1'></i>" +
                                            d['json'][i]['timestamp'] + "</p></div></div></li>")
                                    } else {
                                        $("#chat-messages").append("<li class='right'><div class='conversation-list' id='message-" + d['json'][i]['id'] + "'>" +
                                            "<div class='dropdown'><a class='dropdown-toggle' href='#' role='button' data-bs-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>\n" +
                                            "<i class='bx bx-dots-vertical-rounded'></i>\n</a><div class='dropdown-menu'>\n" +
                                            "<a class=\"dropdown-item\" href=\"#\" onclick='replyMessage(" + d['json'][i]['id'] + ")'>Reply</a>\n" +
                                            "<a class=\"dropdown-item\" href=\"#\" onclick='deleteMessageOption(" + d['json'][i]['id'] + ")'>Delete</a>\n" +
                                            "</div></div>" +
                                            "<div class='ctext-wrap'><div class='conversation-name'>" +
                                            d['json'][i]['full_name'] + "</div>" + message_data +
                                            "<p class='chat-time mb-0'><i class='bx bx-time-five align-middle me-1'></i>" +
                                            d['json'][i]['timestamp'] + "</p><i style='font-size: 10px' id='" + d['json'][i]['id'] + "'>"
                                            + d['json'][i]['status'] + "</i></div></div></li>")
                                    }
                                }
                                $("#chat-messages").append("</ul>");
                                chat(roomName, sender_user, sender_user_id)
                            }
                        }
                    )
                }
            },
        }
    )
}

//to get current date time
function getDateTime() {
    var current_date = new Date();
    var formatted = " " + current_date.toLocaleString('default', {month: 'long'}) + " " + current_date.getDate().toString()
        + ", " + current_date.getFullYear().toString() + " " +
        current_date.toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        }).toUpperCase()
    return formatted
}

//for creating websocket as per the selected room
function createChatSocket() {
    if (window.location.protocol === "https:") {
        var chatSocket = new WebSocket(
            'wss://'
            + window.location.host
            + '/ws/chat/'
            + roomName
            + '/'
        );
    }
    if (window.location.protocol === "http:") {
        var chatSocket = new WebSocket(
            'ws://'
            + window.location.host
            + '/ws/chat/'
            + roomName
            + '/'
        );
    }
    return chatSocket
}

//chat function
function chat(roomName, sender_user, sender_user_id) {

    $("#chat-log").scrollTop($("#chat-log")[0].scrollHeight);

    chatSocket = createChatSocket()

    displayMessage(chatSocket)

    chatSocket.onclose = function (e) {
        console.error('Chat socket closed unexpectedly');
    };

    let reply_to = 0
    document.querySelector('#chat-message-input').focus();
    document.querySelector('#chat-message-input').onkeyup = function (e) {
        if (e.keyCode === 13) {  // enter, return
            document.querySelector('#chat-message-submit').click();
        }
    };

    document.querySelector('#chat-message-submit').onclick = function (e) {
        const messageInputDom = document.querySelector('#chat-message-input');
        const message = messageInputDom.value;

        if (message.trim().length !== 0) {
            let reply_to = 0
            if (document.getElementById('chat-message-input-box').style.display === 'block') {
                var reply_id = document.getElementById('chat-message-input-box').getElementsByTagName('p')[0].id
                reply_to = reply_id.split("-")[1]

            }

            chatSocket.send(JSON.stringify({
                'message': message,
                'sender_user': sender_user,
                'sender_user_id': sender_user_id,
                'message_type': 'text',
                'reply_to': reply_to
            }));
            messageInputDom.value = '';
        }
    };

    document.querySelector('#send-image-file').onclick = function (e) {
        cloudinary.openUploadWidget({
                cloud_name: 'dhhzjlge9',
                upload_preset: 'g5lmd3i3',
                sources: ['local', 'camera', 'url', 'image_search', 'instagram', 'facebook', 'google_drive'],
                googleApiKey: 'AIzaSyA7OW6XyqFva5ZjmP6T3qYRdNaEQ-rUZck',
                multiple: false,
            },
            function (error, result) {
                // If NO error, log image data to console

                if (result.info['files'][0]['uploadInfo']['resource_type'] !== 'image') {
                    Swal.fire({
                        title: 'Invalid image file',
                        confirmButtonText: 'OK',
                    })
                } else {
                    var url = result.info['files'][0]['uploadInfo']['secure_url']

                    let reply_to = 0
                    if (document.getElementById('chat-message-input-box').style.display === 'block') {
                        var reply_id = document.getElementById('chat-message-input-box').getElementsByTagName('p')[0].id
                        reply_to = reply_id.split("-")[1]

                    }

                    chatSocket.send(JSON.stringify({
                        'message': url,
                        'sender_user': sender_user,
                        'sender_user_id': sender_user_id,
                        'message_type': 'image',
                        'reply_to': reply_to
                    }));
                }
            }
        )
    }

    document.querySelector('#send-video-file').onclick = function (e) {
        cloudinary.openUploadWidget({
                cloud_name: 'dhhzjlge9',
                upload_preset: 'y4rx3bp1',
                sources: ['local', 'url', 'instagram', 'facebook', 'google_drive'],
                multiple: false,
            },
            function (error, result) {
                // If NO error, log image data to console

                if (result.info['files'][0]['uploadInfo']['resource_type'] !== 'video') {
                    Swal.fire({
                        title: 'Invalid video file',
                        confirmButtonText: 'OK',
                    })
                } else {
                    var url = result.info['files'][0]['uploadInfo']['secure_url']

                    let reply_to = 0
                    if (document.getElementById('chat-message-input-box').style.display === 'block') {
                        var reply_id = document.getElementById('chat-message-input-box').getElementsByTagName('p')[0].id
                        reply_to = reply_id.split("-")[1]

                    }

                    chatSocket.send(JSON.stringify({
                        'message': url,
                        'sender_user': sender_user,
                        'sender_user_id': sender_user_id,
                        'message_type': 'video',
                        'reply_to': reply_to
                    }));
                }
            }
        )

    }

    document.querySelector('#send-doc-file').onclick = function (e) {
        cloudinary.openUploadWidget({
                cloud_name: 'dhhzjlge9',
                upload_preset: 'ghritkgd',
                sources: ['local', 'camera', 'url', 'google_drive'],
                multiple: false,
            },
            function (error, result) {
                // If NO error, log image data to console

                if (result.info['files'][0]['uploadInfo']['resource_type'] !== 'raw') {
                    Swal.fire({
                        title: 'Invalid file format',
                        confirmButtonText: 'OK',
                    })
                } else {
                    var url = result.info['files'][0]['uploadInfo']['secure_url']

                    let reply_to = 0
                    if (document.getElementById('chat-message-input-box').style.display === 'block') {
                        var reply_id = document.getElementById('chat-message-input-box').getElementsByTagName('p')[0].id
                        reply_to = reply_id.split("-")[1]

                    }

                    chatSocket.send(JSON.stringify({
                        'message': url,
                        'sender_user': sender_user,
                        'sender_user_id': sender_user_id,
                        'message_type': 'file',
                        'reply_to': reply_to
                    }));
                }
            }
        )
    }

    document.querySelector('#send-audio-file').onclick = function (e) {
        cloudinary.openUploadWidget({
                cloud_name: 'dhhzjlge9',
                upload_preset: 'icdoj041',
                sources: ['local', 'url', 'google_drive'],
                multiple: false,
            },
            function (error, result) {

                // If NO error, log image data to console
                var file_format = result.info['files'][0]['uploadInfo']['format']

                if (file_format !== 'aac' && file_format !== 'aiff' && file_format !== 'm4a' && file_format !== 'mp3' &&
                    file_format !== 'ogg' && file_format !== 'wav') {
                    Swal.fire({
                        title: 'Invalid audio file',
                        confirmButtonText: 'OK',
                    })
                } else {
                    url = result.info['files'][0]['uploadInfo']['secure_url']

                    let reply_to = 0
                    if (document.getElementById('chat-message-input-box').style.display === 'block') {
                        var reply_id = document.getElementById('chat-message-input-box').getElementsByTagName('p')[0].id
                        reply_to = reply_id.split("-")[1]

                    }

                    chatSocket.send(JSON.stringify({
                        'message': url,
                        'sender_user': sender_user,
                        'sender_user_id': sender_user_id,
                        'message_type': 'audio',
                        'reply_to': reply_to
                    }));
                }
            }
        )
    }
}

//to display messages on onmessage function of socket
function displayMessage(chatSocket) {
    chatSocket.onmessage = function (e) {

        document.getElementById('chat-message-input-box').style.display = 'none'

        notificationSocket.send(JSON.stringify({
            'user': user,
            'room': roomName,
            'room_type': roomType
        }));

        const data = JSON.parse(e.data);

        if (data.updated_message_id) {
            if (document.getElementById(data.updated_message_id)) {
                document.getElementById(data.updated_message_id).innerText = 'seen'
            }
        }

        if (data.deleted_message) {
            const deleted_message = data.deleted_message.split("-")[1]
            document.getElementById(data['deleted_message']).remove()
            const replied_msg = document.getElementById("replied-msg-" + deleted_message)
            if (replied_msg) {
                replied_msg.remove()
            }
        }

        if (data.unseen_messages) {
            for (i = 0; i < data['unseen_messages'].length; i++) {
                document.getElementById(data['unseen_messages'][i]).innerText = 'seen'
            }
        }

        if (data.replied_to_msg_type) {
            var message = data.replied_msg

            if (data.replied_to_msg_type === 'image') {
                message = "<img src='" + message + "' style='height: 80px; width: 80px'>"
            } else if (data.replied_to_msg_type === 'video') {
                message = "<video src='" + message + "' style='height: 80px; width: 80px'>"
            } else if (data.replied_to_msg_type === 'audio') {
                message = "Audio File"
            } else if (data.replied_to_msg_type === 'file') {
                message = "File"
            }
        }

        //if the message room and active room is same
        if (data.room_name === roomName) {

            var formatted = getDateTime()

            if (data.message_type === 'text') {
                var message_data = "<p>" + data.message + "</p>"
            } else if (data.message_type === 'image') {
                var message_data = "<a href='" + data.message + "' target='_blank'><img src='" + data.message + "' width='250' height='200'></a>"
            } else if (data.message_type === 'video') {
                var message_data = "<video width='250' height='200' controls><source src='" + data.message + "' type='video/mp4'></video>"
            } else if (data.message_type === 'file') {
                var message_data = "<h6><b>File : </b><a href='" + data.message + "' target='_blank'>Download File</a></h6>"
            } else if (data.message_type === 'audio') {
                var message_data = "<h6><b>File : </b><a href='" + data.message + "' target='_blank'>Download Audio</a></h6>"
            }

            if (data.sender_user_id !== user) {
                if (roomType === 'Personal') {
                    $.ajax({
                        method: 'POST',
                        url: '/update_message_status',
                        headers: {
                            "X-CSRFToken": getCookie("csrftoken")
                        },
                        data: {
                            'message_id': data.message_id
                        },
                    })
                }

                if (roomType === 'Group') {
                    $.ajax({
                        method: 'POST',
                        url: '/update_group_message_status',
                        headers: {
                            "X-CSRFToken": getCookie("csrftoken")
                        },
                        data: {
                            'message_id': data.message_id
                        },
                    })
                }

                if (data.replied_msg) {
                    $("#chat-messages").append("<li><div class='conversation-list' style='opacity: 75%; margin-bottom: 0px;  cursor: pointer' onclick=replyToScroll('message-" + data.replied_to_msg_id + "') id='replied-msg-" + data.message_id + "'>" +
                        "<div class='ctext-wrap' style='margin-top: 0px'><p style='font-weight: bold; font-size: 10px; margin-bottom: 0'>Replied</p><div class='conversation-name'>" +
                        data.replied_msg_sender + "</div>" + message + "</div></div></li>")
                }

                $("#chat-messages").append("<li><div class='conversation-list' id='message-" + data.message_id + "'>" +
                    "<div class='dropdown'><a class='dropdown-toggle' href='#' role='button' data-bs-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>\n" +
                    "<i class='bx bx-dots-vertical-rounded'></i>\n</a><div class='dropdown-menu'>\n" +
                    "<a class=\"dropdown-item\" href=\"#\" onclick='replyMessage(" + data.message_id + ")'>Reply</a>\n" +
                    "<a class=\"dropdown-item\" href=\"#\" onclick='deleteMessage(" + data.message_id + ")'>Delete</a>\n" +
                    "</div></div>" +
                    "<div class='ctext-wrap'><div class='conversation-name'>" +
                    data.sender_user + "</div>" + message_data + "<p class='chat-time mb-0'><i class='bx bx-time-five align-middle me-1'></i>" +
                    formatted + "</p></div></div></li>")

            } else {

                if (data.replied_msg) {
                    $("#chat-messages").append("<li class='right'><div class='conversation-list' style='opacity: 75%; margin-bottom: 0px;  cursor: pointer' onclick=replyToScroll('message-" + data.replied_to_msg_id + "') id='replied-msg-" + data.message_id + "'>" +
                        "<div class='ctext-wrap' style='margin-top: 0px'><p style='font-weight: bold; font-size: 10px; margin-bottom: 0'>Replied</p><div class='conversation-name'>" +
                        data.replied_msg_sender + "</div>" + message + "</div></div></li>")
                }

                if (roomType === 'Group') {
                    $("#chat-messages").append("<li class='right'><div class='conversation-list' id=message-" + data.message_id + ">" +
                        "<div class='dropdown'><a class='dropdown-toggle' href='#' role='button' data-bs-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>\n" +
                        "<i class='bx bx-dots-vertical-rounded'></i>\n</a><div class='dropdown-menu'>" +
                        "<a class=\"dropdown-item\" href=\"#\" onclick='messageInfo(" + data.message_id + ")'>Info</a>\n" +
                        "<a class=\"dropdown-item\" href=\"#\" onclick='replyMessage(" + data.message_id + ")'>Reply</a>\n" +
                        "<a class=\"dropdown-item\" href=\"#\" onclick='deleteMessageOption(" + data.message_id + ")'>Delete</a>\n" +
                        "</div></div>" +
                        "<div class='ctext-wrap'><div class='conversation-name'>" +
                        data.sender_user + "</div>" + message_data + "<p class='chat-time mb-0'><i class='bx bx-time-five align-middle me-1'></i>" +
                        formatted + "</p><i style='font-size: 10px' id='" + data.message_id + "'>unseen</i>" +
                        "</div></div></li>")
                } else {
                    $("#chat-messages").append("<li class='right'><div class='conversation-list' id='message-" + data.message_id + "'>" +
                        "<div class='dropdown'><a class='dropdown-toggle' href='#' role='button' data-bs-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>\n" +
                        "<i class='bx bx-dots-vertical-rounded'></i>\n</a><div class='dropdown-menu'>" +
                        "<a class=\"dropdown-item\" href=\"#\" onclick='replyMessage(" + data.message_id + ")'>Reply</a>\n" +
                        "<a class=\"dropdown-item\" href=\"#\" onclick='deleteMessageOption(" + data.message_id + ")'>Delete</a>\n" +
                        "</div></div>" +
                        "<div class='ctext-wrap'><div class='conversation-name'>" +
                        data.sender_user + "</div>" + message_data + "<p class='chat-time mb-0'><i class='bx bx-time-five align-middle me-1'></i>" +
                        formatted + "</p><i style='font-size: 10px' id='" + data.message_id + "'>unseen</i>" +
                        "</div></div></li>")
                }

            }

            $("#chat-log").scrollTop($("#chat-log")[0].scrollHeight);
        }
    }
}

//to open create group page
function openCreateGroup() {
    document.getElementById('left-bar').style.display = 'none'
    document.getElementById('left-bar-create-group').style.display = 'block'

    $.ajax({
        method: "GET",
        url: "/get_all_users_for_group_creation",
        success: function (response) {
            startAutoComplete(response)
            availableTags = response
        }
    })

    function startAutoComplete(availableTags) {
        $("#group-member").autocomplete({
            source: availableTags
        });
    }
}

//to allow user to create group after selecting atleast one member
function allowCreateGroup() {
    document.getElementById('pre-group-name-div').innerHTML = ''

    groupName = document.getElementById('group-name').value

    if (groupName.trim().length === 0) {
        $("#pre-group-name-div").append('<h5 class="font-size-15 mt-2">Please enter a group name!!</h5>')
    } else {
        var member = document.getElementById('group-member').value

        if (member.trim().length === 0) {
            $("#pre-group-name-div").append('<h5 class="font-size-15 mt-2">Please enter a username!!</h5>')
        } else {
            document.getElementById('group-member').value = ''
            if (availableTags.includes(member)) {
                if (groupMembersList.includes(member)) {
                    $("#pre-group-name-div").append('<h5 class="font-size-15 mt-2">User already selected!</h5>')
                } else {
                    groupMembersList.push(member)
                    $("#group-members-list").append('<h5 class="font-size-12 mt-2">' + member + '</h5>')
                    document.getElementById('btn-create-group').style.display = 'block'
                }
            } else {
                $("#pre-group-name-div").append('<h5 class="font-size-15 mt-2">Please select a valid user!!</h5>')
            }
        }
    }
}

//to create group
function createGroup() {

    $.ajax({
        url: '/create_group',
        method: 'POST',
        headers: {
            "X-CSRFToken": getCookie("csrftoken")
        },
        data: {
            'group_icon': imageID,
            'group_name': groupName,
            'group_members': groupMembersList,
        },
        success: function (response) {
            roomName = response['room_name']

            $('#user-group-list .simplebar-wrapper .simplebar-mask .simplebar-offset .simplebar-content-wrapper .simplebar-content').append(
                "<li id='" + response['room_id'] + "' onclick=\"updateGroupChat('" + roomName + "', '" + groupName + "')\">" +
                "<a href=\"javascript: void(0);\"><div class=\"d-flex align-items-center\"><div class=\"flex-shrink-0 me-3\">\n" +
                "<div class=\"avatar-xs\">\n" +
                "<img src='" + response['group_icon'] + "' class=\"rounded-circle avatar-xs\ alt=\"\"></div></div>" +
                "<div class=\"flex-grow-1\"><h5 class=\"font-size-14 mb-0\">" + groupName + "</h5></div>" +
                "</div></a></li></ul>"
            )

            updateGroupChat(roomName, groupName)

        }
    })
}

//to update group messages after opening the group
function updateGroupChat(room, group) {
    roomName = room

    $.ajax({
        method: "GET",
        url: "/get_room_type",
        data: {
            'room_name': roomName
        },
        success: function (response) {
            roomType = response['room_type']
            room_id = response['room_id']
            var spanTag = document.getElementById("room-" + room_id).getElementsByTagName('span')
            for (let i = 0; i < spanTag.length; i++) {
                document.getElementById("room-" + room_id).getElementsByTagName('span')[i].style.display = "none"
            }
        }
    })

    document.getElementById('home-image').style.display = 'none'
    document.getElementById('user-chat').style.display = 'block'
    document.getElementById("receiver_name").innerText = group
    document.getElementById("chat-messages").innerHTML = "";

    document.getElementById('left-bar').style.display = 'block'
    document.getElementById('left-bar-create-group').style.display = 'none'
    document.getElementById('more-features').style.display = 'block'

    $('#chat').removeClass('active');
    $('#groups').addClass('active');
    $('#chat').ariaExpanded = false;
    $('#groups').ariaExpanded = true

    $.ajax(
        {
            method: "GET",
            url: "/get_group_messages",
            data: {
                "room": room
            },
            success: function (response) {
                document.getElementById("receiver-image").src = response['group_icon'];
                document.getElementById("receiver-profile-image").href = response['group_icon'];

                var sender_user_id = response['sender_user_id']

                for (let i = 0; i < response['json'].length; i++) {

                    if (response['json'][i]['message_type'] === 'text') {
                        var message_data = "<p>" + response['json'][i]['message'] + "</p>"
                    } else if (response['json'][i]['message_type'] === 'image') {
                        var message_data = "<a href='" + response['json'][i]['message'] + "' target='_blank'><img src='" + response['json'][i]['message'] + "' width='250' height='200'></a>"
                    } else if (response['json'][i]['message_type'] === 'video') {
                        var message_data = "<video width='250' height='200' controls><source src='" + response['json'][i]['message'] + "' type='video/mp4'></video>"
                    } else if (response['json'][i]['message_type'] === 'file') {
                        var message_data = "<h6><b>File : </b><a href='" + response['json'][i]['message'] + "' target='_blank'>Download File</a></h6>"
                    } else if (response['json'][i]['message_type'] === 'audio') {
                        var message_data = "<h6><b>File : </b><a href='" + response['json'][i]['message'] + "' target='_blank'>Download Audio</a></h6>"
                    }

                    if (response['json'][i]['id'] in response['replied_messages']) {

                        var message = response['replied_messages'][response['json'][i]['id']]['reply_to_message']
                        const message_type = response['replied_messages'][response['json'][i]['id']]['reply_to_message_type']

                        if (message_type === 'image') {
                            message = "<img src='" + message + "' style='height: 80px; width: 80px'>"
                        } else if (message_type === 'video') {
                            message = "<video src='" + message + "' style='height: 80px; width: 80px'>"
                        } else if (message_type === 'audio') {
                            message = "Audio File"
                        } else if (message_type === 'file') {
                            message = "File"
                        }

                        if (sender_user_id !== response['json'][i]['sender_user']) {
                            $("#chat-messages").append("<li><div class='conversation-list' style='opacity: 75%; margin-bottom: 0px; cursor: pointer' onclick=replyToScroll('message-" + response['replied_messages'][response['json'][i]['id']]['reply_to'] + "') id='replied-msg-" + response['json'][i]['id'] + "'>" +
                                "<div class='ctext-wrap' style='margin-top: 0px'><p style='font-weight: bold; font-size: 10px; margin-bottom: 0'>Replied</p><div class='conversation-name'>" +
                                response['replied_messages'][response['json'][i]['id']]['reply_to_sender'] + "</div>" + message + "</div></div></li>")
                        } else {
                            $("#chat-messages").append("<li class='right'><div class='conversation-list' style='opacity: 75%; margin-bottom: 0px; cursor: pointer' onclick=replyToScroll('message-" + response['replied_messages'][response['json'][i]['id']]['reply_to'] + "') id='replied-msg-" + response['json'][i]['id'] + "'>" +
                                "<div class='ctext-wrap' style='margin-top: 0px'><p style='font-weight: bold; font-size: 10px; margin-bottom: 0'>Replied</p><div class='conversation-name'>" +
                                response['replied_messages'][response['json'][i]['id']]['reply_to_sender'] + "</div>" + message + "</div></div></li>")
                        }
                    }

                    if (sender_user_id === response['json'][i]['sender_user']) {
                        $("#chat-messages").append("<li class='right'><div class='conversation-list' id='message-" + response['json'][i]['id'] + "'>" +
                            "<div class='dropdown'><a class='dropdown-toggle' href='#' role='button' data-bs-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>\n" +
                            "<i class='bx bx-dots-vertical-rounded'></i>\n</a><div class='dropdown-menu'>\n" +
                            "<a class=\"dropdown-item\" href=\"#\" onclick='messageInfo(" + response['json'][i]['id'] + ")'>Info</a>\n" +
                            "<a class=\"dropdown-item\" href=\"#\" onclick='replyMessage(" + response['json'][i]['id'] + ")'>Reply</a>\n" +
                            "<a class=\"dropdown-item\" href=\"#\" onclick='deleteMessageOption(" + response['json'][i]['id'] + ")'>Delete</a>\n" +
                            "</div></div>" +
                            "<div class='ctext-wrap'><div class='conversation-name'>" +
                            response['json'][i]['full_name'] + "</div>" + message_data +
                            "<p class='chat-time mb-0'><i class='bx bx-time-five align-middle me-1'></i>" +
                            response['json'][i]['timestamp'] + "</p><i style='font-size: 10px' id='" + response['json'][i]['id'] + "'>" +
                            response['json'][i]['status'] + "</i></div></div></li>")
                    } else {
                        $("#chat-messages").append("<li><div class='conversation-list' id='message-" + response['json'][i]['id'] + "'>" +
                            "<div class='dropdown'><a class='dropdown-toggle' href='#' role='button' data-bs-toggle='dropdown' aria-haspopup='true' aria-expanded='false'>\n" +
                            "<i class='bx bx-dots-vertical-rounded'></i>\n</a><div class='dropdown-menu'>\n" +
                            "<a class=\"dropdown-item\" href=\"#\" onclick='replyMessage(" + response['json'][i]['id'] + ")'>Reply</a>\n" +
                            "<a class=\"dropdown-item\" href=\"#\" onclick='deleteMessage(" + response['json'][i]['id'] + ")'>Delete</a>\n" +
                            "</div></div>" +
                            "<div class='ctext-wrap'><div class='conversation-name'>" +
                            response['json'][i]['full_name'] + "</div>" + message_data +
                            "<p class='chat-time mb-0'><i class='bx bx-time-five align-middle me-1'></i>" +
                            response['json'][i]['timestamp'] + "</p></div></div></li>")
                    }
                }
                $("#chat-messages").append("</ul>");

                chat(room, response['sender_user'], sender_user_id)

            }
        })
}

//to open group info page
function groupInfo() {

    document.getElementById('change-group-name').value = document.getElementById('receiver_name').innerText

    $.ajax({
        method: "GET",
        url: "/get_group_members",
        data: {
            'room': roomName
        },
        success: function (response) {
            document.getElementById('group-participants').innerHTML = ''
            for (let i = 0; i < response.length; i++) {
                $('#group-participants').append('<h6 class="font-size-12 mt-2">' + response[i] + '</h6>')
            }
        }
    })


    document.getElementById('left-bar-create-group').style.display = 'none'
    document.getElementById('left-bar').style.display = 'none'
    document.getElementById('left-bar-group-info').style.display = 'block'


    $.ajax({
        method: "GET",
        url: "/get_users_except_group_members",
        data: {
            'room': roomName
        },
        success: function (response) {
            availableMembers = response
            startAutoComplete(availableMembers)
        }
    })

    function startAutoComplete(availableMembers) {
        $("#add-group-member").autocomplete({
            source: availableMembers
        });
    }
}

//on clicking select button for adding group members in group info page
function selectGroupMember() {
    var member = document.getElementById("add-group-member").value
    document.getElementById('pre-add-group-members').innerHTML = ''

    if (member.trim().length === 0) {
        $("#pre-add-group-members").append('<h5 class="font-size-15 mt-2">Please enter a username!!</h5>')
    } else {
        document.getElementById('add-group-member').value = ''
        if (availableMembers.includes(member)) {
            if (addMembersList.includes(member)) {
                $("#pre-add-group-members").append('<h5 class="font-size-15 mt-2">User already selected!</h5>')
            } else {
                addMembersList.push(member)
                $("#add-group-members-list").append('<h5 class="font-size-12 mt-2">' + member + '</h5>')
                document.getElementById('add-group-members-btn').style.display = 'block'
            }
        } else {
            $("#pre-add-group-members").append('<h5 class="font-size-15 mt-2">Please select a valid user!!</h5>')
        }
    }
}

//on clicking add button for adding group members after selecting the members
function addGroupMembers() {
    document.getElementById('group-info-message').innerHTML = ''

    $.ajax({
        method: "POST",
        url: "/add_group_members",
        headers: {
            "X-CSRFToken": getCookie("csrftoken")
        },
        data: {
            'room': roomName,
            'members': addMembersList,
        },
        success: function (response) {

            for (let i = 0; i < response.length; i++) {
                $('#group-participants').append('<h6 class="font-size-12 mt-2">' + response[i] + '</h6>')
            }

            $('#group-info-message').append(('<h6> Group Members Added</h6>'))
            addMembersList = []
            document.getElementById('add-group-members-btn').style.display = 'none'
            document.getElementById('add-group-members-list').innerHTML = ''
        }
    })
}

//for updating group name
function changeGroupName() {
    var name = document.getElementById('change-group-name').value
    $.ajax({
        method: "POST",
        url: "/change_group_name",
        data: {
            'room': roomName,
            'name': name
        },
        headers: {
            "X-CSRFToken": getCookie("csrftoken")
        },
        success: function (response) {
            document.getElementById('group-info-message').innerHTML = ''
            if (response['status'] === true) {
                $('#group-info-message').append(('<h6> Group Name Updated</h6>'))
                document.getElementById('receiver_name').innerText = name
            }
        },
    });
}

//for updating group icon
function changeGroupIcon() {
    cloudinary.openUploadWidget({
            cloud_name: 'dhhzjlge9',
            upload_preset: 'ygrmgnvy',
            sources: ['local', 'camera', 'url', 'image_search', 'instagram', 'facebook', 'google_drive'],
            googleApiKey: 'AIzaSyA7OW6XyqFva5ZjmP6T3qYRdNaEQ-rUZck',
            multiple: false,
        },
        function (error, result) {

            // If NO error, log image data to console
            if (result.info['files'][0]['uploadInfo']['resource_type'] !== 'image') {
                Swal.fire({
                    title: 'Invalid image format',
                    confirmButtonText: 'OK',
                })
            } else {
                imageID = result.info['files'][0]['uploadInfo']['secure_url'];

                $.ajax({
                    method: "POST",
                    url: "/update_group_icon",
                    headers: {
                        "X-CSRFToken": getCookie("csrftoken")
                    },
                    data: {
                        'room': roomName,
                        'image_url': imageID
                    },
                    success: function (response) {
                        document.getElementById('group-info-message').innerHTML = ''
                        $('#group-info-message').append(('<h6>' + response['message'] + '</h6>'))
                        document.getElementById("receiver-image").src = imageID
                    }
                })
            }
        }
    );
}

//for going back from group info page
function leaveGroupInfo() {
    document.getElementById('left-bar-create-group').style.display = 'none'
    document.getElementById('left-bar').style.display = 'block'
    document.getElementById('left-bar-group-info').style.display = 'none'
}

//for going back from create group page
function leaveCreateGroup() {
    document.getElementById('left-bar').style.display = 'block'
    document.getElementById('left-bar-create-group').style.display = 'none'
    document.getElementById('left-bar-group-info').style.display = 'none'
}

//after selecting leave group button
$("#showAlert").click(function () {
    Swal.fire({
        title: 'Leave Group?',
        showDenyButton: true,
        confirmButtonText: 'Yes',
        denyButtonText: 'No',
    }).then((result) => {
        if (result.isConfirmed) {
            Swal.fire('Group Left!', '', 'success')
            $.ajax({
                method: 'POST',
                url: '/exit_group',
                headers: {
                    "X-CSRFToken": getCookie("csrftoken")
                },
                data: {
                    'room': roomName
                },
                success: function (response) {
                    document.getElementById('home-image').style.display = 'block'
                    document.getElementById('user-chat').style.display = 'none'
                    document.getElementById('left-bar').style.display = 'block'

                    document.getElementById('left-bar').style.display = 'block'
                    document.getElementById('left-bar-create-group').style.display = 'none'
                    document.getElementById('left-bar-group-info').style.display = 'none'

                    const element = document.getElementById(response['room']);
                    element.remove();
                }

            })
        }
    })
});

//to get the seen information about a message
function messageInfo(message_id) {
    $.ajax({
        method: 'GET',
        url: '/get_message_status',
        data: {
            'message_id': message_id,
        },
        success: function (response) {
            if (response.length === 0) {
                var text_value = 'None'
            } else {
                var text_value = response
            }
            Swal.fire({
                title: 'Seen by:',
                text: text_value,
                confirmButtonText: 'OK',
            })
        }
    })
}

//to delete other users' messages
function deleteMessage(message_id) {
    $.ajax({
        method: 'POST',
        url: '/delete_message_for_user',
        headers: {
            "X-CSRFToken": getCookie("csrftoken")
        },
        data: {
            'message_id': message_id
        },
        success: function () {
            const replied_msg = document.getElementById("replied-msg-" + message_id)
            if (replied_msg) {
                replied_msg.remove()
            }
            document.getElementById("message-" + message_id).remove()
        }
    })
}

//to delete message sent by user
function deleteMessageOption(message_id) {
    Swal.fire({
        title: 'Delete Message',
        showDenyButton: true,
        confirmButtonText: 'Delete For Me',
        denyButtonText: 'Delete For Everyone',
        showCancelButton: true,

    }).then((result) => {
        //delete for me
        if (result.isConfirmed) {
            deleteMessage(message_id)
        }
        //delete for everyone
        if (result.isDenied) {
            $.ajax({
                method: 'POST',
                url: '/delete_message_for_everyone',
                headers: {
                    "X-CSRFToken": getCookie("csrftoken")
                },
                data: {
                    'message_id': message_id,
                    'room_name': roomName
                },
            })

        }
    })
}

//to reply a specific message
function replyMessage(message_id) {
    document.getElementById('chat-message-input-box').innerHTML = ''

    $('#chat-message-input-box').append("<button onclick='cancelReply()' style='position: relative; background: rgba(85,110,228);" +
                                        "color: white; margin-left: 115%; border-color: white; border-radius: 40%'>" +
                                        "x</button>")

    document.getElementById('chat-message-input-box').style.display = 'block'


    $.ajax({
        method: 'GET',
        url: '/ge_replied_to_message_information',
        data: {
            'message_id': message_id,
        },
        success: function (response) {
            const message_sender = response['message_sender']
            const message_data = response['message_data']
            const message_type = response['message_type']

            var message = message_data

            if (message_type === 'image') {
                message = "<img src='" + message_data + "' style='height: 80px; width: 80px'>"
            } else if (message_type === 'video') {
                message = "<video src='" + message_data + "' style='height: 80px; width: 80px'>"
            } else if (message_type === 'audio') {
                message = "Audio File"
            } else if (message_type === 'file') {
                message = "File"
            }

            $('#chat-message-input-box').append("<p id='reply-" + message_id + "' style='font-weight: bold; color: #556EE6; opacity: 100%; margin-bottom: 2px'>" + message_sender + "</p>" +
                "<p style='margin-bottom: 2px'>" + message + "</p>")
        }
    })
}

//on clicking cancel reply button - to cancel a selected message to reply
function cancelReply(){
    document.getElementById('chat-message-input-box').style.display = 'none'
}

//to scroll to the message that has been replied to on clicking it
function replyToScroll(division) {
    document.getElementById(division).scrollIntoView()
}
