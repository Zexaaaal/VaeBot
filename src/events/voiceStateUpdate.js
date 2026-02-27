const { Events } = require('discord.js');
const { updateChannelStatus } = require('../utils/statusUpdater');
const { getUserInfo } = require('../database');

module.exports = {
    name: Events.VoiceStateUpdate,
    once: false,
    async execute(oldState, newState) {
        if (!newState.member.user.bot) {
            // Accessing DB ensures user gets created if they join
            getUserInfo(newState.id);
        }

        if (oldState.channelId !== newState.channelId) {
            if (oldState.channel) {
                await updateChannelStatus(oldState.channel);
            }
            if (newState.channel) {
                await updateChannelStatus(newState.channel);
            }
        }
    }
};
