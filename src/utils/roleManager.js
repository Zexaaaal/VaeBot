const { getGlobalState, deleteGlobalState } = require('../database');
const config = require('../config');

async function checkSpecialRoleExpiration(client) {
    if (!config.SPECIAL_ROLE_ID) return;

    try {
        const specialRoleState = getGlobalState('special_role');
        if (!specialRoleState) return;

        const nowMs = Date.now();
        const expirationMs = specialRoleState.assignedAt + 7 * 24 * 60 * 60 * 1000;

        if (nowMs >= expirationMs) {
            // Expired! We need to remove the role
            const guild = await client.guilds.fetch(config.ALLOWED_GUILD_ID).catch(() => null);
            if (guild) {
                const member = await guild.members.fetch(specialRoleState.userId).catch(() => null);
                if (member) {
                    await member.roles.remove(config.SPECIAL_ROLE_ID).catch(console.error);
                }
            }
            // Optional: we can delete the state or just rely on it being overwritten next time.
            // But deleting is cleaner.
            deleteGlobalState('special_role');
        }
    } catch (err) {
        console.error("Error in checkSpecialRoleExpiration:", err);
    }
}

module.exports = {
    checkSpecialRoleExpiration
};
