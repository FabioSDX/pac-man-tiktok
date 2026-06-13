const { LiveChat } = require('youtube-chat');

const channelId = 'UCN1hnUccO4FD5WfM7ithXaw'; // Markiplier's channel ID, probably not live, but good for testing

const liveChat = new LiveChat({ channelId });

liveChat.on('start', (liveId) => {
    console.log('Started with liveId:', liveId);
});

liveChat.on('error', (err) => {
    console.error('Error event:', err.message);
});

liveChat.start().then((ok) => {
    console.log('Start returned:', ok);
}).catch(err => {
    console.error('Start catch:', err.message);
});
