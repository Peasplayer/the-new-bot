const { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags, EmbedBuilder} = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder().setName('poll').setNameLocalization("de", "umfrage").setDescription('Umfrage erstellen')
        .addStringOption((option) =>
            option.setName("question").setNameLocalization("de", "frage").setDescription("Die Frage").setRequired(true))
        .addStringOption((option) =>
            option.setName("option1").setDescription("1. Option").setRequired(true))
        .addStringOption((option) =>
            option.setName("option2").setDescription("2. Option").setRequired(true))
        .addRoleOption((option) =>
            option.setName("required_role").setNameLocalization("de", "erforderliche_rolle").setDescription("Nur Benutzer mit dieser Rolle können abstimmen"))
        .addStringOption((option) =>
            option.setName("deadline").setDescription("Ende der Abstimmung im Format YYYY-MM-DDTHH:mm"))
        .addStringOption((option) =>
            option.setName("option3").setDescription("3. Option"))
        .addStringOption((option) =>
            option.setName("option4").setDescription("4. Option"))
        .addStringOption((option) =>
            option.setName("option5").setDescription("5. Option"))
        .addStringOption((option) =>
            option.setName("option6").setDescription("6. Option"))
        .addStringOption((option) =>
            option.setName("option7").setDescription("7. Option"))
        .addStringOption((option) =>
            option.setName("option8").setDescription("8. Option"))
        .addStringOption((option) =>
            option.setName("option9").setDescription("9. Option"))
        .addStringOption((option) =>
            option.setName("option10").setDescription("10. Option"))
        .addStringOption((option) =>
            option.setName("option11").setDescription("11. Option"))
        .addStringOption((option) =>
            option.setName("option12").setDescription("12. Option"))
        .addStringOption((option) =>
            option.setName("option13").setDescription("13. Option"))
        .addStringOption((option) =>
            option.setName("option14").setDescription("14. Option"))
        .addStringOption((option) =>
            option.setName("option15").setDescription("15. Option")),
    async execute(interaction) {
        const { db } = require('../../index');

        const options = [];
        for (let i = 0; i < 15; i++) {
            const optValue = interaction.options.getString("option" + (i + 1));
            if (optValue && !options.includes(optValue))
                options.push(optValue);
        }

        if (options.length < 2)
            return interaction.reply({ content: "❌| Es müssen mindetens zwei unterschiedliche Optionen angegeben werden", flags: MessageFlags.Ephemeral });

        const question = interaction.options.getString("question");
        const requiredRole = interaction.options.getRole("required_role");
        const deadline = Date.parse(interaction.options.getString("deadline")) / 1000 ?? undefined;

        const embed = new EmbedBuilder()
            .setTitle(question)
            .setColor("#015568")
            .setDescription(`Umfrage gestartet von <@${interaction.user.id}>`
                + `${requiredRole ? `\nNur für <@&${requiredRole.id}>` : ""}`
                + `${deadline ? `\nAbstimmung endet <t:${deadline}:R>` : ""}`)
            .setFooter({ text: "0 Teilnehmer"});

        const rows = [];
        const fields = [];
        for (let i = 0; i < options.length; i++) {
            const option = options[i];
            if (Math.floor(i / 5) + 1 > rows.length)
                rows.push(new ActionRowBuilder());

            const row = rows[Math.floor(i / 5)];
            row.addComponents(new ButtonBuilder().setCustomId("poll;" + interaction.id + ";" + i).setLabel(option).setStyle(ButtonStyle.Primary));

            fields.push({ name: option, value: '<:black_large_square:0>'.repeat(10) + "\n(0 Stimmen)" })
        }
        embed.setFields(...fields);

        rows.push(new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("poll;" + interaction.id + ";results").setLabel("Stimmen ansehen").setStyle(ButtonStyle.Secondary),
            new ButtonBuilder().setCustomId("poll;" + interaction.id + ";stop").setLabel("Umfrage beenden").setStyle(ButtonStyle.Secondary)
        ));

        interaction.reply({ embeds: [embed], components: rows });

        await db.set("poll-" + interaction.id, { question, author: interaction.user.id, requiredRole: requiredRole?.id, deadline, options, votes: {} });
    },
    async button(interaction) {
        const { db } = require('../../index');

        const args = interaction.customId.split(";").slice(1);
        const poll = await db.get("poll-" + args[0]);

        if (args[1] === "results") {
            let response = "Noch keine Stimmen vorhanden";
            if (Object.values(poll.votes).filter(v => v && v.length > 0).length > 0) {
                response = "## Stimmen:";
                for (let i = 0; i < poll.options.length; i++) {
                    const votes = Object.keys(poll.votes).filter(k => poll.votes[k].includes(i.toString()));

                    if (votes.length > 0) {
                        response += `\n- **${poll.options[i]}** (${votes.length} Stimme${votes.length !== 1 ? "n" : ""}): `;
                        for (const vote of votes) {
                            response += `<@${vote}>`;
                        }
                    }
                }
            }

            interaction.reply({ content: response, flags: MessageFlags.Ephemeral });
        }
        else if (args[1] === "stop") {
            if (!interaction.member.permissions.has(["MANAGE_MESSAGES"]) && interaction.user.id !== interaction.message.interaction.user.id)
                return interaction.reply({
                    content: '❌ | Die fehlt die entsprechende Berechtigung',
                    flags: MessageFlags.Ephemeral,
                });

            const participants = Object.values(poll.votes).filter(v => v && v.length > 0).length;

            let response = participants === 0 ? "" : "Stimmen:";
            for (let i = 0; i < poll.options.length; i++) {
                const votes = Object.keys(poll.votes).filter(k => poll.votes[k].includes(i.toString()));

                if (votes.length > 0) {
                    response += `\n- **${poll.options[i]}**: `;
                    for (const vote of votes) {
                        response += `<@${vote}>`;
                    }
                }
            }

            const embed = EmbedBuilder.from(interaction.message.embeds[0])
                .setDescription(`Umfrage von <@${interaction.user.id}>, endete <t:${Math.floor(Date.now() / 1000)}:R>`);

            let highestVotes = 1;
            for (let i = 0; i < poll.options.length; i++) {
                const votes = Object.values(poll.votes).filter(v => v.includes(i.toString())).length;
                if (votes > highestVotes)
                    highestVotes = votes;
            }

            const fields = [];
            for (let i = 0; i < poll.options.length; i++) {
                const option = poll.options[i];
                const votes = Object.values(poll.votes).filter(v => v.includes(i.toString())).length;
                const percentage = votes === 0 ? 0 : Math.floor(votes / participants * 10);

                fields.push({ name: (votes === highestVotes ? "<:crown:0> " : "") + option, value:
                        `${"<:green_square:0>".repeat(percentage)}${"<:black_large_square:0>".repeat(10 - percentage)}\n`
                        + `(${votes} Stimme${votes.length !== 1 ? "n" : ""})`});
            }
            embed.setFields(...fields);

            interaction.message.edit({content: response, embeds: [embed], components: []});

            interaction.reply({ content: "Umfrage wurde beendet", flags: MessageFlags.Ephemeral });

            await db.delete("poll-" + args[0]);
        }
        else {
            if (poll.deadline && poll.deadline * 1000 < Date.now())
                return interaction.reply({
                    content: '❌ | Zu diesem Zeitpunkt kann nicht mehr abgestimmt werden',
                    flags: MessageFlags.Ephemeral,
                });

            if (poll.requiredRole && !interaction.member.roles.cache.some((role) => role.id === poll.requiredRole))
                return interaction.reply({
                    content: '❌ | Dir fehlt die Rolle <@&' + poll.requiredRole + '>',
                    flags: MessageFlags.Ephemeral,
                });

            const existingVote = poll.votes[interaction.user.id]?.includes(args[1]);
            if (existingVote) {
                poll.votes[interaction.user.id].splice(poll.votes[interaction.user.id].indexOf(args[1]), 1);

                interaction.reply({
                    content: 'Du hast deine Stimme für "' + poll.options[args[1]] + '" entfernt',
                    flags: MessageFlags.Ephemeral,
                });
            }
            else {
                if (!poll.votes[interaction.user.id])
                    poll.votes[interaction.user.id] = [];

                poll.votes[interaction.user.id].push(args[1]);

                interaction.reply({
                    content: 'Du hast für "' + poll.options[args[1]] + '" gestimmt',
                    flags: MessageFlags.Ephemeral,
                });
            }

            await db.set("poll-" + args[0], poll);

            const participants = Object.values(poll.votes).filter(v => v && v.length > 0).length;

            const embed = EmbedBuilder.from(interaction.message.embeds[0])
                .setFooter({ text: participants + " Teilnehmer"});

            const fields = [];
            for (let i = 0; i < poll.options.length; i++) {
                const option = poll.options[i];
                const votes = Object.values(poll.votes).filter(v => v.includes(i.toString())).length;
                const percentage = votes === 0 ? 0 : Math.floor(votes / participants * 10);

                fields.push({ name: option, value: `${"<:green_square:0>".repeat(percentage)}`
                        + `${"<:black_large_square:0>".repeat(10 - percentage)}\n(${votes} Stimme${votes !== 1 ? "n" : ""})` })
            }
            embed.setFields(...fields);

            interaction.message.edit({embeds: [embed]});
        }
    }
};