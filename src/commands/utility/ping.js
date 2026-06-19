const { SlashCommandBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder().setName('ping').setDescription('Replies with Pong!'),
    async execute(interaction) {
        const { db } = require('../../index');
        await db.set("poll-1517497136277885029", JSON.parse("{\"question\":\"test\",\"author\":\"568421310531764241\",\"deadline\":null,\"options\":[\"t\",\"tt\"],\"votes\":{\"568421310531764241\":[\"0\",\"1\"], \"d\": [\"0\"], \"dd\": [\"0\"]}}"))
        await interaction.reply(await db.get("test"));
    },
};