const { calculateTotalQi } = require('../database');

async function updateChannelStatus(channel) {
    if (!channel || channel.type !== 2) return; // 2 is GUILD_VOICE

    const members = channel.members.filter(m => !m.user.bot);
    if (members.size === 0) {
        try {
            await channel.client.rest.put(
                `/channels/${channel.id}/voice-status`,
                { body: { status: "" } }
            );
        } catch (e) {
            console.error("Missing permissions to reset VC status", e.message);
        }
        return;
    }

    let totalQi = 0;
    for (const [memberId, member] of members) {
        const qi = calculateTotalQi(memberId);
        totalQi += qi;
    }
    const avgQi = Math.round(totalQi / members.size);

    const statusText = `Moyenne QI: ${avgQi} 🧠`;

    try {
        await channel.client.rest.put(
            `/channels/${channel.id}/voice-status`,
            { body: { status: statusText } }
        );
    } catch (e) {
        console.error("Error setting channel status:", e.message);
    }
}

module.exports = { updateChannelStatus };
