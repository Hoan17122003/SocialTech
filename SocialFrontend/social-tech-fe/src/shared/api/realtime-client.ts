import * as signalR from "@microsoft/signalr";

const connection = new signalR.HubConnectionBuilder()
    .withUrl("https://localhost:5001/hubs/notifications", {
        // accessTokenFactory: () => localStorage.getItem("access_token")
    })
    .withAutomaticReconnect()
    .build();

connection.on("ReceiveNotification", (notification) => {
    console.log("Notification:", notification);
});

connection.on("ReceiveSystemNews", (news) => {
    console.log("System news:", news);
});

await connection.start();