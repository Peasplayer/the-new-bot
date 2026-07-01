const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, EmbedBuilder} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder().setName('selfrole').setNameLocalization("de", "selbst-rolle")
        .setDescription('Selbstständige Zuweisung von Rollen')
        .addSubcommand(sub => sub.setName('create').setNameLocalization('de', 'erstellen')
            .setDescription('Creates a new self-role message').setDescriptionLocalization('de', 'Erstellt eine neue Selbst-Rollen-Nachricht')
            .addStringOption(option => option.setName('title').setNameLocalization('de', 'titel')
                .setDescription('Title of the message').setDescriptionLocalization('de', 'Titel der Nachricht').setRequired(true))
            .addChannelOption((option) => option.setName('channel').setDescription('Channel for the message')
                .setDescriptionLocalization('de', 'Channel for the message').setRequired(true))
            .addStringOption(option => option.setName('description').setNameLocalization('de', 'beschreibung')
                .setDescription('Description of the message').setDescriptionLocalization('de', 'Beschreibung der Nachricht')))
        .addSubcommand(sub => sub.setName('add').setNameLocalization('de', 'rolle-hinzufügen')
            .setDescription('Adds a role to a self-role message').setDescriptionLocalization('de', 'Fügt eine Rolle zu einer Selbst-Rollen-Nachricht hinzu')
            .addStringOption(option => option.setName('id').setNameLocalization('de', 'id')
                .setDescription('The id of the self-role message').setDescriptionLocalization('de', 'Die ID der Selbst-Rollen-Nachricht').setRequired(true))
            .addRoleOption(option => option.setName('role').setNameLocalization('de', 'rolle')
                .setDescription('The new role').setDescriptionLocalization('de', 'Die neue Rolle').setRequired(true))
            .addStringOption(option => option.setName('label').setDescription('The label for the role').setRequired(true))
            .addBooleanOption(option => option.setName('show-label').setDescription('Show the label in the message')))
        .addSubcommand(sub => sub.setName('remove').setNameLocalization('de', 'rolle-entfernen')
            .setDescription('Removes a role from a self-role message').setDescriptionLocalization('de', 'Entfernt eine Rolle von einer Selbst-Rollen-Nachricht')
            .addStringOption(option => option.setName('id').setNameLocalization('de', 'id')
                .setDescription('The id of the self-role message').setDescriptionLocalization('de', 'Die ID der Selbst-Rollen-Nachricht').setRequired(true))
            .addRoleOption(option => option.setName('role').setNameLocalization('de', 'rolle')
                .setDescription('The role that will be removed').setDescriptionLocalization('de', 'Die Rolle die entfernt wird').setRequired(true))),
    async execute(interaction) {
        const { db } = require('../../index');

        const sub = interaction.options.getSubcommand();
        if (sub === "create") {
            const title = interaction.options.getString("title");
            const description = interaction.options.getString("description");
            const channel = interaction.options.getChannel("channel");

            const embed = new EmbedBuilder()
                .setTitle(title)
                .setColor("#015568")
                .setDescription(description)
                .setFooter({ text: "ID: " + interaction.id });

            const msg = await channel.send({ embeds: [embed] });

            interaction.reply("Nachricht gesendet! ID: " + interaction.id);

            await db.set("sr-" + interaction.id, { title, description, channel: channel.id, message: msg.id, roles: [] });
        }
        // add and remove
        else {
            const id = interaction.options.getString("id");
            const role = interaction.options.getRole("role");
            const label = interaction.options.getString("label");

            const sr = await db.get(`sr-${id}`);

            if (!sr)
                return interaction.reply({
                    content: '❌ | Falsche ID angegeben!',
                    flags: MessageFlags.Ephemeral,
                });

            if (role.managed)
                return interaction.reply({
                    content: '❌ | Rolle kann nicht verwendet werden!',
                    flags: MessageFlags.Ephemeral,
                });

            if (sub === "add") {
                if (sr.roles.some(r => r.id === role.id))
                    return interaction.reply({
                        content: '❌ | Rolle ist bereits vorhanden!',
                        flags: MessageFlags.Ephemeral,
                    });

                sr.roles.push({id: role.id, label});
            }
            else {
                if (!sr.roles.some(r => r.id === role.id))
                    return interaction.reply({
                        content: '❌ | Rolle ist nicht vorhanden!',
                        flags: MessageFlags.Ephemeral,
                    });

                sr.roles.splice(sr.roles.findIndex(r => r.id === role.id), 1);
            }

            const rows = [];
            const fields = [];
            for (let i = 0; i < sr.roles.length; i++) {
                const _role = sr.roles[i];
                if (Math.floor(i / 5) + 1 > rows.length)
                    rows.push(new ActionRowBuilder());

                const row = rows[Math.floor(i / 5)];
                row.addComponents(new ButtonBuilder().setCustomId("selfrole;" + id + ";" + i).setLabel(_role.label).setStyle(ButtonStyle.Secondary));

                fields.push({ name: _role.label, value: `<@&${_role.id}>`, inline: true });
            }

            const msg = interaction.guild.channels.resolve(sr.channel).messages.resolve(sr.message);
            const embed = EmbedBuilder.from(msg.embeds[0]);
            embed.setFields(...fields);
            await msg.edit({ embeds: [embed], components: rows });

            if (sub === "add")
                interaction.reply("Role hinzugefügt!");
            else
                interaction.reply("Role entfernt!");

            await db.set("sr-" + id, sr);
        }
    },
    async button(interaction) {
        const { db } = require('../../index');

        const args = interaction.customId.split(";").slice(1);
        const sr = await db.get(`sr-${args[0]}`);

        const roleId = sr.roles[args[1]].id;
        if (interaction.member.roles.cache.some(r => r.id === roleId)) {
            interaction.member.roles.remove(roleId);

            interaction.reply({
                content: 'Du hast die Rolle <@&' + roleId + '> dir entfernt',
                flags: MessageFlags.Ephemeral,
            });
        }
        else {
            interaction.member.roles.add(roleId);

            interaction.reply({
                content: 'Du hast die Rolle <@&' + roleId + '> dir hinzugefügt',
                flags: MessageFlags.Ephemeral,
            });
        }

        await db.set("sr-" + args[0], sr);
    }
};