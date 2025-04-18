const WebSocket = require('ws');

function locationWebSocket(wss) {
    

    let childs = {};
    let parents = {};

    wss.on('connection', (ws) => {
        console.log('Location WebSocket connected');
        ws.on('message', (message) => {
            const data = JSON.parse(message);

            if (data.type === 'register_child') {
                childs[data.childId] = { ws, location: null };
                console.log("Child Registered : "+data.childId);
            } else if (data.type === 'location_update') {
                console.log(data);
                if (childs[data.childId]) {
                    childs[data.childId].location = {
                        latitude: data.latitude,
                        longitude: data.longitude,
                        speed:data.speed
                    };
                    for (let parentId in parents) {
                        if (parents[parentId].targetchildId.includes(data.childId)) {
                            console.log("Location Send to Parent");
                            parents[parentId].ws.send(JSON.stringify({
                                childId: data.childId,
                                latitude: data.latitude,
                                longitude: data.longitude,
                                speed:data.speed,
                            }));
                            
                        }
                        else
                        console.log("NO RELEVANT PARENT FOUND");
                    }
                }
            } else if (data.type === 'register_parent') {
                console.log("Parent Registered : "+data.parentId);
                parents[data.parentId] = { ws, targetchildId: data.targetchildId };
                if (childs[data.targetchildId] && childs[data.targetchildId].location) {
                    ws.send(JSON.stringify({
                        childId: data.targetchildId,
                        ...childs[data.targetchildId].location
                    }));
                    
                }
            }
            else if (data.type === 'query_child') {
                 console.log('Child Query : '+data.targetchildId)
                if (childs[data.targetchildId] && childs[data.targetchildId].location) {
                    console.log('Child Query Data Found ');
                    parents[data.parentId].ws.send(JSON.stringify({
                        childId: data.targetchildId,
                        latitude: childs[data.targetchildId].location.latitude,
                        longitude: childs[data.targetchildId].location.longitude,
                        speed:childs[data.targetchildId].location.speed,
                    }));
                }
                else{
                    console.log('Child Query Data Not Found (Dummy Data)');
                    parents[data.parentId].ws.send(JSON.stringify({
                        childId: data.targetchildId,
                        latitude: 31.5204,
                        longitude: 74.3587,
                        speed:1,
                    }));

                }
            }
        });

        ws.on('close', () => {
            console.log('Location WebSocket disconnected');
            
            for (let parentId in parents) {
                if (parents[parentId].ws === ws) delete parents[parentId];
            }
        });
    });
}

module.exports = locationWebSocket;
