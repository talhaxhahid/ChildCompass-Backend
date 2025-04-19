const WebSocket = require('ws');

function locationWebSocket(wss) {

    function getCurrentTimeInAMPM() {
        const now = new Date();
        let hours = now.getHours();
        const minutes = now.getMinutes();
        const ampm = hours >= 12 ? 'PM' : 'AM';
      
        // Convert to 12-hour format
        hours = hours % 12;
        hours = hours ? hours : 12; // 0 should be 12
      
        // Add leading zero to minutes if needed
        const formattedMinutes = minutes < 10 ? '0' + minutes : minutes;
      
        return `${hours}:${formattedMinutes} ${ampm}`;
      }
      

      
    

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
                        speed:data.speed,
                        maxSpeed:data.maxSpeed,
                        time:getCurrentTimeInAMPM()
                    };
                    for (let parentId in parents) {
                        if (parents[parentId].targetchildId.includes(data.childId)) {
                            console.log("Location Send to Parent");
                            parents[parentId].ws.send(JSON.stringify({
                                childId: data.childId,
                                latitude: data.latitude,
                                longitude: data.longitude,
                                speed:data.speed,
                                maxSpeed:data.maxSpeed,
                                time:getCurrentTimeInAMPM(),
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
                        maxSpeed:childs[data.targetchildId].location.maxSpeed,
                        time:childs[data.targetchildId].location.time
                    }));
                }
                else{
                    console.log('Child Query Data Not Found (Dummy Data)');
                    parents[data.parentId].ws.send(JSON.stringify({
                        childId: data.targetchildId,
                        latitude: 31.5204,
                        longitude: 74.3587,
                        speed:1,
                        maxSpeed:10,
                        time:'never'
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
