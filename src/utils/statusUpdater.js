const { calculateTotalQi } = require('../database');

async function updateChannelStatus(channel) {
    if (!channel || channel.type !== 2) return;

    const members = channel.members.filter(m => !m.user.bot);
    if (members.size === 0) {
        try {
            await channel.client.rest.put(
                `/channels/${channel.id}/voice-status`,
                { body: { status: "" } }
            );
        } catch (e) {
            // On ignore silencieusement pour ne pas spammer les logs si le bot n'a pas la permission
        }
        return;
    }

    let totalQi = 0;
    for (const [memberId, member] of members) {
        const qi = calculateTotalQi(memberId);
        totalQi += qi;
    }
    const avgQi = Math.round(totalQi / members.size);

    const statusText = `QI: ${avgQi}`;

    try {
        await channel.client.rest.put(
            `/channels/${channel.id}/voice-status`,
            { body: { status: statusText } }
        );
    } catch (e) {
        // Ignorer silencieusement si pas la permission ("Connect" / "Manage Channels")
    }
}

module.exports = { updateChannelStatus };
