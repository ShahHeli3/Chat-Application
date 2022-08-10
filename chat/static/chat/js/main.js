//configure cloudinary for file uploads
$.cloudinary.config({cloud_name: 'dhhzjlge9', api_key: '675879341691844'});

var allGroups = [];
var roomName = ''
var availableTags = [];
var groupMembersList = [];
var groupName = '';
var imageID = ''
var availableMembers = [];
var addMembersList = [];
var user = 0

//to get current logged-in user
$.ajax({
    method: "GET",
    url: '/get_current_user',
    success: function (response) {
        user = response['user']
    }
})

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

$('#group-chat').click(function () {
    document.getElementById('searchuser').style.display = 'none'
    document.getElementById('search-group').style.display = 'block'

    document.getElementById('btn-chat').style.display = 'none'
    document.getElementById('btn-open-group').style.display = 'block'
})

$('#chat-bar').click(function () {
    document.getElementById('searchuser').style.display = 'block'
    document.getElementById('search-group').style.display = 'none'

    document.getElementById('btn-chat').style.display = 'block'
    document.getElementById('btn-open-group').style.display = 'none'
})

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

$('#searchuser').click(function () {
    $.ajax({
        method: "GET",
        url: "/get_all_users",
        success: function (response) {
            startAutoComplete(response)
        }
    })
})

function startAutoComplete(availableUsers) {
    $("#searchuser").autocomplete({
        source: availableUsers
    });
}

$('#btn-chat').click(function () {
    var receiver = document.getElementById("searchuser").value;
    document.getElementById('search-bar-message').innerHTML = ''
    updateMessage(receiver)
});

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

                if (data['message']) {
                    $("#search-bar-message").append('<h6>' + data['message'] + '</h6')
                } else {
                    roomName = data['room_name']

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
                                document.getElementById("chat-messages").innerHTML = "";

                                for (let i = 0; i < d['json'].length; i++) {
                                    if (d['json'][i]['message_type'] === 'text') {
                                        var message_data = "<p>" + d['json'][i]['message'] + "</p>"
                                    } else if (d['json'][i]['message_type'] === 'image') {
                                        var message_data = "<a href='" + d['json'][i]['message'] + "' target='_blank'><img src='" + d['json'][i]['message'] + "' width='300' height='200'></a>"
                                    } else if (d['json'][i]['message_type'] === 'video') {
                                        var message_data = "<video width='300' height='200' controls><source src='" + d['json'][i]['message'] + "' type='video/mp4'></video>"
                                    } else if (d['json'][i]['message_type'] === 'file') {
                                        var message_data = "<h6><b>File : </b><a href='" + d['json'][i]['message'] + "' target='_blank'>Download File</a></h6>"
                                    } else if (d['json'][i]['message_type'] === 'audio') {
                                        var message_data = "<h6><b>File : </b><a href='" + d['json'][i]['message'] + "' target='_blank'>Download Audio</a></h6>"
                                    }

                                    if (receiver_user === d['json'][i]['username']) {
                                        $("#chat-messages").append("<li><div class='conversation-list'><div class='ctext-wrap'><div class='conversation-name'>" +
                                            d['json'][i]['full_name'] + "</div>" + message_data +
                                            "<p class='chat-time mb-0'><i class='bx bx-time-five align-middle me-1'></i>" +
                                            d['json'][i]['timestamp'] + "</p></div></div></li>")
                                    } else {
                                        $("#chat-messages").append("<li class='right'><div class='conversation-list'><div class='ctext-wrap'><div class='conversation-name'>" +
                                            d['json'][i]['full_name'] + "</div>" + message_data +
                                            "<p class='chat-time mb-0'><i class='bx bx-time-five align-middle me-1'></i>" +
                                            d['json'][i]['timestamp'] + "</p></div></div></li>")
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

function createChatSocket() {
    if (window.location.host === "inexture-chat.herokuapp.com") {
        var chatSocket = new WebSocket(
            'wss://'
            + window.location.host
            + '/ws/chat/'
            + roomName
            + '/'
        );
    }
    if (window.location.host === "127.0.0.1:8000") {
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

function chat(roomName, sender_user, sender_user_id) {

    $("#chat-log").scrollTop($("#chat-log")[0].scrollHeight);

    var chatSocket = createChatSocket()

    displayMessage(chatSocket)

    chatSocket.onclose = function (e) {
        console.error('Chat socket closed unexpectedly');
    };

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
            chatSocket.send(JSON.stringify({
                'message': message,
                'sender_user': sender_user,
                'sender_user_id': sender_user_id,
                'message_type': 'text'
            }));
            messageInputDom.value = '';
        }
    };

    document.querySelector('#send-image-file').onclick = function (e) {
        cloudinary.openUploadWidget({
                cloud_name: 'dhhzjlge9',
                upload_preset: 'g5lmd3i3',
                multiple: false,
            },
            function (error, result) {
                if (error) console.log(error);
                // If NO error, log image data to console

                if (result[0].resource_type !== 'image') {
                    Swal.fire({
                        title: 'Invalid image file',
                        confirmButtonText: 'OK',
                    })
                } else {
                    var url = result[0].secure_url
                    chatSocket.send(JSON.stringify({
                        'message': url,
                        'sender_user': sender_user,
                        'sender_user_id': sender_user_id,
                        'message_type': 'image'
                    }));
                }
            }
        )
    }

    document.querySelector('#send-video-file').onclick = function (e) {
        cloudinary.openUploadWidget({
                cloud_name: 'dhhzjlge9',
                upload_preset: 'y4rx3bp1',
                multiple: false,
            },
            function (error, result) {
                if (error) console.log(error);
                // If NO error, log image data to console

                if (result[0].resource_type !== 'video') {
                    Swal.fire({
                        title: 'Invalid video file',
                        confirmButtonText: 'OK',
                    })
                } else {
                    var url = result[0].secure_url
                    chatSocket.send(JSON.stringify({
                        'message': url,
                        'sender_user': sender_user,
                        'sender_user_id': sender_user_id,
                        'message_type': 'video'
                    }));
                }
            }
        )

    }

    document.querySelector('#send-doc-file').onclick = function (e) {
        cloudinary.openUploadWidget({
                cloud_name: 'dhhzjlge9',
                upload_preset: 'ghritkgd',
                multiple: false,
            },
            function (error, result) {
                if (error) console.log(error);
                // If NO error, log image data to console

                if (result[0].resource_type !== 'raw') {
                    Swal.fire({
                        title: 'Invalid file format',
                        confirmButtonText: 'OK',
                    })
                } else {
                    var url = result[0].secure_url
                    chatSocket.send(JSON.stringify({
                        'message': url,
                        'sender_user': sender_user,
                        'sender_user_id': sender_user_id,
                        'message_type': 'file'
                    }));
                }
            }
        )
    }

    document.querySelector('#send-audio-file').onclick = function (e) {
        cloudinary.openUploadWidget({
                cloud_name: 'dhhzjlge9',
                upload_preset: 'icdoj041',
                multiple: false,
            },
            function (error, result) {
                if (error) console.log(error);
                // If NO error, log image data to console
                var file_format = result[0].format

                if( file_format !== 'aac' && file_format !== 'aiff' && file_format !== 'm4a' && file_format !== 'mp3' &&
                    file_format !== 'ogg' && file_format !== 'wav'){
                    Swal.fire({
                        title: 'Invalid audio file',
                        confirmButtonText: 'OK',
                    })
                } else {
                    url = result[0].secure_url
                    chatSocket.send(JSON.stringify({
                        'message': url,
                        'sender_user': sender_user,
                        'sender_user_id': sender_user_id,
                        'message_type': 'audio'
                    }));
                }
            }
        )
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function displayMessage(chatSocket) {
    chatSocket.onmessage = function (e) {
        const data = JSON.parse(e.data);

        var formatted = getDateTime()


        if (data.message_type === 'text') {
            var message_data = "<p>" + data.message + "</p>"
        } else if (data.message_type === 'image') {
            var message_data = "<a href='" + data.message + "' target='_blank'><img src='" + data.message + "' width='300' height='200'></a>"
        } else if (data.message_type === 'video') {
            var message_data = "<video width='300' height='200' controls><source src='" + data.message + "' type='video/mp4'></video>"
        } else if (data.message_type === 'file') {
            var message_data = "<h6><b>File : </b><a href='" + data.message + "' target='_blank'>Download File</a></h6>"
        } else if (data.message_type === 'audio') {
            var message_data = "<h6><b>File : </b><a href='" + data.message + "' target='_blank'>Download Audio</a></h6>"
        }

        if (data.sender_user_id === user) {
            $("#chat-messages").append("<li class='right'><div class='conversation-list'><div class='ctext-wrap'><div class='conversation-name'>" +
                data.sender_user + "</div>" + message_data + "<p class='chat-time mb-0'><i class='bx bx-time-five align-middle me-1'></i>" +
                formatted + "</p></div></div></li>")
        } else {
            $("#chat-messages").append("<li><div class='conversation-list'><div class='ctext-wrap'><div class='conversation-name'>" +
                data.sender_user + "</div>" + message_data + "<p class='chat-time mb-0'><i class='bx bx-time-five align-middle me-1'></i>" +
                formatted + "</p></div></div></li>")
        }

        $("#chat-log").scrollTop($("#chat-log")[0].scrollHeight);
    }
}

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

function addImage() {
    cloudinary.openUploadWidget({
            cloud_name: 'dhhzjlge9',
            upload_preset: 'ygrmgnvy',
            multiple: false,
        },
        function (error, result) {
            if (error) console.log(error);
            // If NO error, log image data to console

            if (result[0].format !== 'jpg' && result[0].format !== 'png') {
                Swal.fire({
                    title: 'Invalid image format',
                    confirmButtonText: 'OK',
                })
            } else {
                imageID = result[0].secure_url;
                $('#add-group-icon').append(imageID)
            }
        });
}

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

            updateGroupChat(roomName, groupName)

        }
    })
}

function updateGroupChat(room, group) {
    roomName = room

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

                var sender_user_id = response['sender_user_id']

                for (let i = 0; i < response['json'].length; i++) {


                    if (response['json'][i]['message_type'] === 'text') {
                        var message_data = "<p>" + response['json'][i]['message'] + "</p>"
                    } else if (response['json'][i]['message_type'] === 'image') {
                        var message_data = "<a href='" + response['json'][i]['message'] + "' target='_blank'><img src='" + response['json'][i]['message'] + "' width='300' height='200'></a>"
                    } else if (response['json'][i]['message_type'] === 'video') {
                        var message_data = "<video width='300' height='200' controls><source src='" + response['json'][i]['message'] + "' type='video/mp4'></video>"
                    } else if (response['json'][i]['message_type'] === 'file') {
                        var message_data = "<h6><b>File : </b><a href='" + response['json'][i]['message'] + "' target='_blank'>Download File</a></h6>"
                    } else if (response['json'][i]['message_type'] === 'audio') {
                        var message_data = "<h6><b>File : </b><a href='" + response['json'][i]['message'] + "' target='_blank'>Download Audio</a></h6>"
                    }

                    if (sender_user_id === response['json'][i]['sender_user']) {
                        $("#chat-messages").append("<li class='right'><div class='conversation-list'><div class='ctext-wrap'><div class='conversation-name'>" +
                            response['json'][i]['full_name'] + "</div>" + message_data +
                            "<p class='chat-time mb-0'><i class='bx bx-time-five align-middle me-1'></i>" +
                            response['json'][i]['timestamp'] + "</p></div></div></li>")

                    } else {
                        $("#chat-messages").append("<li><div class='conversation-list'><div class='ctext-wrap'><div class='conversation-name'>" +
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

function changeGroupIcon() {
    cloudinary.openUploadWidget({
            cloud_name: 'dhhzjlge9',
            upload_preset: 'ygrmgnvy',
            multiple: false,
        },
        function (error, result) {
            if (error) console.log(error);
            // If NO error, log image data to console
            if (result[0].format !== 'jpg' && result[0].format !== 'png') {
                Swal.fire({
                    title: 'Invalid image format',
                    confirmButtonText: 'OK',
                })
            } else {
                imageID = result[0].secure_url;

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

function leaveGroupInfo() {
    document.getElementById('left-bar-create-group').style.display = 'none'
    document.getElementById('left-bar').style.display = 'block'
    document.getElementById('left-bar-group-info').style.display = 'none'
}

function leaveCreateGroup() {
    document.getElementById('left-bar').style.display = 'block'
    document.getElementById('left-bar-create-group').style.display = 'none'
    document.getElementById('left-bar-group-info').style.display = 'none'
}

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
