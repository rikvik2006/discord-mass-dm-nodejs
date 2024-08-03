import dotenv from "dotenv";
import { Client, CustomStatus, TextBasedChannel } from "discord.js-selfbot-v13";

dotenv.config();

const client = new Client();

client.on("ready", async () => {
	console.log(`${client.user?.username} is ready!`);

	// Custom status
	const status = new CustomStatus(client)
		.setEmoji("☣️")
		.setState("strontium-90");

	client.user?.setPresence({ activities: [status] });
});

// If i send !dm to the bot, it will send dm to every user in every guilds that the bot is in
client.on("messageCreate", async (message) => {
	if (message.content === "!dm") {
		client.guilds.cache.forEach((guild) => {
			guild.members.cache.forEach((member) => {
				if (member.id !== client.user?.id) {
					member.send("Hello!");
				}
			});
		});
	}
});

client.login(process.env.TOKEN);
