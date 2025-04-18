const WebSocket = require('ws');

function locationWebSocket(server) {
    const wss = new WebSocket.Server({ server, path:'/location' });

    let childs = {};
    let parents = {};

    wss.on('connection', (ws) => {
        console.log('Location WebSocket connected');
        
        ws.on('message', (message) => {
            const data = JSON.parse(message);

            if (data.type === 'register_child') {
                childs[data.childId] = { ws, location: null };
                console.log("Child Registered for Location Sharing : "+data.childId);
                console.log("Active Childs are : ");
                console.log(childs);
            } else if (data.type === 'location_update') {
                console.log(data);
                if (childs[data.childId]) {
                    childs[data.childId].location = {
                        latitude: data.latitude,
                        longitude: data.longitude,
                        speed:data.speed
                    };
                    for (let parentId in parents) {
                        if (parents[parentId].targetchildId === data.childId) {
                            parents[parentId].ws.send(JSON.stringify({
                                childId: data.childId,
                                latitude: data.latitude,
                                longitude: data.longitude,
                                speed:data.speed,
                            }));
                            childs[data.childId].location = null;
                        }
                    }
                }
            } else if (data.type === 'register_parent') {
                parents[data.parentId] = { ws, targetchildId: data.targetchildId };
                if (childs[data.targetchildId] && childs[data.targetchildId].location) {
                    ws.send(JSON.stringify({
                        childId: data.targetchildId,
                        ...childs[data.targetchildId].location
                    }));
                    childs[data.targetchildId].location = null;
                }
                
                console.log("Active Parents are: ");
                console.log(parents);
            }
        });

        ws.on('close', () => {
            console.log('Location WebSocket disconnected');
            for (let childId in childs) {
                if (childs[childId].ws === ws) delete childs[childId];
            }
            for (let parentId in parents) {
                if (parents[parentId].ws === ws) delete parents[parentId];
            }
        });
    });
}

module.exports = locationWebSocket;
